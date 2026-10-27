import {
  Alert,
  Badge,
  Button,
  Card,
  ClipboardButton,
  Field,
  FieldSet,
  Icon,
  Input,
  TextArea,
  useStyles2,
} from '@grafana/ui';
import React, { useMemo, useState } from 'react';
import pluginJson from '../../plugin.json';
import { errorMessage, executeTemplate, executionResponseFromError, templateFields } from '../../templates/api';
import { EventTemplate } from '../../templates/types';
import { buildEventCommand, buildEventPreview } from '../../templates/preview';
import { ExecutionField } from './ExecutionField';
import { getStyles } from './TemplateExecutor.styles';

interface TemplateExecutorProps {
  template: EventTemplate;
  onCancel: () => void;
}

export function TemplateExecutor({ template, onCancel }: TemplateExecutorProps) {
  const styles = useStyles2(getStyles);
  const fields = templateFields(template);
  const [detailType, setDetailType] = useState(template.event.detailType);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of fields) {
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
    for (const field of fields) {
      if (field.type === 'json') {
        rawValues[field.key] = formatJSONValue(field.default);
      }
    }
    return rawValues;
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ severity: 'success' | 'warning' | 'error'; title: string; message: string }>();
  const [copyError, setCopyError] = useState(false);
  const eventPreview = useMemo(() => buildEventPreview(template, detailType, values), [template, detailType, values]);
  const preview = JSON.stringify(eventPreview, null, 2);

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
        severity: response.status === 'accepted' ? 'success' : response.status === 'unknown' ? 'warning' : 'error',
        title:
          response.status === 'accepted'
            ? 'Event accepted'
            : response.status === 'unknown'
              ? 'Delivery status unknown'
              : 'Event rejected',
        message: response.message || response.errorMessage || response.status,
      });
    } catch (requestError) {
      const response = executionResponseFromError(requestError);
      if (response) {
        setResult({
          severity: response.status === 'unknown' ? 'warning' : 'error',
          title: response.status === 'unknown' ? 'Delivery status unknown' : 'Event rejected',
          message: response.message || response.errorMessage || response.status,
        });
      } else {
        setResult({ severity: 'error', title: 'Event request failed', message: errorMessage(requestError) });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={styles.root} aria-labelledby="executor-heading">
      <div className={styles.header}>
        <div className={styles.introduction}>
          <Button variant="secondary" fill="text" icon="arrow-left" onClick={onCancel}>
            Back to templates
          </Button>
          <div className={styles.titleGroup}>
            <div className={styles.eyebrow}>
              <Icon name="play" size="sm" />
              Event execution
            </div>
            <h2 id="executor-heading" className={styles.title}>
              Use {template.name}
            </h2>
            <p className={styles.description}>
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

      <div className={styles.grid}>
        <Card className={styles.card} noMargin>
          <Card.Heading>Event values</Card.Heading>
          <Card.Description className={styles.cardDescription}>
            Customize the provided fields before sending this event.
          </Card.Description>
          <div className={styles.formBody}>
            <Field noMargin label="Detail type" description="Defaults to the value defined by the provisioned template">
              <Input value={detailType} onChange={(event) => setDetailType(event.currentTarget.value)} />
            </Field>
            {fields.length > 0 && (
              <FieldSet label="Detail fields" className={styles.fieldSet}>
                <div className={styles.fields}>
                  {fields.map((field) => (
                    <ExecutionField
                      key={field.key}
                      field={field}
                      value={values[field.key]}
                      rawValue={rawJSONValues[field.key]}
                      onRawChange={(rawValue) => setRawJSONValues((current) => ({ ...current, [field.key]: rawValue }))}
                      onChange={(value) => setValue(field.key, value)}
                    />
                  ))}
                </div>
              </FieldSet>
            )}
          </div>
          <Card.Actions className={styles.actions}>
            <Button icon="play" onClick={() => void send()} disabled={sending}>
              {sending ? 'Sending…' : 'Send event'}
            </Button>
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </Card.Actions>
        </Card>

        <Card className={styles.card} noMargin>
          <Card.Heading className={styles.previewHeading}>
            Event preview
            <ClipboardButton
              type="button"
              icon="copy"
              variant="secondary"
              fill="text"
              size="sm"
              aria-label="Copy AWS CLI command"
              tooltip="Copy AWS CLI command (bash/zsh)"
              getText={() => buildEventCommand(eventPreview)}
              onClipboardCopy={() => setCopyError(false)}
              onClipboardError={() => setCopyError(true)}
            />
          </Card.Heading>
          <Card.Description className={styles.cardDescription}>
            Review the full event and its destination. Copy an AWS CLI command for bash/zsh.
          </Card.Description>
          <div className={styles.previewBody}>
            <TextArea readOnly rows={16} value={preview} aria-label="Event JSON preview" />
          </div>
          {copyError && (
            <Alert severity="error" title="Could not copy AWS CLI command" bottomSpacing={0}>
              Check clipboard permissions and try again.
            </Alert>
          )}
          {result && (
            <Alert severity={result.severity} title={result.title} bottomSpacing={0}>
              {result.message}
            </Alert>
          )}
        </Card>
      </div>
    </section>
  );
}

function formatJSONValue(value: unknown): string {
  if (value === undefined) {
    return '';
  }
  return JSON.stringify(value, null, 2) ?? '';
}
