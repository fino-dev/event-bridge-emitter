import { buildEventDetail } from './api';
import { EventTemplate } from './types';

describe('buildEventDetail', () => {
  test('merges fixed details and preserves false and zero values', () => {
    const template: EventTemplate = {
      id: 'template-1',
      name: 'Example',
      target: { region: 'ap-northeast-1', eventBusName: 'default' },
      event: {
        source: 'company.example',
        detailType: 'Example',
        fixedDetail: { environment: 'staging' },
        fields: [
          { key: 'enabled', label: 'Enabled', type: 'boolean', required: true },
          { key: 'attempt', label: 'Attempt', type: 'number', required: true },
        ],
      },
      version: 1,
    };

    expect(buildEventDetail(template, { enabled: false, attempt: 0 })).toEqual({
      environment: 'staging',
      enabled: false,
      attempt: 0,
    });
  });
});
