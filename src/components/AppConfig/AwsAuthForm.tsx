import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Alert, Button, FieldSet, useStyles2 } from '@grafana/ui';
import { testIds } from '../testIds';
import { AssumeRoleFields } from './fields/AssumeRoleFields';
import { AuthCredentialFields } from './fields/AuthCredentialFields';
import { AuthenticationProviderField } from './fields/AuthenticationProviderField';
import { DefaultRegionField } from './fields/DefaultRegionField';
import { TemplateStorageFields } from './fields/TemplateStorageFields';
import { useAwsAuthSettings } from './useAwsAuthSettings';

type AwsAuthFormProps = ReturnType<typeof useAwsAuthSettings>;

export function AwsAuthForm({
  providers,
  selectedProvider,
  assumeRoleEnabled,
  state,
  saving,
  result,
  isSubmitDisabled,
  onChange,
  onAuthTypeChange,
  onResetAccessKey,
  onResetSecretKey,
  onSubmit,
}: AwsAuthFormProps) {
  const styles = useStyles2(getStyles);

  return (
    <form onSubmit={onSubmit}>
      <FieldSet label="AWS authentication">
        <AuthenticationProviderField
          providers={providers}
          selectedProvider={selectedProvider}
          onAuthTypeChange={onAuthTypeChange}
        />
        <AuthCredentialFields
          authType={state.authType}
          profile={state.profile}
          accessKey={state.accessKey}
          secretKey={state.secretKey}
          isAccessKeySet={state.isAccessKeySet}
          isSecretKeySet={state.isSecretKeySet}
          onChange={onChange}
          onResetAccessKey={onResetAccessKey}
          onResetSecretKey={onResetSecretKey}
        />
        {assumeRoleEnabled && (
          <AssumeRoleFields assumeRoleArn={state.assumeRoleArn} externalId={state.externalId} onChange={onChange} />
        )}
        <DefaultRegionField className={styles.marginTop} value={state.defaultRegion} onChange={onChange} />
        <FieldSet label="Template storage">
          <TemplateStorageFields
            tableName={state.templateTableName}
            region={state.templateTableRegion}
            onChange={onChange}
          />
        </FieldSet>
        {result && (
          <Alert severity={result.severity} title={result.title} data-testid={testIds.appConfig.result}>
            {result.message}
          </Alert>
        )}
        <div className={styles.marginTop}>
          <Button type="submit" data-testid={testIds.appConfig.submit} disabled={isSubmitDisabled}>
            {saving ? 'Testing…' : 'Save and test'}
          </Button>
        </div>
      </FieldSet>
    </form>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  marginTop: css`
    margin-top: ${theme.spacing(3)};
  `,
});
