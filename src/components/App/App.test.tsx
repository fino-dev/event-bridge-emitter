import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppRootProps, PluginType } from '@grafana/data';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { listTemplates } from '../../templates/api';
import App from './App';

vi.mock('@grafana/runtime', async () => {
  const actual = await vi.importActual<typeof import('@grafana/runtime')>('@grafana/runtime');

  return {
    ...actual,
    PluginPage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('../../templates/api', () => ({
  errorMessage: vi.fn(() => 'The template request failed'),
  listTemplates: vi.fn(),
}));

describe('Components/App', () => {
  let props: AppRootProps;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listTemplates).mockResolvedValue([]);

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

  test('renders the EventBridge template catalog', async () => {
    const { queryByRole } = render(
      <MemoryRouter>
        <App {...props} />
      </MemoryRouter>
    );

    // Application is lazy loaded, so we need to wait for the component and routes to be rendered
    await waitFor(() => expect(queryByRole('heading', { name: 'Available templates' })).toBeInTheDocument(), {
      timeout: 2000,
    });
  });
});
