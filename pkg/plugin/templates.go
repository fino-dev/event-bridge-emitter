package plugin

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"regexp"
	"strings"
)

const maxEventDetailBytes = 256 * 1024

var templateFieldKeyPattern = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_.-]{0,127}$`)

// Template is a reusable EventBridge event definition.
type Template struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Tags        []string       `json:"tags,omitempty"`
	Target      TemplateTarget `json:"target"`
	Event       TemplateEvent  `json:"event"`
}

// TemplateTarget identifies the EventBridge destination.
type TemplateTarget struct {
	Region       string `json:"region"`
	EventBusName string `json:"eventBusName"`
}

// TemplateEvent contains the fixed event metadata and dynamic form fields.
type TemplateEvent struct {
	Source      string          `json:"source"`
	DetailType  string          `json:"detailType"`
	FixedDetail map[string]any  `json:"fixedDetail"`
	Fields      []TemplateField `json:"fields"`
}

// TemplateField describes one dynamic value in an event detail.
type TemplateField struct {
	Key      string   `json:"key"`
	Label    string   `json:"label"`
	Type     string   `json:"type"`
	Required bool     `json:"required"`
	Default  any      `json:"default,omitempty"`
	Options  []string `json:"options,omitempty"`
}

const (
	fieldTypeString  = "string"
	fieldTypeNumber  = "number"
	fieldTypeBoolean = "boolean"
	fieldTypeSelect  = "select"
	fieldTypeJSON    = "json"
)

var allowedFieldTypes = map[string]struct{}{
	fieldTypeString:  {},
	fieldTypeNumber:  {},
	fieldTypeBoolean: {},
	fieldTypeSelect:  {},
	fieldTypeJSON:    {},
}

// TemplateValues contains values submitted for dynamic fields.
type TemplateValues map[string]any

// EventDetail returns the fixed detail merged with validated form values.
func (t Template) EventDetail(values TemplateValues) ([]byte, error) {
	if err := t.Validate(); err != nil {
		return nil, err
	}

	validated, err := t.validateValues(values)
	if err != nil {
		return nil, err
	}

	detail := make(map[string]any, len(t.Event.FixedDetail)+len(validated))
	for key, value := range t.Event.FixedDetail {
		detail[key] = value
	}
	for key, value := range validated {
		detail[key] = value
	}

	payload, err := json.Marshal(detail)
	if err != nil {
		return nil, fmt.Errorf("could not encode event detail: %w", err)
	}
	if len(payload) > maxEventDetailBytes {
		return nil, fmt.Errorf("event detail exceeds the %d byte EventBridge limit", maxEventDetailBytes)
	}
	return payload, nil
}

// Validate checks template metadata and field definitions before provisioning or execution.
func (t Template) Validate() error {
	if strings.TrimSpace(t.ID) == "" {
		return errors.New("template id is required")
	}
	if name := strings.TrimSpace(t.Name); name == "" || len(name) > 128 {
		return errors.New("template name must be between 1 and 128 characters")
	}
	if len(t.Description) > 1000 {
		return errors.New("template description must not exceed 1000 characters")
	}
	if len(t.Tags) > 20 {
		return errors.New("template cannot have more than 20 tags")
	}
	seenTags := make(map[string]struct{}, len(t.Tags))
	for _, tag := range t.Tags {
		tag = strings.TrimSpace(tag)
		if tag == "" || len(tag) > 64 {
			return errors.New("template tags must be between 1 and 64 characters")
		}
		if _, ok := seenTags[tag]; ok {
			return fmt.Errorf("duplicate template tag %q", tag)
		}
		seenTags[tag] = struct{}{}
	}
	if region := strings.TrimSpace(t.Target.Region); region == "" || len(region) > 64 || strings.ContainsAny(region, " \t\r\n") {
		return errors.New("target region must be a non-empty AWS region")
	}
	if err := validateEventName("event bus name", t.Target.EventBusName); err != nil {
		return err
	}
	if err := validateEventName("event source", t.Event.Source); err != nil {
		return err
	}
	if err := validateEventName("detail type", t.Event.DetailType); err != nil {
		return err
	}
	if t.Event.FixedDetail == nil {
		return errors.New("fixed detail must be a JSON object")
	}
	if len(t.Event.Fields) > 100 {
		return errors.New("template cannot have more than 100 fields")
	}
	seenKeys := make(map[string]struct{}, len(t.Event.Fields))
	for _, field := range t.Event.Fields {
		if !templateFieldKeyPattern.MatchString(field.Key) {
			return fmt.Errorf("field key %q must start with a letter and contain only letters, numbers, dot, dash, or underscore", field.Key)
		}
		if strings.TrimSpace(field.Label) == "" || len(field.Label) > 128 {
			return fmt.Errorf("field %q must have a label between 1 and 128 characters", field.Key)
		}
		if _, ok := allowedFieldTypes[field.Type]; !ok {
			return fmt.Errorf("field %q has unsupported type %q", field.Key, field.Type)
		}
		if _, ok := seenKeys[field.Key]; ok {
			return fmt.Errorf("duplicate field key %q", field.Key)
		}
		seenKeys[field.Key] = struct{}{}
		if field.Type == fieldTypeSelect {
			if len(field.Options) == 0 {
				return fmt.Errorf("select field %q must have at least one option", field.Key)
			}
			seenOptions := make(map[string]struct{}, len(field.Options))
			for _, option := range field.Options {
				if strings.TrimSpace(option) == "" {
					return fmt.Errorf("select field %q cannot have an empty option", field.Key)
				}
				if _, ok := seenOptions[option]; ok {
					return fmt.Errorf("select field %q has duplicate option %q", field.Key, option)
				}
				seenOptions[option] = struct{}{}
			}
		}
		if field.Default != nil {
			if err := validateFieldValue(field, field.Default); err != nil {
				return fmt.Errorf("field %q default: %w", field.Key, err)
			}
		}
	}
	return nil
}

func validateEventName(label, value string) error {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > 256 || strings.ContainsAny(value, "\x00\r\n") {
		return fmt.Errorf("%s must be between 1 and 256 characters", label)
	}
	return nil
}

func (t Template) validateValues(values TemplateValues) (TemplateValues, error) {
	known := make(map[string]TemplateField, len(t.Event.Fields))
	for _, field := range t.Event.Fields {
		known[field.Key] = field
	}
	for key := range values {
		if _, ok := known[key]; !ok {
			return nil, fmt.Errorf("value provided for unknown field %q", key)
		}
	}

	validated := make(TemplateValues, len(known))
	for _, field := range t.Event.Fields {
		value, ok := values[field.Key]
		if !ok || value == nil {
			if field.Default != nil {
				value = field.Default
			} else if field.Required {
				return nil, fmt.Errorf("required field %q is missing", field.Key)
			} else {
				continue
			}
		}
		if err := validateFieldValue(field, value); err != nil {
			return nil, fmt.Errorf("field %q: %w", field.Key, err)
		}
		validated[field.Key] = value
	}
	return validated, nil
}

func validateFieldValue(field TemplateField, value any) error {
	switch field.Type {
	case fieldTypeString:
		valueString, ok := value.(string)
		if !ok {
			return errors.New("value must be a string")
		}
		if field.Required && strings.TrimSpace(valueString) == "" {
			return errors.New("value must not be empty")
		}
	case fieldTypeNumber:
		if !isJSONNumber(value) {
			return errors.New("value must be a finite number")
		}
	case fieldTypeBoolean:
		if _, ok := value.(bool); !ok {
			return errors.New("value must be a boolean")
		}
	case fieldTypeSelect:
		valueString, ok := value.(string)
		if !ok {
			return errors.New("value must be a string")
		}
		for _, option := range field.Options {
			if valueString == option {
				return nil
			}
		}
		return fmt.Errorf("value must be one of %s", strings.Join(field.Options, ", "))
	case fieldTypeJSON:
		if value == nil {
			return errors.New("value must be valid JSON")
		}
	default:
		return fmt.Errorf("unsupported field type %q", field.Type)
	}
	return nil
}

func isJSONNumber(value any) bool {
	switch number := value.(type) {
	case float64:
		return !math.IsNaN(number) && !math.IsInf(number, 0)
	case float32:
		return !math.IsNaN(float64(number)) && !math.IsInf(float64(number), 0)
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, json.Number:
		return true
	default:
		return false
	}
}
