package plugin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type templateProvisioningSettings struct {
	Templates []Template `json:"templates"`
}

func (a *App) templateRepository(_ context.Context, instance *backend.AppInstanceSettings) (TemplateRepository, error) {
	if a.templates != nil {
		return a.templates, nil
	}
	if instance == nil {
		return nil, errors.New("grafana app settings are unavailable")
	}

	settings, err := readTemplateProvisioningSettings(*instance)
	if err != nil {
		return nil, err
	}
	return newProvisionedTemplateRepository(settings.Templates)
}

func readTemplateProvisioningSettings(instance backend.AppInstanceSettings) (templateProvisioningSettings, error) {
	var settings templateProvisioningSettings
	if len(instance.JSONData) > 0 {
		if err := json.Unmarshal(instance.JSONData, &settings); err != nil {
			return templateProvisioningSettings{}, fmt.Errorf("could not read provisioned templates: %w", err)
		}
	}
	return settings, nil
}
