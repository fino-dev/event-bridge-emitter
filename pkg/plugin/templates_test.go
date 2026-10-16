package plugin

import (
	"context"
	"encoding/json"
	"errors"
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

func TestMemoryTemplateRepositoryUsesOrgAndVersionIsolation(t *testing.T) {
	repository := newMemoryTemplateRepository()
	template, err := repository.Create(context.Background(), "org-1", testTemplate())
	if err != nil {
		t.Fatalf("create: %s", err)
	}
	if template.Version != 1 {
		t.Fatalf("version = %d", template.Version)
	}
	if _, err := repository.Get(context.Background(), "org-2", template.ID); !errors.Is(err, ErrTemplateNotFound) {
		t.Fatalf("other org get error = %v", err)
	}
	updated := template
	updated.Name = "Updated"
	if _, err := repository.Update(context.Background(), "org-1", template.ID, updated, 99); !errors.Is(err, ErrTemplateConflict) {
		t.Fatalf("stale update error = %v", err)
	}
	updated, err = repository.Update(context.Background(), "org-1", template.ID, updated, template.Version)
	if err != nil {
		t.Fatalf("update: %s", err)
	}
	if updated.Version != 2 || updated.Name != "Updated" {
		t.Fatalf("updated = %+v", updated)
	}
}
