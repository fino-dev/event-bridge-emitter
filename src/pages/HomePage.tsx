import React from 'react';
import { PluginPage } from '@grafana/runtime';
import { testIds } from '../components/testIds';

function HomePage() {
  return (
    <PluginPage>
      <div data-testid={testIds.homePage.container}>
        <h1>AWS EventBridge Emitter</h1>
      </div>
    </PluginPage>
  );
}

export default HomePage;
