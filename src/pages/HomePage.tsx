import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { config, PluginPage } from '@grafana/runtime';
import { Alert, Button, Field, Input, Spinner, TextArea } from '@grafana/ui';
import pluginJson from '../plugin.json';
import { testIds } from '../components/testIds';
import { buildEventDetail, errorMessage, executeTemplate, listTemplates } from '../templates/api';
import { EventTemplate, TemplateField } from '../templates/types';

function HomePage() {
  const canExecuteTemplates = config.bootData.user.orgRole === 'Editor' || config.bootData.user.orgRole === 'Admin';
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [executing, setExecuting] = useState<EventTemplate>();

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

  return (
    <PluginPage>
      <div data-testid={testIds.homePage.container}>
        <div className="page-header">
          <div>
            <h1>AWS EventBridge Emitter</h1>
            <p>Select a provisioned template and provide the event values to send through Grafana.</p>
          </div>
        </div>

        {error && (
          <Alert severity="error" title="Template request failed" onRemove={() => setError(undefined)}>
            {error}
          </Alert>
        )}

        {!executing && (
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
                <h2>No provisioned templates</h2>
                <p>Ask an administrator to add templates to the Grafana app provisioning configuration.</p>
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
                    {canExecuteTemplates && (
                      <div className="template-actions">
                        <Button onClick={() => setExecuting(template)}>Use template</Button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {executing && <TemplateExecutor template={executing} onCancel={() => setExecuting(undefined)} />}
      </div>
    </PluginPage>
  );
}

interface TemplateExecutorProps {
  template: EventTemplate;
  onCancel: () => void;
}

function TemplateExecutor({ template, onCancel }: TemplateExecutorProps) {
  const [detailType, setDetailType] = useState(template.event.detailType);
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
      const response = await executeTemplate(pluginJson.id, template.id, detailType, values);
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
        <h2>Use {template.name}</h2>
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
      <Field label="Detail type" description="Defaults to the value defined by the provisioned template">
        <Input value={detailType} onChange={(event) => setDetailType(event.currentTarget.value)} />
      </Field>
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

export default HomePage;
