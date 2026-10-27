import { Checkbox, Combobox, Field, Input, Label, TextArea, useStyles2 } from '@grafana/ui';
import React, { useId } from 'react';
import { TemplateField } from '../../templates/types';
import { getStyles } from './ExecutionField.styles';

interface ExecutionFieldProps {
  field: TemplateField;
  value: unknown;
  rawValue?: string;
  onRawChange?: (value: string) => void;
  onChange: (value: unknown) => void;
}

export function ExecutionField({ field, value, rawValue, onRawChange, onChange }: ExecutionFieldProps) {
  const styles = useStyles2(getStyles);
  const id = useId();
  const name = `${field.label}${field.required ? ' *' : ''}`;
  const label = (
    <span className={styles.label}>
      <span className={styles.name}>{name}</span>
      <span className={styles.type} aria-hidden="true">
        {field.type}
      </span>
    </span>
  );
  const fieldLabel = <Label htmlFor={id}>{label}</Label>;
  if (field.type === 'boolean') {
    return (
      <div className={styles.checkbox}>
        <Checkbox
          id={id}
          aria-label={name}
          checked={value === true}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        {fieldLabel}
      </div>
    );
  }
  if (field.type === 'select') {
    const options = (field.options || []).map((option) => ({ label: option, value: option }));
    return (
      <Field noMargin className={styles.root} label={fieldLabel}>
        <Combobox
          id={id}
          aria-label={name}
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
      <Field noMargin className={styles.root} label={fieldLabel}>
        <TextArea
          id={id}
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
    <Field noMargin className={styles.root} label={fieldLabel}>
      <Input
        id={id}
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
