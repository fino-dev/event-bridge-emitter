import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppRootProps, PluginType } from '@grafana/data';
import { render, waitFor } from '@testing-library/react';
import { listTemplates } from '../../templates/api';
import App from './App';

jest.mock('../../templates/api', () => ({
  errorMessage: jest.fn(() => 'The template request failed'),
  listTemplates: jest.fn(),
}));

describe('Components/App', () => {
  let props: AppRootProps;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(listTemplates).mockResolvedValue([]);

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
      onNavChanged: jest.fn(),
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
