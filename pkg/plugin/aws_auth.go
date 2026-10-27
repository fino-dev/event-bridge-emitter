package plugin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sts"
	"github.com/grafana/grafana-aws-sdk/pkg/awsauth"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/httpclient"
)

const awsUserAgent = "event-bridge-emitter"

// awsJSONData matches the connection fields stored by CloudWatch and the other Grafana AWS data sources.
type awsJSONData struct {
	AuthType      string `json:"authType"`
	Profile       string `json:"profile"`
	DefaultRegion string `json:"defaultRegion"`
	AssumeRoleArn string `json:"assumeRoleArn"`
	ExternalID    string `json:"externalId"`
}

// CallerIdentity is the result of an AWS STS GetCallerIdentity call.
type CallerIdentity struct {
	Account string `json:"account"`
	ARN     string `json:"arn"`
	UserID  string `json:"userId"`
}

func (id CallerIdentity) message() string {
	return fmt.Sprintf("Authenticated as %s in account %s", id.ARN, id.Account)
}

type invalidAuthConfigError struct {
	err error
}

func (e *invalidAuthConfigError) Error() string {
	return e.err.Error()
}

func (e *invalidAuthConfigError) Unwrap() error {
	return e.err
}

func invalidAuth(err error) error {
	return &invalidAuthConfigError{err: err}
}

func awsAuthSettings(instance backend.AppInstanceSettings) (awsauth.Settings, error) {
	var data awsJSONData
	if len(instance.JSONData) > 0 {
		if err := json.Unmarshal(instance.JSONData, &data); err != nil {
			return awsauth.Settings{}, invalidAuth(fmt.Errorf("could not read AWS settings: %w", err))
		}
	}

	authType, err := parseAuthType(data.AuthType)
	if err != nil {
		return awsauth.Settings{}, invalidAuth(err)
	}

	accessKey := strings.TrimSpace(instance.DecryptedSecureJSONData["accessKey"])
	secretKey := strings.TrimSpace(instance.DecryptedSecureJSONData["secretKey"])
	if authType == awsauth.AuthTypeKeys && (accessKey == "" || secretKey == "") {
		return awsauth.Settings{}, invalidAuth(errors.New("access key and secret key are required"))
	}

	return awsauth.Settings{
		AuthType:           authType,
		AccessKey:          accessKey,
		SecretKey:          secretKey,
		SessionToken:       strings.TrimSpace(instance.DecryptedSecureJSONData["sessionToken"]),
		Region:             strings.TrimSpace(data.DefaultRegion),
		CredentialsProfile: strings.TrimSpace(data.Profile),
		AssumeRoleARN:      strings.TrimSpace(data.AssumeRoleArn),
		ExternalID:         strings.TrimSpace(data.ExternalID),
		UserAgent:          awsUserAgent,
	}, nil
}

func parseAuthType(value string) (awsauth.AuthType, error) {
	switch awsauth.AuthType(strings.TrimSpace(value)) {
	case "", awsauth.AuthTypeDefault:
		return awsauth.AuthTypeDefault, nil
	case awsauth.AuthTypeSharedCreds:
		return awsauth.AuthTypeSharedCreds, nil
	case awsauth.AuthTypeKeys:
		return awsauth.AuthTypeKeys, nil
	case awsauth.AuthTypeEC2IAMRole:
		return awsauth.AuthTypeEC2IAMRole, nil
	case awsauth.AuthTypeGrafanaAssumeRole:
		return "", errors.New("grafana assume role is not supported by this plugin")
	default:
		return "", fmt.Errorf("unsupported authentication provider %q", value)
	}
}

func (a *App) callerIdentity(ctx context.Context, instance *backend.AppInstanceSettings) (CallerIdentity, error) {
	cfg, err := a.awsConfig(ctx, instance)
	if err != nil {
		return CallerIdentity{}, err
	}

	output, err := a.newIdentityClient(cfg).GetCallerIdentity(ctx, &sts.GetCallerIdentityInput{})
	if err != nil {
		return CallerIdentity{}, err
	}
	if output.Account == nil || output.Arn == nil || output.UserId == nil {
		return CallerIdentity{}, errors.New("AWS did not return a caller identity")
	}

	return CallerIdentity{
		Account: aws.ToString(output.Account),
		ARN:     aws.ToString(output.Arn),
		UserID:  aws.ToString(output.UserId),
	}, nil
}

func (a *App) awsConfig(ctx context.Context, instance *backend.AppInstanceSettings) (aws.Config, error) {
	if instance == nil {
		return aws.Config{}, invalidAuth(errors.New("AWS settings are not available"))
	}

	settings, err := awsAuthSettings(*instance)
	if err != nil {
		return aws.Config{}, err
	}

	httpOptions, err := instance.HTTPClientOptions(ctx)
	if err != nil {
		return aws.Config{}, invalidAuth(fmt.Errorf("could not read HTTP settings: %w", err))
	}
	httpClient, err := httpclient.NewProvider().New(httpOptions)
	if err != nil {
		return aws.Config{}, fmt.Errorf("could not create HTTP client: %w", err)
	}
	settings.HTTPClient = httpClient

	cfg, err := a.awsConfigs.GetConfig(ctx, settings)
	if err != nil {
		return aws.Config{}, err
	}
	return cfg, nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		backend.Logger.Error("could not write JSON response", "error", err)
	}
}

func authStatusCode(err error) int {
	var configErr *invalidAuthConfigError
	if errors.As(err, &configErr) {
		return http.StatusBadRequest
	}
	return http.StatusBadGateway
}
