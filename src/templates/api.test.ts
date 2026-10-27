import { describe, expect, test } from 'vitest';

import { buildEventDetail, executionResponseFromError, templateFields } from './api';
import { EventTemplate } from './types';

const templateWithoutFields: EventTemplate = {
  id: 'iceberg-migration',
  name: 'Iceberg migration',
  target: {
    region: 'ap-northeast-1',
    eventBusName: 'operations',
  },
  event: {
    source: 'company.iceberg',
    detailType: 'MigrationRequested',
    fixedDetail: { migration: 'iceberg' },
  },
};

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
    };

    expect(buildEventDetail(template, { enabled: false, attempt: 0 })).toEqual({
      environment: 'staging',
      enabled: false,
      attempt: 0,
    });
  });

  test('keeps optional empty strings in the preview', () => {
    const template: EventTemplate = {
      id: 'template-2',
      name: 'Example',
      target: { region: 'ap-northeast-1', eventBusName: 'default' },
      event: {
        source: 'company.example',
        detailType: 'Example',
        fixedDetail: {},
        fields: [{ key: 'comment', label: 'Comment', type: 'string', required: false }],
      },
    };

    expect(buildEventDetail(template, { comment: '' })).toEqual({ comment: '' });
  });

  test('builds the fixed event detail when a template omits fields', () => {
    expect(buildEventDetail(templateWithoutFields, {})).toEqual({ migration: 'iceberg' });
  });
});

describe('templateFields', () => {
  test('treats an omitted fields response as an empty array', () => {
    expect(templateFields(templateWithoutFields)).toEqual([]);
  });
});

describe('executionResponseFromError', () => {
  test('preserves structured unknown delivery status from a failed request', () => {
    expect(
      executionResponseFromError({
        data: {
          status: 'unknown',
          message: 'The event may have been accepted.',
        },
      })
    ).toEqual({
      status: 'unknown',
      eventId: undefined,
      errorCode: undefined,
      errorMessage: undefined,
      message: 'The event may have been accepted.',
    });
  });

  test('ignores ordinary request errors', () => {
    expect(executionResponseFromError({ data: { message: 'not found' } })).toBeUndefined();
  });
});
