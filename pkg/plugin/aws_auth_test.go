package plugin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sts"
	"github.com/grafana/grafana-aws-sdk/pkg/awsauth"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func TestAWSAuthSettings(t *testing.T) {
	t.Parallel()

	settings, err := awsAuthSettings(backend.AppInstanceSettings{
		JSONData: []byte(`{"authType":"credentials","profile":"dev","defaultRegion":"ap-northeast-1","assumeRoleArn":"arn:aws:iam::123456789012:role/Grafana","externalId":"external"}`),
	})
	if err != nil {
		t.Fatalf("parse credentials settings: %s", err)
	}
	if settings.AuthType != awsauth.AuthTypeSharedCreds {
		t.Fatalf("auth type = %s", settings.AuthType)
	}
	if settings.CredentialsProfile != "dev" || settings.Region != "ap-northeast-1" {
		t.Fatalf("profile=%s region=%s", settings.CredentialsProfile, settings.Region)
	}
	if settings.AssumeRoleARN != "arn:aws:iam::123456789012:role/Grafana" || settings.ExternalID != "external" {
		t.Fatalf("assume role = %s external id = %s", settings.AssumeRoleARN, settings.ExternalID)
	}

	settings, err = awsAuthSettings(backend.AppInstanceSettings{})
	if err != nil {
		t.Fatalf("empty settings should use the default provider: %s", err)
	}
	if settings.AuthType != awsauth.AuthTypeDefault {
		t.Fatalf("auth type = %s", settings.AuthType)
	}

	_, err = awsAuthSettings(backend.AppInstanceSettings{
		JSONData: []byte(`{"authType":"keys"}`),
	})
	if err == nil {
		t.Fatal("expected missing keys to be rejected")
	}
	var configErr *invalidAuthConfigError
	if !errors.As(err, &configErr) {
		t.Fatalf("missing keys should be a configuration error, got %T", err)
	}

	_, err = awsAuthSettings(backend.AppInstanceSettings{
		JSONData: []byte(`{"authType":"grafana_assume_role"}`),
	})
	if err == nil || !errors.As(err, &configErr) {
		t.Fatal("expected Grafana Assume Role to be rejected")
	}
}

type fakeIdentityClient struct {
	output *sts.GetCallerIdentityOutput
	err    error
}

func (f fakeIdentityClient) GetCallerIdentity(context.Context, *sts.GetCallerIdentityInput, ...func(*sts.Options)) (*sts.GetCallerIdentityOutput, error) {
	return f.output, f.err
}

func TestCallerIdentityUsesSavedCredentials(t *testing.T) {
	t.Parallel()

	app := &App{
		awsConfigs: awsauth.NewConfigProvider(),
		newIdentityClient: func(aws.Config) identityAPI {
			return fakeIdentityClient{
				output: &sts.GetCallerIdentityOutput{
					Account: aws.String("123456789012"),
					Arn:     aws.String("arn:aws:iam::123456789012:user/grafana"),
					UserId:  aws.String("AIDEXAMPLE"),
				},
			}
		},
	}

	identity, err := app.callerIdentity(context.Background(), &backend.AppInstanceSettings{
		JSONData: []byte(`{"authType":"keys","defaultRegion":"us-east-1"}`),
		DecryptedSecureJSONData: map[string]string{
			"accessKey": "AKIAEXAMPLE",
			"secretKey": "secret",
		},
	})
	if err != nil {
		t.Fatalf("caller identity: %s", err)
	}
	if identity.Account != "123456789012" || identity.UserID != "AIDEXAMPLE" {
		t.Fatalf("identity = %+v", identity)
	}
}

func TestIdentityResource(t *testing.T) {
	t.Parallel()

	inst, err := NewApp(context.Background(), backend.AppInstanceSettings{})
	if err != nil {
		t.Fatalf("new app: %s", err)
	}
	app := inst.(*App)
	app.newIdentityClient = func(aws.Config) identityAPI {
		return fakeIdentityClient{
			output: &sts.GetCallerIdentityOutput{
				Account: aws.String("123456789012"),
				Arn:     aws.String("arn:aws:iam::123456789012:user/grafana"),
				UserId:  aws.String("AIDEXAMPLE"),
			},
		}
	}

	t.Run("missing settings", func(t *testing.T) {
		t.Parallel()
		var sender mockCallResourceResponseSender
		err := app.CallResource(context.Background(), &backend.CallResourceRequest{
			Method: http.MethodGet,
			Path:   "aws/identity",
		}, &sender)
		if err != nil {
			t.Fatalf("CallResource: %s", err)
		}
		if sender.response.Status != http.StatusBadRequest {
			t.Fatalf("status = %d body = %s", sender.response.Status, sender.response.Body)
		}
	})

	t.Run("saved keys", func(t *testing.T) {
		t.Parallel()
		var sender mockCallResourceResponseSender
		err := app.CallResource(context.Background(), &backend.CallResourceRequest{
			PluginContext: backend.PluginContext{
				AppInstanceSettings: &backend.AppInstanceSettings{
					JSONData: []byte(`{"authType":"keys","defaultRegion":"us-east-1"}`),
					DecryptedSecureJSONData: map[string]string{
						"accessKey": "AKIAEXAMPLE",
						"secretKey": "secret",
					},
				},
			},
			Method: http.MethodGet,
			Path:   "aws/identity",
		}, &sender)
		if err != nil {
			t.Fatalf("CallResource: %s", err)
		}
		if sender.response.Status != http.StatusOK {
			t.Fatalf("status = %d body = %s", sender.response.Status, sender.response.Body)
		}
		var identity CallerIdentity
		if err := json.Unmarshal(sender.response.Body, &identity); err != nil {
			t.Fatalf("decode: %s", err)
		}
		if identity.ARN != "arn:aws:iam::123456789012:user/grafana" {
			t.Fatalf("identity = %+v", identity)
		}
	})
}
