import React from 'react';
import { Alert, Combobox, Field, type ComboboxOption } from '@grafana/ui';
import { AwsAuthType } from '../../../aws/settings';
import { AuthProviderOption } from '../useAwsAuthSettings';

interface AuthenticationProviderFieldProps {
  providers: AuthProviderOption[];
  selectedProvider: AuthProviderOption | undefined;
  onAuthTypeChange: (option: ComboboxOption<AwsAuthType>) => void;
}

export function AuthenticationProviderField({
  providers,
  selectedProvider,
  onAuthTypeChange,
}: AuthenticationProviderFieldProps) {
  if (providers.length === 0 || !selectedProvider) {
    return (
      <Alert severity="warning" title="No supported authentication provider">
        This Grafana server only allows Grafana Assume Role. This plugin cannot use that provider. Enable AWS SDK
        Default, Credentials file, or Access & secret key in the server AWS settings.
      </Alert>
    );
  }

  return (
    <Field label="Authentication Provider" description={selectedProvider.description} htmlFor="config-auth-type">
      <Combobox
        id="config-auth-type"
        width={60}
        options={providers}
        value={selectedProvider}
        onChange={onAuthTypeChange}
      />
    </Field>
  );
}
