import { Checkbox, Combobox, Field, Input, TextArea } from '@grafana/ui';
import React from 'react';
import { TemplateField } from '../../templates/types';

interface ExecutionFieldProps {
  field: TemplateField;
  value: unknown;
  rawValue?: string;
  onRawChange?: (value: string) => void;
  onChange: (value: unknown) => void;
}

export function ExecutionField({ field, value, rawValue, onRawChange, onChange }: ExecutionFieldProps) {
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
