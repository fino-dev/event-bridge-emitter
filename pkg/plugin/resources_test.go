package plugin

import (
	"context"
	"net/http"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// mockCallResourceResponseSender implements backend.CallResourceResponseSender
// for use in tests.
type mockCallResourceResponseSender struct {
	response *backend.CallResourceResponse
}

// Send sets the received *backend.CallResourceResponse to s.response
func (s *mockCallResourceResponseSender) Send(response *backend.CallResourceResponse) error {
	s.response = response
	return nil
}

// TestCallResourceDoesNotExposeTemplateEndpoints guards against generated sample routes.
func TestCallResourceDoesNotExposeTemplateEndpoints(t *testing.T) {
	inst, err := NewApp(context.Background(), backend.AppInstanceSettings{})
	if err != nil {
		t.Fatalf("new app: %s", err)
	}
	if inst == nil {
		t.Fatal("inst must not be nil")
	}
	app, ok := inst.(*App)
	if !ok {
		t.Fatal("inst must be of type *App")
	}

	for _, path := range []string{"ping", "echo"} {
		t.Run(path, func(t *testing.T) {
			var response mockCallResourceResponseSender
			err := app.CallResource(context.Background(), &backend.CallResourceRequest{
				Method: http.MethodGet,
				Path:   path,
			}, &response)
			if err != nil {
				t.Fatalf("CallResource error: %s", err)
			}
			if response.response == nil {
				t.Fatal("no response received from CallResource")
			}
			if response.response.Status != http.StatusNotFound {
				t.Errorf("status = %d, want %d", response.response.Status, http.StatusNotFound)
			}
		})
	}
}
