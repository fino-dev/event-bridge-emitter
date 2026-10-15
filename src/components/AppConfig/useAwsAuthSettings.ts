import { ChangeEvent, SubmitEvent, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { AppPluginMeta, PluginMeta } from '@grafana/data';
import { config, getBackendSrv } from '@grafana/runtime';
import { type ComboboxOption } from '@grafana/ui';
import {
  AwsAuthJsonData,
  AwsAuthType,
  AwsIdentity,
  awsIdentityUrl,
  buildAwsSettingsUpdate,
  errorMessage,
  visibleAuthProviders,
} from '../../aws/settings';

export type AuthProviderOption = ReturnType<typeof visibleAuthProviders>[number];

export interface AuthFormState {
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

export interface AuthTestResult {
  severity: 'success' | 'error';
  title: string;
  message: string;
}

export type AuthFieldChangeHandler = (event: ChangeEvent<HTMLInputElement>) => void;

export function useAwsAuthSettings(meta: AppPluginMeta<AwsAuthJsonData>) {
  const { enabled, pinned, jsonData, secureJsonFields } = meta;
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
  const [result, setResult] = useState<AuthTestResult>();

  const selectedProvider = providers.find((provider) => provider.value === state.authType) ?? providers[0];
  const keysReady =
    state.authType !== 'keys' ||
    ((state.isAccessKeySet || state.accessKey.trim() !== '') &&
      (state.isSecretKeySet || state.secretKey.trim() !== ''));
  const isSubmitDisabled = saving || providers.length === 0 || !keysReady;

  const onChange: AuthFieldChangeHandler = (event) => {
    setState({
      ...state,
      [event.target.name]: event.target.value,
    });
  };

  const onAuthTypeChange = (option: ComboboxOption<AwsAuthType>) => {
    setState({
      ...state,
      authType: option.value,
    });
  };

  const onResetAccessKey = () => {
    setState({ ...state, accessKey: '', isAccessKeySet: false });
  };

  const onResetSecretKey = () => {
    setState({ ...state, secretKey: '', isSecretKeySet: false });
  };

  const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
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
      await updatePlugin(meta.id, {
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
      const identity = await getBackendSrv().get<AwsIdentity>(awsIdentityUrl(meta.id));
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

  return {
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
  };
}

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
