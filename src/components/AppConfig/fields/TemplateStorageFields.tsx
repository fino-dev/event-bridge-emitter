import React from 'react';
import { Field, Input } from '@grafana/ui';
import { testIds } from '../../testIds';
import { AuthFieldChangeHandler } from '../useAwsAuthSettings';

interface TemplateStorageFieldsProps {
  tableName: string;
  region: string;
  onChange: AuthFieldChangeHandler;
}

export function TemplateStorageFields({ tableName, region, onChange }: TemplateStorageFieldsProps) {
  return (
    <>
      <Field
        label="DynamoDB Template Table"
        description="Table used to persist templates. Partition key: orgId (string), sort key: id (string)."
        htmlFor="config-template-table-name"
      >
        <Input
          width={60}
          id="config-template-table-name"
          name="templateTableName"
          data-testid={testIds.appConfig.templateTableName}
          value={tableName}
          placeholder="eventbridge-emitter-templates"
          onChange={onChange}
        />
      </Field>
      <Field
        label="Template Table Region"
        description="Optional. Uses the default AWS region when empty."
        htmlFor="config-template-table-region"
      >
        <Input
          width={60}
          id="config-template-table-region"
          name="templateTableRegion"
          data-testid={testIds.appConfig.templateTableRegion}
          value={region}
          placeholder="ap-northeast-1"
          onChange={onChange}
        />
      </Field>
    </>
  );
}
