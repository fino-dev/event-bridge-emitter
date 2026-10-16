import React from 'react';
import { render, screen } from '@testing-library/react';
import { PluginType } from '@grafana/data';
import { config } from '@grafana/runtime';
import AppConfig, { AppConfigProps } from './AppConfig';
import { testIds } from 'components/testIds';

describe('Components/AppConfig', () => {
  let props: AppConfigProps;
  const originalProviders = config.awsAllowedAuthProviders;
  const originalAssumeRole = config.awsAssumeRoleEnabled;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      return { measureText: () => ({ width: 0 }) } as unknown as CanvasRenderingContext2D;
    });
    config.awsAllowedAuthProviders = ['default', 'keys', 'credentials'];
    config.awsAssumeRoleEnabled = true;

    props = {
      plugin: {
        meta: {
          id: 'sample-app',
          name: 'Sample App',
          type: PluginType.app,
          enabled: true,
          jsonData: { authType: 'default', defaultRegion: 'ap-northeast-1' },
        },
      },
      query: {},
    } as unknown as AppConfigProps;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    config.awsAllowedAuthProviders = originalProviders;
    config.awsAssumeRoleEnabled = originalAssumeRole;
  });

  test('renders AWS authentication fields', () => {
    render(<AppConfig plugin={props.plugin} query={props.query} />);

    expect(screen.queryByRole('group', { name: /aws authentication/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/authentication provider/i)).toBeInTheDocument();
    expect(screen.queryByTestId(testIds.appConfig.defaultRegion)).toHaveValue('ap-northeast-1');
    expect(screen.queryByTestId(testIds.appConfig.templateTableName)).toBeInTheDocument();
    expect(screen.queryByTestId(testIds.appConfig.templateTableRegion)).toBeInTheDocument();
    expect(screen.queryByTestId(testIds.appConfig.assumeRoleArn)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save and test/i })).toBeInTheDocument();
  });
});
