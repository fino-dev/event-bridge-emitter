import React from 'react';
import { Field, Input, SecretInput } from '@grafana/ui';
import { AwsAuthType } from '../../../aws/settings';
import { testIds } from '../../testIds';
import { AuthFieldChangeHandler } from '../useAwsAuthSettings';

interface AuthCredentialFieldsProps {
  authType: AwsAuthType;
  profile: string;
  accessKey: string;
  secretKey: string;
  isAccessKeySet: boolean;
  isSecretKeySet: boolean;
  onChange: AuthFieldChangeHandler;
  onResetAccessKey: () => void;
  onResetSecretKey: () => void;
}

export function AuthCredentialFields({
  authType,
  profile,
  accessKey,
  secretKey,
  isAccessKeySet,
  isSecretKeySet,
  onChange,
  onResetAccessKey,
  onResetSecretKey,
}: AuthCredentialFieldsProps) {
  if (authType === 'credentials') {
    return (
      <Field
        noMargin
        label="Credentials Profile Name"
        description="Profile name in the Grafana server credentials file. Leave blank to use the default profile."
        htmlFor="config-profile"
      >
        <Input
          id="config-profile"
          name="profile"
          data-testid={testIds.appConfig.profile}
          value={profile}
          placeholder="default"
          onChange={onChange}
        />
      </Field>
    );
  }

  if (authType === 'keys') {
    return (
      <>
        <Field noMargin label="Access Key ID" htmlFor="config-access-key">
          <SecretInput
            id="config-access-key"
            name="accessKey"
            data-testid={testIds.appConfig.accessKey}
            value={accessKey}
            isConfigured={isAccessKeySet}
            placeholder="AKIA..."
            onChange={onChange}
            onReset={onResetAccessKey}
          />
        </Field>
        <Field noMargin label="Secret Access Key" htmlFor="config-secret-key">
          <SecretInput
            id="config-secret-key"
            name="secretKey"
            data-testid={testIds.appConfig.secretKey}
            value={secretKey}
            isConfigured={isSecretKeySet}
            placeholder="Secret access key"
            onChange={onChange}
            onReset={onResetSecretKey}
          />
        </Field>
      </>
    );
  }

  return null;
}
