package plugin

import (
	"context"
	"fmt"
	"net/http"
	"testing"

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
