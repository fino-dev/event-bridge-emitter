import React, { ChangeEvent, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { css } from '@emotion/css';
import { AppPluginMeta, GrafanaTheme2, PluginConfigPageProps, PluginMeta } from '@grafana/data';
import { config, getBackendSrv } from '@grafana/runtime';
import { Alert, Button, Field, FieldSet, Input, SecretInput, Select, useStyles2 } from '@grafana/ui';
import {
  AwsAuthJsonData,
  AwsAuthType,
  AwsIdentity,
  awsIdentityUrl,
  buildAwsSettingsUpdate,
  errorMessage,
  visibleAuthProviders,
} from '../../aws/settings';
import { testIds } from '../testIds';

export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta<AwsAuthJsonData>> {}

interface AuthFormState {
  authType: AwsAuthType;
  profile: string;
  defaultRegion: string;
  assumeRoleArn: string;
  externalId: string;
  accessKey: string;
  secretKey: string;
  isAccessKeySet: boolean;
  isSecretKeySet: boolean;
}

interface TestResult {
  severity: 'success' | 'error';
  title: string;
  message: string;
}

const AppConfig = ({ plugin }: AppConfigProps) => {
  const s = useStyles2(getStyles);
  const { enabled, pinned, jsonData, secureJsonFields } = plugin.meta;
  const providers = visibleAuthProviders(config.awsAllowedAuthProviders);
  const assumeRoleEnabled = config.awsAssumeRoleEnabled ?? true;
  const [state, setState] = useState<AuthFormState>({
    authType: initialAuthType(jsonData?.authType, providers),
    profile: jsonData?.profile || '',
    defaultRegion: jsonData?.defaultRegion || '',
    assumeRoleArn: jsonData?.assumeRoleArn || '',
    externalId: jsonData?.externalId || '',
    accessKey: '',
    secretKey: '',
    isAccessKeySet: Boolean(secureJsonFields?.accessKey),
    isSecretKeySet: Boolean(secureJsonFields?.secretKey),
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<TestResult>();

  const selectedProvider = providers.find((provider) => provider.value === state.authType) ?? providers[0];
  const keysReady =
    state.authType !== 'keys' ||
    ((state.isAccessKeySet || state.accessKey.trim() !== '') &&
      (state.isSecretKeySet || state.secretKey.trim() !== ''));
  const isSubmitDisabled = saving || providers.length === 0 || !keysReady;

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setState({
      ...state,
      [event.target.name]: event.target.value,
    });
  };

  const onAuthTypeChange = (option: { value?: AwsAuthType } | null) => {
    if (!option?.value) {
      return;
    }
    setState({
      ...state,
      authType: option.value,
    });
  };

  const onSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) {
      return;
    }

    setSaving(true);
    setResult(undefined);
    const update = buildAwsSettingsUpdate({
      ...state,
      assumeRoleEnabled,
    });

    try {
      await updatePlugin(plugin.meta.id, {
        enabled,
        pinned,
        jsonData: update.jsonData,
        secureJsonData: update.secureJsonData,
      });
    } catch (error) {
      setSaving(false);
      setResult({
        severity: 'error',
        title: 'Could not save settings',
        message: errorMessage(error),
      });
      return;
    }

    if (state.authType === 'keys') {
      setState((current) => ({
        ...current,
        accessKey: '',
        secretKey: '',
        isAccessKeySet: true,
        isSecretKeySet: true,
      }));
    }

    try {
      const identity = await getBackendSrv().get<AwsIdentity>(awsIdentityUrl(plugin.meta.id));
      setResult({
        severity: 'success',
        title: 'AWS authentication succeeded',
        message: `Authenticated as ${identity.arn} in account ${identity.account}.`,
      });
    } catch (error) {
      setResult({
        severity: 'error',
        title: 'Settings saved, but AWS authentication failed',
        message: errorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <FieldSet label="AWS authentication">
        {providers.length === 0 ? (
          <Alert severity="warning" title="No supported authentication provider">
            This Grafana server only allows Grafana Assume Role. This plugin cannot use that provider. Enable AWS SDK
            Default, Credentials file, or Access & secret key in the server AWS settings.
          </Alert>
        ) : (
          <Field label="Authentication Provider" description={selectedProvider?.description} htmlFor="config-auth-type">
            <Select
              inputId="config-auth-type"
              width={60}
              options={providers}
              value={selectedProvider}
              onChange={onAuthTypeChange}
            />
          </Field>
        )}

        {state.authType === 'credentials' && (
          <Field
            label="Credentials Profile Name"
            description="Profile name in the Grafana server credentials file. Leave blank to use the default profile."
            htmlFor="config-profile"
          >
            <Input
              width={60}
              id="config-profile"
              name="profile"
              data-testid={testIds.appConfig.profile}
              value={state.profile}
              placeholder="default"
              onChange={onChange}
            />
          </Field>
        )}

        {state.authType === 'keys' && (
          <>
            <Field label="Access Key ID" htmlFor="config-access-key">
              <SecretInput
                width={60}
                id="config-access-key"
                name="accessKey"
                data-testid={testIds.appConfig.accessKey}
                value={state.accessKey}
                isConfigured={state.isAccessKeySet}
                placeholder="AKIA..."
                onChange={onChange}
                onReset={() => setState({ ...state, accessKey: '', isAccessKeySet: false })}
              />
            </Field>
            <Field label="Secret Access Key" htmlFor="config-secret-key">
              <SecretInput
                width={60}
                id="config-secret-key"
                name="secretKey"
                data-testid={testIds.appConfig.secretKey}
                value={state.secretKey}
                isConfigured={state.isSecretKeySet}
                placeholder="Secret access key"
                onChange={onChange}
                onReset={() => setState({ ...state, secretKey: '', isSecretKeySet: false })}
              />
            </Field>
          </>
        )}

        {assumeRoleEnabled && (
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
                value={state.assumeRoleArn}
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
                value={state.externalId}
                onChange={onChange}
              />
            </Field>
          </>
        )}

        <Field
          label="Default Region"
          description="Region used for AWS requests. A credentials profile can supply this when the field is empty."
          htmlFor="config-default-region"
          className={s.marginTop}
        >
          <Input
            width={60}
            id="config-default-region"
            name="defaultRegion"
            data-testid={testIds.appConfig.defaultRegion}
            value={state.defaultRegion}
            placeholder="ap-northeast-1"
            onChange={onChange}
          />
        </Field>

        {result && (
          <Alert severity={result.severity} title={result.title} data-testid={testIds.appConfig.result}>
            {result.message}
          </Alert>
        )}

        <div className={s.marginTop}>
          <Button type="submit" data-testid={testIds.appConfig.submit} disabled={isSubmitDisabled}>
            {saving ? 'Testing…' : 'Save and test'}
          </Button>
        </div>
      </FieldSet>
    </form>
  );
};

export default AppConfig;

const getStyles = (theme: GrafanaTheme2) => ({
  marginTop: css`
    margin-top: ${theme.spacing(3)};
  `,
});

function initialAuthType(saved: AwsAuthType | undefined, providers: Array<{ value: AwsAuthType }>): AwsAuthType {
  if (saved && providers.some((provider) => provider.value === saved)) {
    return saved;
  }
  return providers[0]?.value ?? 'default';
}

const updatePlugin = async (pluginId: string, data: Partial<PluginMeta<AwsAuthJsonData>>) => {
  const response = await getBackendSrv().fetch({
    url: `/api/plugins/${pluginId}/settings`,
    method: 'POST',
    data,
  });

  return lastValueFrom(response);
};
