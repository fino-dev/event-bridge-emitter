package plugin

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/eventbridge"
	"github.com/aws/aws-sdk-go-v2/service/eventbridge/types"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

const maxTemplateRequestBytes = 1 << 20

type executeTemplateRequest struct {
	DetailType string         `json:"detailType"`
	Values     TemplateValues `json:"values"`
}

type executionResponse struct {
	Status       string `json:"status"`
	EventID      string `json:"eventId,omitempty"`
	ErrorCode    string `json:"errorCode,omitempty"`
	ErrorMessage string `json:"errorMessage,omitempty"`
	Message      string `json:"message,omitempty"`
}

func (a *App) handleTemplateCollection(w http.ResponseWriter, req *http.Request) {
	pluginCtx, ok := requireTemplateRole(w, req, roleViewer)
	if !ok {
		return
	}
	if req.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		writeTemplateError(w, http.StatusMethodNotAllowed, errors.New("template definitions are managed by Grafana provisioning"))
		return
	}
	repository, err := a.templateRepository(req.Context(), pluginCtx.AppInstanceSettings)
	if err != nil {
		writeTemplateError(w, http.StatusServiceUnavailable, err)
		return
	}
	query := req.URL.Query().Get("q")
	templates, err := repository.List(req.Context(), query)
	if err != nil {
		writeTemplateError(w, http.StatusBadGateway, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"templates": templates})
}

func (a *App) handleTemplateResource(w http.ResponseWriter, req *http.Request) {
	segments := strings.Split(strings.Trim(req.URL.Path, "/"), "/")
	if len(segments) < 2 || segments[0] != "templates" || segments[1] == "" {
		writeTemplateError(w, http.StatusNotFound, ErrTemplateNotFound)
		return
	}
	pluginCtx, ok := requireTemplateRole(w, req, roleViewer)
	if !ok {
		return
	}
	id := segments[1]
	if len(segments) == 3 && segments[2] == "execute" {
		if !roleAtLeast(pluginCtx.User, roleEditor) {
			writeTemplateError(w, http.StatusForbidden, errors.New("editor role is required"))
			return
		}
	} else if len(segments) == 2 && req.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		writeTemplateError(w, http.StatusMethodNotAllowed, errors.New("template definitions are managed by Grafana provisioning"))
		return
	}
	repository, err := a.templateRepository(req.Context(), pluginCtx.AppInstanceSettings)
	if err != nil {
		writeTemplateError(w, http.StatusServiceUnavailable, err)
		return
	}
	if len(segments) == 3 && segments[2] == "execute" {
		if req.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeTemplateError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
			return
		}
		a.executeTemplate(w, req, repository, pluginCtx, id)
		return
	}
	if len(segments) != 2 {
		writeTemplateError(w, http.StatusNotFound, ErrTemplateNotFound)
		return
	}

	switch req.Method {
	case http.MethodGet:
		template, err := repository.Get(req.Context(), id)
		if err != nil {
			writeTemplateRepositoryError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, template)
	default:
		w.Header().Set("Allow", http.MethodGet)
		writeTemplateError(w, http.StatusMethodNotAllowed, errors.New("template definitions are managed by Grafana provisioning"))
	}
}

