import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppRootProps, PluginType } from '@grafana/data';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import App from './App';

vi.mock('../../pages/HomePage', () => ({
  default: () => <h2>Available templates</h2>,
}));

describe('Components/App', () => {
  let props: AppRootProps;

  beforeEach(() => {
    props = {
      basename: 'a/sample-app',
      meta: {
        id: 'sample-app',
        name: 'Sample App',
        type: PluginType.app,
        enabled: true,
        jsonData: {},
      },
      query: {},
      path: '',
      onNavChanged: vi.fn(),
    } as unknown as AppRootProps;
  });

  test('renders the EventBridge template catalog route', async () => {
    const { queryByRole } = render(
      <MemoryRouter>
        <App {...props} />
      </MemoryRouter>
    );

    // App lazy-loads the page module, so wait for the route element to render.
    await waitFor(() => expect(queryByRole('heading', { name: 'Available templates' })).toBeInTheDocument(), {
      timeout: 2000,
    });
  });
});
