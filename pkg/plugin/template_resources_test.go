package plugin

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func templatePluginContext(role string, orgID int64) backend.PluginContext {
	return backend.PluginContext{
		OrgID: orgID,
		User:  &backend.User{Role: role},
		AppInstanceSettings: &backend.AppInstanceSettings{
			JSONData: []byte(`{"authType":"default","defaultRegion":"ap-northeast-1"}`),
		},
	}
}

func TestTemplateResourceCRUDEnforcesOrgAndRole(t *testing.T) {
	instance, err := NewApp(context.Background(), backend.AppInstanceSettings{})
	if err != nil {
		t.Fatalf("new app: %s", err)
	}
	app := instance.(*App)
	app.templates = newMemoryTemplateRepository()

	body, err := json.Marshal(templateWriteRequest{
		Name:   "Daily pipeline",
		Target: testTemplate().Target,
		Event:  testTemplate().Event,
	})
	if err != nil {
		t.Fatalf("encode request: %s", err)
	}
	var createResponse mockCallResourceResponseSender
	if err := app.CallResource(context.Background(), &backend.CallResourceRequest{
		PluginContext: templatePluginContext("Editor", 1),
		Method:        http.MethodPost,
		Path:          "templates",
		Body:          body,
	}, &createResponse); err != nil {
		t.Fatalf("create: %s", err)
	}
	if createResponse.response.Status != http.StatusCreated {
		t.Fatalf("create status = %d body = %s", createResponse.response.Status, createResponse.response.Body)
	}
	var created Template
	if err := json.Unmarshal(createResponse.response.Body, &created); err != nil {
		t.Fatalf("decode created template: %s", err)
	}

	var viewerResponse mockCallResourceResponseSender
	if err := app.CallResource(context.Background(), &backend.CallResourceRequest{
		PluginContext: templatePluginContext("Viewer", 1),
		Method:        http.MethodGet,
		Path:          "templates/" + created.ID,
	}, &viewerResponse); err != nil {
		t.Fatalf("get: %s", err)
	}
	if viewerResponse.response.Status != http.StatusOK {
		t.Fatalf("get status = %d body = %s", viewerResponse.response.Status, viewerResponse.response.Body)
	}

	var otherOrgResponse mockCallResourceResponseSender
	if err := app.CallResource(context.Background(), &backend.CallResourceRequest{
		PluginContext: templatePluginContext("Viewer", 2),
		Method:        http.MethodGet,
		Path:          "templates/" + created.ID,
	}, &otherOrgResponse); err != nil {
		t.Fatalf("other org get: %s", err)
	}
	if otherOrgResponse.response.Status != http.StatusNotFound {
		t.Fatalf("other org get status = %d body = %s", otherOrgResponse.response.Status, otherOrgResponse.response.Body)
	}

	var viewerCreateResponse mockCallResourceResponseSender
	if err := app.CallResource(context.Background(), &backend.CallResourceRequest{
		PluginContext: templatePluginContext("Viewer", 1),
		Method:        http.MethodPost,
		Path:          "templates",
		Body:          body,
	}, &viewerCreateResponse); err != nil {
		t.Fatalf("viewer create: %s", err)
	}
	if viewerCreateResponse.response.Status != http.StatusForbidden {
		t.Fatalf("viewer create status = %d body = %s", viewerCreateResponse.response.Status, viewerCreateResponse.response.Body)
	}
}
