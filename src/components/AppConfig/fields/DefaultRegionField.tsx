import React from 'react';
import { Field, Input } from '@grafana/ui';
import { testIds } from '../../testIds';
import { AuthFieldChangeHandler } from '../useAwsAuthSettings';

interface DefaultRegionFieldProps {
  value: string;
  onChange: AuthFieldChangeHandler;
}

export function DefaultRegionField({ value, onChange }: DefaultRegionFieldProps) {
  return (
    <Field
      noMargin
      label="Default Region"
      description="Region used for AWS requests. A credentials profile can supply this when the field is empty."
      htmlFor="config-default-region"
    >
      <Input
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
