import React from 'react';
import { AppPluginMeta, PluginConfigPageProps } from '@grafana/data';
import { AwsAuthJsonData } from '../../aws/settings';
import { AwsAuthForm } from './AwsAuthForm';
import { useAwsAuthSettings } from './useAwsAuthSettings';

export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta<AwsAuthJsonData>> {}

const AppConfig = ({ plugin }: AppConfigProps) => {
  const settings = useAwsAuthSettings(plugin.meta);
  return <AwsAuthForm {...settings} />;
};

export default AppConfig;
