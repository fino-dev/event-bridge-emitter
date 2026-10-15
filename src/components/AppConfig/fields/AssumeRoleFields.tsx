import React from 'react';
import { Field, Input } from '@grafana/ui';
import { testIds } from '../../testIds';
import { AuthFieldChangeHandler } from '../useAwsAuthSettings';

interface AssumeRoleFieldsProps {
  assumeRoleArn: string;
  externalId: string;
  onChange: AuthFieldChangeHandler;
}

export function AssumeRoleFields({ assumeRoleArn, externalId, onChange }: AssumeRoleFieldsProps) {
  return (
    <>
      <Field
        label="Assume Role ARN"
        description="Optional. The selected credentials assume this IAM role, and the role receives the AWS permissions."
        htmlFor="config-assume-role-arn"
      >
        <Input
          width={60}
          id="config-assume-role-arn"
          name="assumeRoleArn"
          data-testid={testIds.appConfig.assumeRoleArn}
          value={assumeRoleArn}
          placeholder="arn:aws:iam::123456789012:role/GrafanaEventBridge"
          onChange={onChange}
        />
      </Field>
      <Field
        label="External ID"
        description="Optional. Required only when the role trust policy checks an external ID."
        htmlFor="config-external-id"
      >
        <Input
          width={60}
          id="config-external-id"
          name="externalId"
          data-testid={testIds.appConfig.externalId}
          value={externalId}
          onChange={onChange}
        />
      </Field>
    </>
  );
}
