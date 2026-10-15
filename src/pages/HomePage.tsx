import React from 'react';
import { PluginPage } from '@grafana/runtime';
import { testIds } from '../components/testIds';

function HomePage() {
  return (
    <PluginPage>
      <div data-testid={testIds.homePage.container}>
        <h1>AWS EventBridge Emitter</h1>
        <p>Configure and verify AWS authentication on the Configuration page.</p>
      </div>
    </PluginPage>
  );
}

export default HomePage;