func (a *App) executeTemplate(w http.ResponseWriter, req *http.Request, repository TemplateRepository, pluginCtx backend.PluginContext, id string) {
	template, err := repository.Get(req.Context(), id)
	if err != nil {
		writeTemplateRepositoryError(w, err)
		return
	}
	var payload executeTemplateRequest
	if err := decodeTemplateBody(req, &payload); err != nil {
		writeTemplateError(w, http.StatusBadRequest, err)
		return
	}
	detail, err := template.EventDetail(payload.Values)
	if err != nil {
		writeTemplateError(w, http.StatusBadRequest, err)
		return
	}
	detailType := template.Event.DetailType
	if strings.TrimSpace(payload.DetailType) != "" {
		detailType = strings.TrimSpace(payload.DetailType)
		if err := validateEventName("detail type", detailType); err != nil {
			writeTemplateError(w, http.StatusBadRequest, err)
			return
		}
	}
	cfg, err := a.awsConfig(req.Context(), pluginCtx.AppInstanceSettings)
	if err != nil {
		writeTemplateError(w, authStatusCode(err), err)
		return
	}
	cfg.Region = template.Target.Region
	client := a.newEventBridgeClient(cfg)
	output, err := client.PutEvents(req.Context(), &eventbridge.PutEventsInput{
		Entries: []types.PutEventsRequestEntry{{
			Detail:       aws.String(string(detail)),
			DetailType:   aws.String(detailType),
			EventBusName: aws.String(template.Target.EventBusName),
			Source:       aws.String(template.Event.Source),
		}},
	})
	if err != nil {
		writeJSON(w, http.StatusBadGateway, executionResponse{
			Status:  "unknown",
			Message: "EventBridge request failed; the event may have been accepted before the timeout. Check EventBridge before retrying.",
		})
		return
	}
	if output.FailedEntryCount > 0 {
		result := executionResponse{Status: "failed", Message: "EventBridge rejected the event"}
		if len(output.Entries) > 0 {
			entry := output.Entries[0]
			result.EventID = aws.ToString(entry.EventId)
			result.ErrorCode = aws.ToString(entry.ErrorCode)
			result.ErrorMessage = aws.ToString(entry.ErrorMessage)
		}
		writeJSON(w, http.StatusBadGateway, result)
		return
	}
	result := executionResponse{Status: "accepted", Message: "EventBridge accepted the event. This does not indicate that downstream targets finished processing it."}
	if len(output.Entries) > 0 {
		result.EventID = aws.ToString(output.Entries[0].EventId)
	}
	writeJSON(w, http.StatusOK, result)
}

type templateRole string

const (
	roleViewer templateRole = "Viewer"
	roleEditor templateRole = "Editor"
)

func requireTemplateRole(w http.ResponseWriter, req *http.Request, role templateRole) (backend.PluginContext, bool) {
	pluginCtx := backend.PluginConfigFromContext(req.Context())
	if pluginCtx.User == nil {
		writeTemplateError(w, http.StatusUnauthorized, errors.New("grafana user context is required"))
		return pluginCtx, false
	}
	if !roleAtLeast(pluginCtx.User, role) {
		writeTemplateError(w, http.StatusForbidden, fmt.Errorf("%s role is required", role))
		return pluginCtx, false
	}
	return pluginCtx, true
}

func roleAtLeast(user *backend.User, required templateRole) bool {
	if user == nil {
		return false
	}
	rank := func(role string) int {
		switch strings.ToLower(strings.TrimSpace(role)) {
		case "admin":
			return 3
		case "editor":
			return 2
		case "viewer":
			return 1
		default:
			return 0
		}
	}
	return rank(user.Role) >= rank(string(required))
}

func decodeTemplateBody(req *http.Request, destination any) error {
	if req.Body == nil {
		return errors.New("request body is required")
	}
	body, err := io.ReadAll(io.LimitReader(req.Body, maxTemplateRequestBytes+1))
	if err != nil {
		return fmt.Errorf("read request body: %w", err)
	}
	if len(body) > maxTemplateRequestBytes {
		return fmt.Errorf("request body must not exceed %d bytes", maxTemplateRequestBytes)
	}
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	var extra any
	if err := decoder.Decode(&extra); err == nil {
		return errors.New("request body must contain one JSON object")
	} else if !errors.Is(err, io.EOF) {
		return fmt.Errorf("invalid JSON body: %w", err)
	}
	return nil
}

func writeTemplateRepositoryError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrTemplateNotFound):
		writeTemplateError(w, http.StatusNotFound, err)
	default:
		writeTemplateError(w, http.StatusBadGateway, err)
	}
}

func writeTemplateError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"message": err.Error()})
}
