package plugin

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
)

var ErrTemplateNotFound = errors.New("template not found")

// TemplateRepository provides templates loaded from Grafana app provisioning
// settings. Template definitions are immutable at runtime.
type TemplateRepository interface {
	List(ctx context.Context, query string) ([]Template, error)
	Get(ctx context.Context, id string) (Template, error)
}

type provisionedTemplateRepository struct {
	items map[string]Template
}

func newProvisionedTemplateRepository(templates []Template) (*provisionedTemplateRepository, error) {
	repository := &provisionedTemplateRepository{items: make(map[string]Template, len(templates))}
	for _, template := range templates {
		if err := template.Validate(); err != nil {
			return nil, fmt.Errorf("invalid provisioned template %q: %w", template.ID, err)
		}
		if _, exists := repository.items[template.ID]; exists {
			return nil, fmt.Errorf("duplicate provisioned template id %q", template.ID)
		}
		repository.items[template.ID] = cloneTemplate(template)
	}
	return repository, nil
}

func (r *provisionedTemplateRepository) List(_ context.Context, query string) ([]Template, error) {
	result := make([]Template, 0, len(r.items))
	for _, template := range r.items {
		if matchesTemplateQuery(template, query) {
			result = append(result, cloneTemplate(template))
		}
	}
	sort.Slice(result, func(i, j int) bool {
		return strings.ToLower(result[i].Name) < strings.ToLower(result[j].Name)
	})
	return result, nil
}

func (r *provisionedTemplateRepository) Get(_ context.Context, id string) (Template, error) {
	template, ok := r.items[id]
	if !ok {
		return Template{}, ErrTemplateNotFound
	}
	return cloneTemplate(template), nil
}

func cloneTemplate(template Template) Template {
	clone := template
	clone.Tags = append([]string(nil), template.Tags...)
	clone.Event.Fields = append([]TemplateField(nil), template.Event.Fields...)
	clone.Event.FixedDetail = make(map[string]any, len(template.Event.FixedDetail))
	for key, value := range template.Event.FixedDetail {
		clone.Event.FixedDetail[key] = value
	}
	for i := range clone.Event.Fields {
		clone.Event.Fields[i].Options = append([]string(nil), template.Event.Fields[i].Options...)
	}
	return clone
}

func matchesTemplateQuery(template Template, query string) bool {
	query = lowerTrim(query)
	if query == "" {
		return true
	}
	values := []string{template.Name, template.Description, template.Target.Region, template.Target.EventBusName, template.Event.Source, template.Event.DetailType}
	values = append(values, template.Tags...)
	for _, value := range values {
		if containsFold(value, query) {
			return true
		}
	}
	return false
}

func lowerTrim(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func containsFold(value, query string) bool {
	return strings.Contains(strings.ToLower(value), query)
}
