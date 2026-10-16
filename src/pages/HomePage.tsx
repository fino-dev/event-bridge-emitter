import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { config, PluginPage } from '@grafana/runtime';
import { Alert, Button, Field, Input, Spinner, TextArea } from '@grafana/ui';
import pluginJson from '../plugin.json';
import { testIds } from '../components/testIds';
import {
  buildEventDetail,
  createTemplate,
  deleteTemplate,
  errorMessage,
  executeTemplate,
  listTemplates,
  updateTemplate,
} from '../templates/api';
import { EventTemplate, TemplateField, TemplateFieldType } from '../templates/types';

const emptyTemplate: EventTemplate = {
  id: '',
  name: '',
  description: '',
  tags: [],
  target: { region: '', eventBusName: 'default' },
  event: { source: '', detailType: '', fixedDetail: {}, fields: [] },
  version: 0,
};

function HomePage() {
  const canManageTemplates = config.bootData.user.orgRole === 'Editor' || config.bootData.user.orgRole === 'Admin';
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<EventTemplate>();
  const [executing, setExecuting] = useState<EventTemplate>();
  const [notice, setNotice] = useState<string>();

  const loadTemplates = useCallback(async (search: string) => {
    setLoading(true);
    setError(undefined);
    try {
      setTemplates(await listTemplates(pluginJson.id, search));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTemplates(''), 0);
    return () => window.clearTimeout(timer);
  }, [loadTemplates]);

  const save = async (template: EventTemplate) => {
    setError(undefined);
    try {
      if (template.id) {
        await updateTemplate(pluginJson.id, template);
      } else {
        const { id: _id, version: _version, ...newTemplate } = template;
        await createTemplate(pluginJson.id, newTemplate);
      }
      setEditing(undefined);
      setNotice('Template saved.');
      await loadTemplates(query);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const remove = async (template: EventTemplate) => {
    if (!window.confirm(`Delete template "${template.name}"?`)) {
      return;
    }
    try {
      await deleteTemplate(pluginJson.id, template.id);
      setNotice('Template deleted.');
      await loadTemplates(query);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const duplicate = (template: EventTemplate) => {
    setEditing({
      ...template,
      id: '',
      version: 0,
      name: `${template.name} copy`,
      event: { ...template.event, fields: template.event.fields.map((field) => ({ ...field })) },
    });
  };

  const exportTemplate = (template: EventTemplate) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${template.name || 'eventbridge-template'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importTemplate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      const imported = JSON.parse(await file.text()) as EventTemplate;
      const { id: _id, version: _version, createdAt: _createdAt, updatedAt: _updatedAt, ...newTemplate } = imported;
      await createTemplate(pluginJson.id, newTemplate);
      setNotice('Template imported.');
      await loadTemplates(query);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  return (
    <PluginPage>
      <div data-testid={testIds.homePage.container}>
        <div className="page-header">
          <div>
            <h1>AWS EventBridge Emitter</h1>
            <p>Manage reusable EventBridge events and send them through the configured Grafana backend.</p>
          </div>
          <div className="page-actions">
            {canManageTemplates && (
              <>
                <Button variant="secondary" onClick={() => document.getElementById('template-import')?.click()}>
                  Import JSON
                </Button>
                <input
                  id="template-import"
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={importTemplate}
                />
                <Button
                  onClick={() => setEditing({ ...emptyTemplate, event: { ...emptyTemplate.event, fixedDetail: {} } })}
                >
                  New template
                </Button>
              </>
            )}
          </div>
        </div>

        {notice && (
          <Alert severity="success" title="Done" onRemove={() => setNotice(undefined)}>
            {notice}
          </Alert>
        )}
        {error && (
          <Alert severity="error" title="Template request failed" onRemove={() => setError(undefined)}>
            {error}
          </Alert>
        )}

        {!editing && !executing && (
          <>
            <div className="template-search">
              <Input
                aria-label="Search templates"
                value={query}
                placeholder="Search by name, tag, bus, source, or detail type"
                onChange={(event) => setQuery(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void loadTemplates(query);
                  }
                }}
              />
              <Button variant="secondary" onClick={() => void loadTemplates(query)}>
                Search
              </Button>
            </div>
            {loading ? (
              <Spinner />
            ) : templates.length === 0 ? (
              <div className="empty-state">
                <h2>No templates yet</h2>
                <p>Create a template with fixed event metadata and the values your operators need to provide.</p>
                {canManageTemplates && (
                  <Button onClick={() => setEditing({ ...emptyTemplate })}>Create template</Button>
                )}
              </div>
            ) : (
              <div className="template-list">
                {templates.map((template) => (
                  <article className="template-card" key={template.id}>
                    <div className="template-card-header">
                      <div>
                        <h2>{template.name}</h2>
                        <p>{template.description || 'No description'}</p>
                      </div>
                      <span className="template-version">v{template.version}</span>
                    </div>
                    <dl>
                      <div>
                        <dt>Destination</dt>
                        <dd>
                          {template.target.region} / {template.target.eventBusName}
                        </dd>
                      </div>
                      <div>
                        <dt>Event</dt>
                        <dd>
                          {template.event.source} / {template.event.detailType}
                        </dd>
                      </div>
                      <div>
                        <dt>Fields</dt>
                        <dd>{template.event.fields.length}</dd>
                      </div>
                    </dl>
                    {template.tags && template.tags.length > 0 && (
                      <p className="template-tags">{template.tags.join(' · ')}</p>
                    )}
                    <div className="template-actions">
                      {canManageTemplates && <Button onClick={() => setExecuting(template)}>Execute</Button>}
                      {canManageTemplates && (
                        <Button variant="secondary" onClick={() => setEditing(template)}>
                          Edit
                        </Button>
                      )}
                      {canManageTemplates && (
                        <Button variant="secondary" onClick={() => duplicate(template)}>
                          Duplicate
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => exportTemplate(template)}>
                        Export
                      </Button>
                      {canManageTemplates && (
                        <Button variant="destructive" onClick={() => void remove(template)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {editing && <TemplateEditor initial={editing} onCancel={() => setEditing(undefined)} onSave={save} />}
        {executing && <TemplateExecutor template={executing} onCancel={() => setExecuting(undefined)} />}
      </div>
    </PluginPage>
  );
}

interface TemplateEditorProps {
  initial: EventTemplate;
  onCancel: () => void;
  onSave: (template: EventTemplate) => Promise<void>;
}

function TemplateEditor({ initial, onCancel, onSave }: TemplateEditorProps) {
  const [template, setTemplate] = useState<EventTemplate>(initial);
  const [fixedDetail, setFixedDetail] = useState(() => JSON.stringify(initial.event.fixedDetail, null, 2));
  const [error, setError] = useState<string>();
  const isNew = !initial.id;

  const update = (changes: Partial<EventTemplate>) => setTemplate((current) => ({ ...current, ...changes }));
  const updateEvent = (changes: Partial<EventTemplate['event']>) =>
    setTemplate((current) => ({ ...current, event: { ...current.event, ...changes } }));
  const updateTarget = (changes: Partial<EventTemplate['target']>) =>
    setTemplate((current) => ({ ...current, target: { ...current.target, ...changes } }));

  const save = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const parsed = JSON.parse(fixedDetail);
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('Fixed detail must be a JSON object');
      }
      await onSave({ ...template, event: { ...template.event, fixedDetail: parsed } });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save template');
    }
  };

  const updateField = (index: number, changes: Partial<TemplateField>) => {
    const fields = template.event.fields.map((field, fieldIndex) =>
      fieldIndex === index ? { ...field, ...changes } : field
    );
    updateEvent({ fields });
  };

  return (
    <form className="template-editor" onSubmit={save}>
      <div className="editor-header">
        <h2>{isNew ? 'New template' : `Edit ${initial.name}`}</h2>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error && (
        <Alert severity="error" title="Invalid template">
          {error}
        </Alert>
      )}
      <Field label="Name" htmlFor="template-name">
        <Input
          id="template-name"
          value={template.name}
          onChange={(event) => update({ name: event.currentTarget.value })}
        />
      </Field>
      <Field label="Description" htmlFor="template-description">
        <TextArea
          id="template-description"
          value={template.description}
          onChange={(event) => update({ description: event.currentTarget.value })}
        />
      </Field>
      <Field label="Tags" description="Comma-separated tags" htmlFor="template-tags">
        <Input
          id="template-tags"
          value={(template.tags || []).join(', ')}
          onChange={(event) =>
            update({
              tags: event.currentTarget.value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
        />
      </Field>

      <fieldset>
        <legend>Destination</legend>
        <Field label="AWS Region" htmlFor="template-region">
          <Input
            id="template-region"
            value={template.target.region}
            onChange={(event) => updateTarget({ region: event.currentTarget.value })}
            placeholder="ap-northeast-1"
          />
        </Field>
        <Field label="Event bus name" htmlFor="template-event-bus">
          <Input
            id="template-event-bus"
            value={template.target.eventBusName}
            onChange={(event) => updateTarget({ eventBusName: event.currentTarget.value })}
          />
        </Field>
      </fieldset>

      <fieldset>
        <legend>Event</legend>
        <Field label="Source" htmlFor="template-source">
          <Input
            id="template-source"
            value={template.event.source}
            onChange={(event) => updateEvent({ source: event.currentTarget.value })}
            placeholder="company.pipeline"
          />
        </Field>
        <Field label="Detail type" htmlFor="template-detail-type">
          <Input
            id="template-detail-type"
            value={template.event.detailType}
            onChange={(event) => updateEvent({ detailType: event.currentTarget.value })}
            placeholder="StartPipeline"
          />
        </Field>
        <Field
          label="Fixed detail"
          description="JSON object merged with submitted field values"
          htmlFor="template-fixed-detail"
        >
          <TextArea
            id="template-fixed-detail"
            rows={8}
            value={fixedDetail}
            onChange={(event) => setFixedDetail(event.currentTarget.value)}
          />
        </Field>
      </fieldset>

      <fieldset>
        <legend>Input fields</legend>
        {template.event.fields.map((field, index) => (
          <div className="field-row" key={`${field.key}-${index}`}>
            <Input
              aria-label={`Field ${index + 1} key`}
              value={field.key}
              placeholder="runDate"
              onChange={(event) => updateField(index, { key: event.currentTarget.value })}
            />
            <Input
              aria-label={`Field ${index + 1} label`}
              value={field.label}
              placeholder="Run date"
              onChange={(event) => updateField(index, { label: event.currentTarget.value })}
            />
            <select
              aria-label={`Field ${index + 1} type`}
              value={field.type}
              onChange={(event) => updateField(index, { type: event.currentTarget.value as TemplateFieldType })}
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="select">select</option>
              <option value="json">JSON</option>
            </select>
            <label>
              <input
                type="checkbox"
                checked={field.required}
                onChange={(event) => updateField(index, { required: event.currentTarget.checked })}
              />{' '}
              Required
            </label>
            <Input
              aria-label={`Field ${index + 1} default`}
              value={formatFieldDefault(field)}
              placeholder="Default"
              onChange={(event) =>
                updateField(index, { default: parseFieldDefault(field.type, event.currentTarget.value) })
              }
            />
            {field.type === 'select' && (
              <Input
                aria-label={`Field ${index + 1} options`}
                value={(field.options || []).join(', ')}
                placeholder="staging, production"
                onChange={(event) =>
                  updateField(index, {
                    options: event.currentTarget.value
                      .split(',')
                      .map((option) => option.trim())
                      .filter(Boolean),
                  })
                }
              />
            )}
            <Button
              variant="destructive"
              type="button"
              onClick={() =>
                updateEvent({ fields: template.event.fields.filter((_, fieldIndex) => fieldIndex !== index) })
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          type="button"
          onClick={() =>
            updateEvent({
              fields: [
                ...template.event.fields,
                { key: `field${template.event.fields.length + 1}`, label: '', type: 'string', required: true },
              ],
            })
          }
        >
          Add field
        </Button>
      </fieldset>
      <Button type="submit">Save template</Button>
    </form>
  );
}

interface TemplateExecutorProps {
  template: EventTemplate;
  onCancel: () => void;
}

function TemplateExecutor({ template, onCancel }: TemplateExecutorProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of template.event.fields) {
      if (field.default !== undefined) {
        defaults[field.key] = field.default;
      } else if (field.type === 'boolean' && field.required) {
        defaults[field.key] = false;
      }
    }
    return defaults;
  });
  const [rawJSONValues, setRawJSONValues] = useState<Record<string, string>>(() => {
    const rawValues: Record<string, string> = {};
    for (const field of template.event.fields) {
      if (field.type === 'json') {
        rawValues[field.key] = formatJSONValue(field.default);
      }
    }
    return rawValues;
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ severity: 'success' | 'error'; message: string }>();
  const preview = useMemo(() => JSON.stringify(buildEventDetail(template, values), null, 2), [template, values]);

  const setValue = (key: string, value: unknown) =>
    setValues((current) => {
      const next = { ...current };
      if (value === undefined) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });

  const send = async () => {
    setSending(true);
    setResult(undefined);
    try {
      const response = await executeTemplate(pluginJson.id, template.id, values);
      setResult({
        severity: response.status === 'accepted' ? 'success' : 'error',
        message: response.message || response.errorMessage || response.status,
      });
    } catch (requestError) {
      setResult({ severity: 'error', message: errorMessage(requestError) });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="template-executor">
      <div className="editor-header">
        <h2>Execute {template.name}</h2>
        <Button variant="secondary" onClick={onCancel}>
          Back
        </Button>
      </div>
      <p>
        EventBridge destination:{' '}
        <strong>
          {template.target.region} / {template.target.eventBusName}
        </strong>
        . A successful response means EventBridge accepted the event, not that downstream processing finished.
      </p>
      {template.event.fields.map((field) => (
        <ExecutionField
          key={field.key}
          field={field}
          value={values[field.key]}
          rawValue={rawJSONValues[field.key]}
          onRawChange={(rawValue) => setRawJSONValues((current) => ({ ...current, [field.key]: rawValue }))}
          onChange={(value) => setValue(field.key, value)}
        />
      ))}
      <Field label="Event JSON preview">
        <TextArea readOnly rows={12} value={preview} />
      </Field>
      {result && (
        <Alert
          severity={result.severity}
          title={result.severity === 'success' ? 'Event accepted' : 'Event not accepted'}
        >
          {result.message}
        </Alert>
      )}
      <div className="template-actions">
        <Button onClick={() => void send()} disabled={sending}>
          {sending ? 'Sending…' : 'Send event'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </section>
  );
}

interface ExecutionFieldProps {
  field: TemplateField;
  value: unknown;
  rawValue?: string;
  onRawChange?: (value: string) => void;
  onChange: (value: unknown) => void;
}

function ExecutionField({ field, value, rawValue, onRawChange, onChange }: ExecutionFieldProps) {
  const label = `${field.label}${field.required ? ' *' : ''}`;
  if (field.type === 'boolean') {
    return (
      <label className="boolean-field">
        <input type="checkbox" checked={value === true} onChange={(event) => onChange(event.currentTarget.checked)} />{' '}
        {label}
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <Field label={label}>
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.currentTarget.value || undefined)}
        >
          <option value="">Select…</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === 'json') {
    return (
      <Field label={label}>
        <TextArea
          rows={5}
          value={rawValue ?? formatJSONValue(value)}
          onChange={(event) => {
            const nextRawValue = event.currentTarget.value;
            onRawChange?.(nextRawValue);
            try {
              onChange(nextRawValue ? JSON.parse(nextRawValue) : undefined);
            } catch {
              /* backend returns the validation error */
            }
          }}
        />
      </Field>
    );
  }
  return (
    <Field label={label}>
      <Input
        type={field.type === 'number' ? 'number' : 'text'}
        value={value === undefined ? '' : String(value)}
        onChange={(event) =>
          onChange(
            field.type === 'number'
              ? event.currentTarget.value === ''
                ? undefined
                : Number(event.currentTarget.value)
              : event.currentTarget.value
          )
        }
      />
    </Field>
  );
}

function formatJSONValue(value: unknown): string {
  if (value === undefined) {
    return '';
  }
  return JSON.stringify(value, null, 2) ?? '';
}

function formatFieldDefault(field: TemplateField): string {
  if (field.default === undefined) {
    return '';
  }
  return typeof field.default === 'string' ? field.default : JSON.stringify(field.default);
}

function parseFieldDefault(type: TemplateFieldType, value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  if (type === 'number') {
    return Number(trimmed);
  }
  if (type === 'boolean') {
    return trimmed.toLowerCase() === 'true';
  }
  if (type === 'json') {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

export default HomePage;
