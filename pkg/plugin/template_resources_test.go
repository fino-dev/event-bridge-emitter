package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/eventbridge"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func templatePluginContext(role string, orgID int64) backend.PluginContext {
	return backend.PluginContext{
		Namespace: fmt.Sprintf("org-%d", orgID),
		User:      &backend.User{Role: role},
		AppInstanceSettings: &backend.AppInstanceSettings{
			JSONData: []byte(`{"authType":"default","defaultRegion":"ap-northeast-1"}`),
		},
	}
}

type recordingEventBridgeClient struct {
	input *eventbridge.PutEventsInput
}

func (client *recordingEventBridgeClient) PutEvents(_ context.Context, input *eventbridge.PutEventsInput, _ ...func(*eventbridge.Options)) (*eventbridge.PutEventsOutput, error) {
	client.input = input
	return &eventbridge.PutEventsOutput{}, nil
}

func TestTemplateQueryPreservesIDsAndExecutionPermissions(t *testing.T) {
	for _, id := range []string{"team/job", "team%2Fjob", "team?job# space+日本語", "execute"} {
		t.Run(id, func(t *testing.T) {
			instance, err := NewApp(context.Background(), backend.AppInstanceSettings{})
			if err != nil {
				t.Fatalf("new app: %s", err)
			}
			app := instance.(*App)
			template := testTemplate()
			template.ID = id
			app.templates, err = newProvisionedTemplateRepository([]Template{template})
			if err != nil {
				t.Fatalf("provision template: %s", err)
			}
			client := &recordingEventBridgeClient{}
			app.newEventBridgeClient = func(config aws.Config) eventBridgeAPI {
				if config.Region != template.Target.Region {
					t.Fatalf("region = %s", config.Region)
				}
				return client
			}
			query := "?id=" + url.QueryEscape(id)
			var lookup mockCallResourceResponseSender
			if err := app.CallResource(context.Background(), &backend.CallResourceRequest{
				PluginContext: templatePluginContext("Viewer", 1),
				Method:        http.MethodGet, Path: "templates", URL: "http://localhost/templates" + query,
			}, &lookup); err != nil {
				t.Fatalf("lookup: %s", err)
			}
			if lookup.response.Status != http.StatusOK {
				t.Fatalf("lookup status = %d body = %s", lookup.response.Status, lookup.response.Body)
			}
			var found Template
			if err := json.Unmarshal(lookup.response.Body, &found); err != nil || found.ID != id {
				t.Fatalf("lookup returned id = %q error = %v", found.ID, err)
			}

			for _, role := range []string{"Viewer", "Editor"} {
				pluginContext := templatePluginContext(role, 1)
				pluginContext.AppInstanceSettings.JSONData = []byte(`{"authType":"keys","defaultRegion":"us-east-1"}`)
				pluginContext.AppInstanceSettings.DecryptedSecureJSONData = map[string]string{
					"accessKey": "AKIAEXAMPLE", "secretKey": "secret",
				}
				var execution mockCallResourceResponseSender
				if err := app.CallResource(context.Background(), &backend.CallResourceRequest{
					PluginContext: pluginContext, Method: http.MethodPost,
					Path: "templates/execute", URL: "http://localhost/templates/execute" + query,
					Body: []byte(`{"detailType":"CustomRequested","values":{"runDate":"2026-10-18"}}`),
				}, &execution); err != nil {
					t.Fatalf("execute as %s: %s", role, err)
				}
				if role == "Viewer" {
					if execution.response.Status != http.StatusForbidden || client.input != nil {
						t.Fatalf("viewer execute status = %d, input = %v", execution.response.Status, client.input)
					}
					continue
				}
				if execution.response.Status != http.StatusOK {
					t.Fatalf("execute status = %d body = %s", execution.response.Status, execution.response.Body)
				}
				if client.input == nil || len(client.input.Entries) != 1 || aws.ToString(client.input.Entries[0].Source) != template.Event.Source {
					t.Fatalf("unexpected event = %+v", client.input)
				}
			}
		})
	}
}

func TestTemplateResourceUsesProvisionedTemplatesAndBlocksWrites(t *testing.T) {
	instance, err := NewApp(context.Background(), backend.AppInstanceSettings{})
	if err != nil {
		t.Fatalf("new app: %s", err)
	}
	app := instance.(*App)
	app.templates, err = newProvisionedTemplateRepository([]Template{testTemplate()})
	if err != nil {
		t.Fatalf("provision templates: %s", err)
	}

	var viewerResponse mockCallResourceResponseSender
	if err := app.CallResource(context.Background(), &backend.CallResourceRequest{
		PluginContext: templatePluginContext("Viewer", 1),
		Method:        http.MethodGet,
		Path:          "templates/template-1",
	}, &viewerResponse); err != nil {
		t.Fatalf("get: %s", err)
	}
	if viewerResponse.response.Status != http.StatusOK {
		t.Fatalf("get status = %d body = %s", viewerResponse.response.Status, viewerResponse.response.Body)
	}

	var createResponse mockCallResourceResponseSender
	if err := app.CallResource(context.Background(), &backend.CallResourceRequest{
		PluginContext: templatePluginContext("Editor", 1),
		Method:        http.MethodPost,
		Path:          "templates",
	}, &createResponse); err != nil {
		t.Fatalf("create: %s", err)
	}
	if createResponse.response.Status != http.StatusMethodNotAllowed {
		t.Fatalf("create status = %d body = %s", createResponse.response.Status, createResponse.response.Body)
	}

	var updateResponse mockCallResourceResponseSender
	if err := app.CallResource(context.Background(), &backend.CallResourceRequest{
		PluginContext: templatePluginContext("Editor", 1),
		Method:        http.MethodPut,
		Path:          "templates/template-1",
	}, &updateResponse); err != nil {
		t.Fatalf("update: %s", err)
	}
	if updateResponse.response.Status != http.StatusMethodNotAllowed {
		t.Fatalf("update status = %d body = %s", updateResponse.response.Status, updateResponse.response.Body)
	}

	var viewerExecuteResponse mockCallResourceResponseSender
	if err := app.CallResource(context.Background(), &backend.CallResourceRequest{
		PluginContext: templatePluginContext("Viewer", 1),
		Method:        http.MethodPost,
		Path:          "templates/template-1/execute",
	}, &viewerExecuteResponse); err != nil {
		t.Fatalf("viewer execute: %s", err)
	}
	if viewerExecuteResponse.response.Status != http.StatusForbidden {
		t.Fatalf("viewer execute status = %d body = %s", viewerExecuteResponse.response.Status, viewerExecuteResponse.response.Body)
	}
}
