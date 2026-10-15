import { buildAwsSettingsUpdate, visibleAuthProviders } from './settings';

describe('visibleAuthProviders', () => {
  test('uses the open-source default providers when the server does not restrict them', () => {
    expect(visibleAuthProviders(undefined).map((provider) => provider.value)).toEqual([
      'default',
      'keys',
      'credentials',
    ]);
  });

  test('hides providers the Grafana server does not allow, including Grafana Assume Role', () => {
    expect(visibleAuthProviders(['keys', 'grafana_assume_role']).map((provider) => provider.value)).toEqual(['keys']);
  });
});

  test('does not expose the redundant workspace IAM role provider', () => {
    expect(visibleAuthProviders(['ec2_iam_role'])).toEqual([]);
  });
});

describe('buildAwsSettingsUpdate', () => {
  const base = {
    authType: 'credentials' as const,
    profile: ' dev ',
    defaultRegion: ' ap-northeast-1 ',
    assumeRoleArn: ' arn:aws:iam::123456789012:role/Grafana ',
    externalId: ' external ',
    accessKey: '',
    secretKey: '',
    isAccessKeySet: false,
    isSecretKeySet: false,
    assumeRoleEnabled: true,
  };

  test('stores the profile and optional role for the credentials provider', () => {
    expect(buildAwsSettingsUpdate(base)).toEqual({
      jsonData: {
        authType: 'credentials',
        profile: 'dev',
        defaultRegion: 'ap-northeast-1',
        assumeRoleArn: 'arn:aws:iam::123456789012:role/Grafana',
        externalId: 'external',
      },
      secureJsonData: undefined,
    });
  });

  test('sends a key only when it is not already configured', () => {
    expect(
      buildAwsSettingsUpdate({
        ...base,
        authType: 'keys',
        accessKey: ' AKIA ',
        secretKey: '',
        isSecretKeySet: true,
      })
    ).toEqual({
      jsonData: {
        authType: 'keys',
        defaultRegion: 'ap-northeast-1',
        assumeRoleArn: 'arn:aws:iam::123456789012:role/Grafana',
        externalId: 'external',
      },
      secureJsonData: { accessKey: 'AKIA' },
    });
  });

  test('clears assume role fields when the server disables role assumption', () => {
    expect(buildAwsSettingsUpdate({ ...base, assumeRoleEnabled: false }).jsonData).toMatchObject({
      assumeRoleArn: '',
      externalId: '',
    });
  });
});
