package plugin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type templateStoreSettings struct {
	TableName string `json:"templateTableName"`
	Region    string `json:"templateTableRegion"`
}

func (a *App) templateRepository(ctx context.Context, instance *backend.AppInstanceSettings) (TemplateRepository, error) {
	if a.templates != nil {
		return a.templates, nil
	}
	if instance == nil {
		return nil, errors.New("AWS settings are not available")
	}

	settings, err := readTemplateStoreSettings(*instance)
	if err != nil {
		return nil, err
	}
	if settings.TableName == "" {
		return nil, errors.New("template storage is not configured: set a DynamoDB table name in the plugin configuration")
	}
	config, err := a.awsConfig(ctx, instance)
	if err != nil {
		return nil, err
	}
	if settings.Region != "" {
		config.Region = settings.Region
	}
	return &dynamoTemplateRepository{client: a.newDynamoClient(config), tableName: settings.TableName}, nil
}

func readTemplateStoreSettings(instance backend.AppInstanceSettings) (templateStoreSettings, error) {
	var settings templateStoreSettings
	if len(instance.JSONData) > 0 {
		if err := json.Unmarshal(instance.JSONData, &settings); err != nil {
			return templateStoreSettings{}, fmt.Errorf("could not read template storage settings: %w", err)
		}
	}
	settings.TableName = strings.TrimSpace(settings.TableName)
	settings.Region = strings.TrimSpace(settings.Region)
	if len(settings.TableName) > 255 {
		return templateStoreSettings{}, errors.New("template storage table name must not exceed 255 characters")
	}
	if len(settings.Region) > 64 || strings.ContainsAny(settings.Region, " \t\r\n") {
		return templateStoreSettings{}, errors.New("template storage region must be a valid AWS region")
	}
	return settings, nil
}
