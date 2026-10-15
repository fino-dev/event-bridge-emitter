export type AwsAuthType = 'default' | 'credentials' | 'keys' | 'ec2_iam_role';

export interface AwsAuthJsonData {
  authType?: AwsAuthType;
  profile?: string;
  defaultRegion?: string;
  assumeRoleArn?: string;
  externalId?: string;
  [key: string]: string | undefined;
}

export interface AwsIdentity {
  account: string;
  arn: string;
  userId: string;
}

export interface AwsAuthProviderOption {
  value: AwsAuthType;
  label: string;
  description: string;
}

export const awsAuthProviders: AwsAuthProviderOption[] = [
  {
    value: 'ec2_iam_role',
    label: 'Workspace IAM Role',
    description: 'Use the IAM role attached to the machine running Grafana.',
  },
  {
    value: 'default',
    label: 'AWS SDK Default',
    description:
      'Use the credential chain of the Grafana server process. This includes environment variables, the default profile, and an IAM role attached to EC2, ECS, or EKS.',
  },
  {
    value: 'keys',
    label: 'Access & secret key',
    description: 'Store an access key ID and secret access key encrypted in Grafana.',
  },
  {
    value: 'credentials',
    label: 'Credentials file',
    description:
      'Read one profile from the credentials file on the Grafana server. Leave the profile name blank to use the default profile.',
  },
];

const fallbackProviders: AwsAuthType[] = ['default', 'keys', 'credentials'];

export function visibleAuthProviders(allowed: string[] | undefined): AwsAuthProviderOption[] {
  if (!allowed?.length) {
    return awsAuthProviders.filter((provider) => fallbackProviders.includes(provider.value));
  }

  return awsAuthProviders.filter((provider) => allowed.includes(provider.value));
}

export interface AwsAuthFormState {
  authType: AwsAuthType;
  profile: string;
  defaultRegion: string;
  assumeRoleArn: string;
  externalId: string;
  accessKey: string;
  secretKey: string;
  isAccessKeySet: boolean;
  isSecretKeySet: boolean;
  assumeRoleEnabled: boolean;
}

export function buildAwsSettingsUpdate(state: AwsAuthFormState): {
  jsonData: AwsAuthJsonData;
  secureJsonData?: { accessKey?: string; secretKey?: string };
} {
  const jsonData: AwsAuthJsonData = {
    authType: state.authType,
    defaultRegion: state.defaultRegion.trim(),
    assumeRoleArn: state.assumeRoleEnabled ? state.assumeRoleArn.trim() : '',
    externalId: state.assumeRoleEnabled ? state.externalId.trim() : '',
  };
  if (state.authType === 'credentials') {
    jsonData.profile = state.profile.trim();
  }

  const secureJsonData: { accessKey?: string; secretKey?: string } = {};
  if (state.authType === 'keys') {
    if (!state.isAccessKeySet) {
      secureJsonData.accessKey = state.accessKey.trim();
    }
    if (!state.isSecretKeySet) {
      secureJsonData.secretKey = state.secretKey.trim();
    }
  }

  return {
    jsonData,
    secureJsonData: Object.keys(secureJsonData).length > 0 ? secureJsonData : undefined,
  };
}

export function awsIdentityUrl(pluginId: string): string {
  return `/api/plugins/${pluginId}/resources/aws/identity`;
}

export function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } | string }).data;
    if (typeof data === 'string' && data.trim() !== '') {
      return data;
    }
    if (typeof data === 'object' && data?.message) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'AWS authentication failed';
}
