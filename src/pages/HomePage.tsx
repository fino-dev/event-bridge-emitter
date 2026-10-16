import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';
import { config, PluginPage } from '@grafana/runtime';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Combobox,
  EmptyState,
  Field,
  FieldSet,
  Icon,
  Input,
  LoadingPlaceholder,
  Stack,
  TextArea,
  useStyles2,
} from '@grafana/ui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import pluginJson from '../plugin.json';
import { testIds } from '../components/testIds';
import { buildEventDetail, errorMessage, executeTemplate, listTemplates } from '../templates/api';
import { EventTemplate, TemplateField } from '../templates/types';

function HomePage() {
  const styles = useStyles2(getStyles);
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
      <main className={styles.page} data-testid={testIds.homePage.container}>
        <header className={styles.pageHeader}>
          <div className={styles.pageTitleGroup}>
            <div className={styles.eyebrow}>
              <Icon name="cloud" size="sm" />
              Event delivery
            </div>
            <h1 className={styles.pageTitle}>AWS EventBridge Emitter</h1>
            <p className={styles.pageSubtitle}>
              Choose a provisioned template, fill in its event values, and send an event through Grafana.
            </p>
          </div>
          <Badge color="blue" icon="code-branch" text="Provisioned templates" />
        </header>

        {error && (
          <Alert severity="error" title="Template request failed" onRemove={() => setError(undefined)}>
            {error}
          </Alert>
        )}

        {!executing && (
          <section className={styles.section} aria-labelledby="templates-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="templates-heading" className={styles.sectionTitle}>
                  Available templates
                </h2>
                <p className={styles.sectionDescription}>
                  Templates are managed by Grafana provisioning and are read-only here.
                </p>
              </div>
              {!loading && templates.length > 0 && (
                <span className={styles.resultCount}>
                  {templates.length} {templates.length === 1 ? 'template' : 'templates'}
                </span>
              )}
            </div>

            <div className={styles.searchBar}>
              <div className={styles.searchInput}>
                <Input
                  aria-label="Search templates"
                  prefix={<Icon name="search" />}
                  value={query}
                  placeholder="Search by name, tag, bus, source, or detail type"
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void loadTemplates(query);
                    }
                  }}
                />
              </div>
              <Button icon="search" onClick={() => void loadTemplates(query)}>
                Search
              </Button>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <LoadingPlaceholder text="Loading provisioned templates…" />
              </div>
            ) : templates.length === 0 ? (
              <div className={styles.emptyState}>
                <EmptyState
                  variant="not-found"
                  message={query ? 'No templates match your search' : 'No provisioned templates'}
                >
                  <p>
                    {query
                      ? 'Try a different search term.'
                      : 'Ask an administrator to add templates to the Grafana app provisioning configuration.'}
                  </p>
                </EmptyState>
              </div>
            ) : (
              <div className={styles.templateList}>
                {templates.map((template) => (
                  <Card className={styles.templateCard} key={template.id} noMargin>
                    <Card.Heading>
                      <div className={styles.cardTitle}>{template.name}</div>
                    </Card.Heading>
                    <Card.Description>{template.description || 'No description provided.'}</Card.Description>
                    <Card.Meta className={styles.cardMeta} separator="">
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Destination</span>
                        <strong>
                          {template.target.region} / {template.target.eventBusName}
                        </strong>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Event</span>
                        <strong>{template.event.source}</strong>
                        <span>{template.event.detailType}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Fields</span>
                        <strong>{template.event.fields.length}</strong>
                        <span>{template.event.fields.length === 1 ? 'input' : 'inputs'}</span>
                      </div>
                    </Card.Meta>
                    {template.tags && template.tags.length > 0 && (
                      <Card.Tags className={styles.cardTags}>
                        <Stack gap={1} wrap="wrap">
                          {template.tags.map((tag) => (
                            <Badge key={tag} color="darkgrey" text={tag} />
                          ))}
                        </Stack>
                      </Card.Tags>
                    )}
                    {canExecuteTemplates && (
                      <Card.Actions>
                        <Button icon="arrow-right" iconPlacement="right" onClick={() => setExecuting(template)}>
                          Use template
                        </Button>
                      </Card.Actions>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {executing && <TemplateExecutor template={executing} onCancel={() => setExecuting(undefined)} />}
      </main>
    </PluginPage>
  );
}

interface TemplateExecutorProps {
  template: EventTemplate;
  onCancel: () => void;
}

function TemplateExecutor({ template, onCancel }: TemplateExecutorProps) {
  const styles = useStyles2(getStyles);
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
    <section className={styles.executor} aria-labelledby="executor-heading">
      <div className={styles.executorHeader}>
        <div>
          <Button variant="secondary" fill="text" icon="arrow-left" onClick={onCancel}>
            Back to templates
          </Button>
          <div className={styles.executorTitleGroup}>
            <div className={styles.eyebrow}>
              <Icon name="play" size="sm" />
              Event execution
            </div>
            <h2 id="executor-heading" className={styles.executorTitle}>
              Use {template.name}
            </h2>
            <p className={styles.sectionDescription}>
              Values below are applied at send time. The template itself is managed through provisioning.
            </p>
          </div>
        </div>
        <Badge color="blue" text="Provisioned" />
      </div>

      <div className={styles.destinationNotice}>
        <Icon name="cloud-provider" size="sm" />
        <span>
          Sending to <strong>{template.target.eventBusName}</strong> in <strong>{template.target.region}</strong>
        </span>
      </div>

      <div className={styles.executorGrid}>
        <Card className={styles.executorCard} noMargin>
          <Card.Heading>Event values</Card.Heading>
          <Card.Description>Customize the provided fields before sending this event.</Card.Description>
          <div className={styles.formBody}>
            <Field label="Detail type" description="Defaults to the value defined by the provisioned template">
              <Input value={detailType} onChange={(event) => setDetailType(event.currentTarget.value)} />
            </Field>
            <FieldSet label="Template fields">
              <Stack direction="column" gap={2}>
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
              </Stack>
            </FieldSet>
          </div>
          <Card.Actions>
            <Button icon="play" onClick={() => void send()} disabled={sending}>
              {sending ? 'Sending…' : 'Send event'}
            </Button>
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </Card.Actions>
        </Card>

        <Card className={styles.executorCard} noMargin>
          <Card.Heading>Event preview</Card.Heading>
          <Card.Description>Review the detail payload that will be sent to EventBridge.</Card.Description>
          <div className={styles.previewBody}>
            <TextArea readOnly rows={16} value={preview} aria-label="Event JSON preview" />
          </div>
          {result && (
            <Alert
              severity={result.severity}
              title={result.severity === 'success' ? 'Event accepted' : 'Event not accepted'}
            >
              {result.message}
            </Alert>
          )}
        </Card>
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
      <Checkbox label={label} checked={value === true} onChange={(event) => onChange(event.currentTarget.checked)} />
    );
  }
  if (field.type === 'select') {
    const options = (field.options || []).map((option) => ({ label: option, value: option }));
    return (
      <Field label={label}>
        <Combobox
          aria-label={label}
          options={options}
          value={typeof value === 'string' ? value : null}
          placeholder="Select an option"
          onChange={(option) => onChange(option.value)}
        />
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

const getStyles = (theme: GrafanaTheme2) => ({
  page: css({
    maxWidth: 1200,
    margin: '0 auto',
    padding: theme.spacing(0, 2, 6),
  }),
  pageHeader: css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing(3),
    marginBottom: theme.spacing(5),
  }),
  pageTitleGroup: css({
    minWidth: 0,
  }),
  eyebrow: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }),
  pageTitle: css({
    margin: theme.spacing(1, 0, 0),
    fontSize: theme.typography.h1.fontSize,
    lineHeight: 1.2,
  }),
  pageSubtitle: css({
    maxWidth: 720,
    margin: theme.spacing(1, 0, 0),
    color: theme.colors.text.secondary,
    fontSize: theme.typography.body.fontSize,
  }),
  section: css({
    minWidth: 0,
  }),
  sectionHeader: css({
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  }),
  sectionTitle: css({
    margin: 0,
    fontSize: theme.typography.h2.fontSize,
    lineHeight: 1.3,
  }),
  sectionDescription: css({
    margin: theme.spacing(0.75, 0, 0),
    color: theme.colors.text.secondary,
  }),
  resultCount: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    whiteSpace: 'nowrap',
  }),
  searchBar: css({
    display: 'flex',
    alignItems: 'flex-end',
    gap: theme.spacing(1),
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
  }),
  searchInput: css({
    flex: 1,
    minWidth: 0,
  }),
  loadingState: css({
    minHeight: 160,
    display: 'grid',
    placeItems: 'center',
    padding: theme.spacing(3),
    border: `1px dashed ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
  }),
  emptyState: css({
    padding: theme.spacing(3),
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    textAlign: 'center',
  }),
  templateList: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
    gap: theme.spacing(2),
    alignItems: 'stretch',
  }),
  templateCard: css({
    height: '100%',
    '&:hover': {
      boxShadow: theme.shadows.z1,
    },
  }),
  cardTitle: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  cardMeta: css({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1.5fr) minmax(64px, 0.6fr)',
    gap: theme.spacing(2),
    alignItems: 'start',
    marginTop: theme.spacing(2),
  }),
  detailItem: css({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    gap: theme.spacing(0.5),
    overflowWrap: 'anywhere',
    '& strong': {
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeightMedium,
    },
  }),
  detailLabel: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  cardTags: css({
    marginTop: theme.spacing(2),
  }),
  executor: css({
    minWidth: 0,
  }),
  executorHeader: css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing(3),
    marginBottom: theme.spacing(3),
  }),
  executorTitleGroup: css({
    marginTop: theme.spacing(3),
  }),
  executorTitle: css({
    margin: theme.spacing(1, 0, 0),
    fontSize: theme.typography.h2.fontSize,
    lineHeight: 1.3,
  }),
  destinationNotice: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5, 2),
    marginBottom: theme.spacing(2),
    color: theme.colors.text.secondary,
    background: theme.colors.background.secondary,
    borderLeft: `3px solid ${theme.colors.primary.main}`,
    borderRadius: theme.shape.radius.default,
  }),
  executorGrid: css({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)',
    gap: theme.spacing(2),
    alignItems: 'start',
  }),
  executorCard: css({
    height: '100%',
  }),
  formBody: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
    marginTop: theme.spacing(2),
  }),
  previewBody: css({
    marginTop: theme.spacing(2),
    '& textarea': {
      minHeight: 360,
      fontFamily: theme.typography.fontFamilyMonospace,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: 1.5,
    },
  }),
  '@media (max-width: 800px)': {
    pageHeader: {
      flexDirection: 'column',
      marginBottom: theme.spacing(4),
    },
    sectionHeader: {
      alignItems: 'flex-start',
      flexDirection: 'column',
    },
    executorHeader: {
      flexDirection: 'column',
    },
    executorGrid: {
      gridTemplateColumns: '1fr',
    },
  },
  '@media (max-width: 520px)': {
    page: {
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
    },
    searchBar: {
      alignItems: 'stretch',
      flexDirection: 'column',
    },
    searchInput: {
      width: '100%',
    },
    cardMeta: {
      gridTemplateColumns: '1fr 1fr',
    },
  },
});

export default HomePage;
