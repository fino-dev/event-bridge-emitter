package plugin

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func testTemplate() Template {
	return Template{
		ID:   "template-1",
		Name: "Daily pipeline",
		Target: TemplateTarget{
			Region:       "ap-northeast-1",
			EventBusName: "operations",
		},
		Event: TemplateEvent{
			Source:      "company.pipeline",
			DetailType:  "StartDailyPipeline",
			FixedDetail: map[string]any{"environment": "staging"},
			Fields: []TemplateField{
				{Key: "runDate", Label: "Run date", Type: fieldTypeString, Required: true},
				{Key: "attempt", Label: "Attempt", Type: fieldTypeNumber, Default: float64(1)},
			},
		},
	}
}

func TestTemplateEventDetailMergesFixedAndDynamicValues(t *testing.T) {
	payload, err := testTemplate().EventDetail(TemplateValues{"runDate": "2026-10-16"})
	if err != nil {
		t.Fatalf("event detail: %s", err)
	}
	var detail map[string]any
	if err := json.Unmarshal(payload, &detail); err != nil {
		t.Fatalf("decode detail: %s", err)
	}
	if detail["environment"] != "staging" || detail["runDate"] != "2026-10-16" || detail["attempt"] != float64(1) {
		t.Fatalf("detail = %#v", detail)
	}
}

func TestTemplateEventDetailValidatesInputs(t *testing.T) {
	if _, err := testTemplate().EventDetail(nil); err == nil || !strings.Contains(err.Error(), "required field") {
		t.Fatalf("missing required value error = %v", err)
	}
	if _, err := testTemplate().EventDetail(TemplateValues{"runDate": 42}); err == nil || !strings.Contains(err.Error(), "must be a string") {
		t.Fatalf("invalid value error = %v", err)
	}
	if _, err := testTemplate().EventDetail(TemplateValues{"runDate": "today", "unexpected": true}); err == nil || !strings.Contains(err.Error(), "unknown field") {
		t.Fatalf("unknown value error = %v", err)
	}
}

func TestTemplateValidationRejectsInvalidDefinitions(t *testing.T) {
	invalid := testTemplate()
	invalid.Event.Fields[0].Key = "1runDate"
	if err := invalid.Validate(); err == nil {
		t.Fatal("expected invalid field key")
	}

	invalid = testTemplate()
	invalid.Event.Fields[0].Type = fieldTypeSelect
	if err := invalid.Validate(); err == nil {
		t.Fatal("expected missing select options")
	}
}

func TestProvisionedTemplateRepositoryIsReadOnlyAndSearchable(t *testing.T) {
	other := testTemplate()
	other.ID = "template-2"
	other.Name = "Weekly pipeline"
	other.Event.DetailType = "StartWeeklyPipeline"
	repository, err := newProvisionedTemplateRepository([]Template{testTemplate(), other})
	if err != nil {
		t.Fatalf("provision repository: %s", err)
	}

	templates, err := repository.List(context.Background(), "daily")
	if err != nil {
		t.Fatalf("list: %s", err)
	}
	if len(templates) != 1 || templates[0].ID != "template-1" {
		t.Fatalf("templates = %+v", templates)
	}

	template, err := repository.Get(context.Background(), "template-1")
	if err != nil {
		t.Fatalf("get: %s", err)
	}
	template.Name = "mutated"
	stored, err := repository.Get(context.Background(), "template-1")
	if err != nil {
		t.Fatalf("get after mutation: %s", err)
	}
	if stored.Name != "Daily pipeline" {
		t.Fatalf("repository was mutated through returned template: %+v", stored)
	}
}

func TestProvisionedTemplateRepositorySerializesEmptyFieldsAsArray(t *testing.T) {
	for name, fields := range map[string][]TemplateField{
		"empty":   {},
		"omitted": nil,
	} {
		t.Run(name, func(t *testing.T) {
			template := testTemplate()
			template.Event.Fields = fields

			repository, err := newProvisionedTemplateRepository([]Template{template})
			if err != nil {
				t.Fatalf("provision templates: %s", err)
			}
			stored, err := repository.Get(context.Background(), template.ID)
			if err != nil {
				t.Fatalf("get template: %s", err)
			}
			payload, err := json.Marshal(stored)
			if err != nil {
				t.Fatalf("marshal template: %s", err)
			}

			var response struct {
				Event struct {
					Fields json.RawMessage `json:"fields"`
				} `json:"event"`
			}
			if err := json.Unmarshal(payload, &response); err != nil {
				t.Fatalf("decode template: %s", err)
			}
			if string(response.Event.Fields) != "[]" {
				t.Fatalf("fields = %s, want []", response.Event.Fields)
			}
		})
	}
}

func TestProvisionedTemplateRepositoryRejectsDuplicateIDs(t *testing.T) {
	if _, err := newProvisionedTemplateRepository([]Template{testTemplate(), testTemplate()}); err == nil || !strings.Contains(err.Error(), "duplicate") {
		t.Fatalf("duplicate template error = %v", err)
	}
}
