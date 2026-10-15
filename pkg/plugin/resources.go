package plugin

import (
	"net/http"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// handleIdentity reports the AWS account for the saved credentials.
func (a *App) handleIdentity(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pluginCtx := backend.PluginConfigFromContext(req.Context())
	identity, err := a.callerIdentity(req.Context(), pluginCtx.AppInstanceSettings)
	if err != nil {
		writeJSON(w, authStatusCode(err), map[string]string{"message": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, identity)
}

func (a *App) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/aws/identity", a.handleIdentity)
}
