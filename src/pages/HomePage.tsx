import React from 'react';
import { PluginPage } from '@grafana/runtime';
import { testIds } from '../components/testIds';

function HomePage() {
  return (
    <PluginPage>
      <div data-testid={testIds.homePage.container}>
        hoge
      </div>
    </PluginPage>
  );
}

export default HomePage;
