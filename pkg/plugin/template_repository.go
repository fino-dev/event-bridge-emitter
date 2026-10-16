package plugin

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

var (
	ErrTemplateNotFound = errors.New("template not found")
	ErrTemplateConflict = errors.New("template was updated by another user")
)

// TemplateRepository stores templates within a Grafana organization.
type TemplateRepository interface {
	List(ctx context.Context, namespace string, query string) ([]Template, error)
	Get(ctx context.Context, namespace string, id string) (Template, error)
	Create(ctx context.Context, namespace string, template Template) (Template, error)
	Update(ctx context.Context, namespace string, id string, template Template, expectedVersion int64) (Template, error)
	Delete(ctx context.Context, namespace string, id string) error
}

// memoryTemplateRepository is intentionally limited to tests. Production instances use DynamoDB.
type memoryTemplateRepository struct {
	mu    sync.RWMutex
	items map[string]map[string]Template
	now   func() time.Time
}

func newMemoryTemplateRepository() *memoryTemplateRepository {
	return &memoryTemplateRepository{
		items: make(map[string]map[string]Template),
		now:   time.Now,
	}
}

func (r *memoryTemplateRepository) List(_ context.Context, namespace string, query string) ([]Template, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	orgItems := r.items[orgKey(namespace)]
	result := make([]Template, 0, len(orgItems))
	for _, template := range orgItems {
		if matchesTemplateQuery(template, query) {
			result = append(result, cloneTemplate(template))
		}
	}
	sortedTemplates(result)
	return result, nil
}

func (r *memoryTemplateRepository) Get(_ context.Context, namespace string, id string) (Template, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	template, ok := r.items[orgKey(namespace)][id]
	if !ok {
		return Template{}, ErrTemplateNotFound
	}
	return cloneTemplate(template), nil
}

func (r *memoryTemplateRepository) Create(_ context.Context, namespace string, template Template) (Template, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	org := r.items[orgKey(namespace)]
	if org == nil {
		org = make(map[string]Template)
		r.items[orgKey(namespace)] = org
	}
	if _, exists := org[template.ID]; exists {
		return Template{}, ErrTemplateConflict
	}
	now := r.now().UTC().Format(time.RFC3339Nano)
	template.Version = 1
	template.CreatedAt = now
	template.UpdatedAt = now
	org[template.ID] = cloneTemplate(template)
	return cloneTemplate(template), nil
}

func (r *memoryTemplateRepository) Update(_ context.Context, namespace string, id string, template Template, expectedVersion int64) (Template, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	org := r.items[orgKey(namespace)]
	current, ok := org[id]
	if !ok {
		return Template{}, ErrTemplateNotFound
	}
	if current.Version != expectedVersion {
		return Template{}, ErrTemplateConflict
	}
	template.ID = id
	template.Version = current.Version + 1
	template.CreatedAt = current.CreatedAt
	template.UpdatedAt = r.now().UTC().Format(time.RFC3339Nano)
	org[id] = cloneTemplate(template)
	return cloneTemplate(template), nil
}

func (r *memoryTemplateRepository) Delete(_ context.Context, namespace string, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	org := r.items[orgKey(namespace)]
	if _, ok := org[id]; !ok {
		return ErrTemplateNotFound
	}
	delete(org, id)
	return nil
}

func orgKey(namespace string) string {
	return fmt.Sprintf("org:%s", strings.TrimSpace(namespace))
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
