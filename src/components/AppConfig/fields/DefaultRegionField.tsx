import React from 'react';
import { Field, Input } from '@grafana/ui';
import { testIds } from '../../testIds';
import { AuthFieldChangeHandler } from '../useAwsAuthSettings';

interface DefaultRegionFieldProps {
  value: string;
  className?: string;
  onChange: AuthFieldChangeHandler;
}

export function DefaultRegionField({ value, className, onChange }: DefaultRegionFieldProps) {
  return (
    <Field
      label="Default Region"
      description="Region used for AWS requests. A credentials profile can supply this when the field is empty."
      htmlFor="config-default-region"
      className={className}
    >
      <Input
        width={60}
        id="config-default-region"
        name="defaultRegion"
        data-testid={testIds.appConfig.defaultRegion}
        value={value}
        placeholder="ap-northeast-1"
        onChange={onChange}
      />
    </Field>
  );
}
