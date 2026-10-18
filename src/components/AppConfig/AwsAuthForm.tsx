import React from 'react';
import { Alert, Button, FieldSet, useStyles2 } from '@grafana/ui';
import { testIds } from '../testIds';
import { AssumeRoleFields } from './fields/AssumeRoleFields';
import { AuthCredentialFields } from './fields/AuthCredentialFields';
import { AuthenticationProviderField } from './fields/AuthenticationProviderField';
import { DefaultRegionField } from './fields/DefaultRegionField';
import { useAwsAuthSettings } from './useAwsAuthSettings';
import { getStyles } from './AwsAuthForm.styles';

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
    <form className={styles.root} onSubmit={onSubmit}>
      <FieldSet label="AWS authentication" className={styles.fieldSet}>
        <div className={styles.fields}>
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
          <DefaultRegionField value={state.defaultRegion} onChange={onChange} />
          {result && (
            <Alert
              severity={result.severity}
              title={result.title}
              bottomSpacing={0}
              data-testid={testIds.appConfig.result}
            >
              {result.message}
            </Alert>
          )}
          <div>
            <Button type="submit" data-testid={testIds.appConfig.submit} disabled={isSubmitDisabled}>
              {saving ? 'Testing…' : 'Save and test'}
            </Button>
          </div>
        </div>
      </FieldSet>
    </form>
  );
}
