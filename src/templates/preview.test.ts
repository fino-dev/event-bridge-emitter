import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { buildEventCommand, buildEventPreview } from './preview';
import { EventTemplate } from './types';

const template: EventTemplate = {
  id: 'operations',
  name: 'Operations',
  target: { region: 'ap-northeast-1', eventBusName: 'operations' },
  event: {
    source: 'company.operations',
    detailType: 'OperationsRequested',
    fixedDetail: { environment: 'staging', nested: { fixed: true } },
    fields: [
      { key: 'message', label: 'Message', type: 'string', required: false },
      { key: 'count', label: 'Count', type: 'number', required: false, default: 0 },
      { key: 'enabled', label: 'Enabled', type: 'boolean', required: false, default: false },
    ],
  },
};

describe('buildEventPreview', () => {
  test('includes the destination, fixed metadata, fixed detail and current field values', () => {
    expect(buildEventPreview(template, ' CustomRequested ', { message: 'hello' })).toEqual({
      region: 'ap-northeast-1',
      eventBusName: 'operations',
      source: 'company.operations',
      detailType: 'CustomRequested',
      detail: { environment: 'staging', nested: { fixed: true }, message: 'hello', count: 0, enabled: false },
    });
  });

  test('uses the provisioned detail type when the override is blank', () => {
    expect(buildEventPreview(template, ' \t ', {}).detailType).toBe('OperationsRequested');
  });

  test('supports templates without dynamic fields', () => {
    const fixed = { ...template, event: { ...template.event, fields: undefined } };
    expect(buildEventPreview(fixed, '', {}).detail).toEqual(template.event.fixedDetail);
  });
});

describe('buildEventCommand', () => {
  test('passes a complete PutEvents entry with stringified Detail to the AWS CLI', () => {
    const event = buildEventPreview(template, 'CustomRequested', { message: 'hello', count: 7, enabled: true });
    const args = commandArguments(buildEventCommand(event), '/bin/sh');
    expect(args.slice(0, 5)).toEqual(['events', 'put-events', '--region', event.region, '--entries']);
    const [entry] = JSON.parse(args[5]);
    expect(entry).toEqual({
      EventBusName: 'operations',
      Source: 'company.operations',
      DetailType: 'CustomRequested',
      Detail: JSON.stringify(event.detail),
    });
    expect(JSON.parse(entry.Detail)).toEqual(event.detail);
  });

  for (const shell of ['/bin/bash', '/bin/zsh']) {
    test.skipIf(!existsSync(shell))(`preserves quotes, newlines and shell syntax in ${shell}`, () => {
      const text = 'It\'s "quoted" \\ text\n日本語 $EVENT_PREVIEW_TEST $(printf injected) `printf injected`; tail';
      const event = buildEventPreview(template, text, { message: text });
      const args = commandArguments(buildEventCommand(event), shell);
      expect(args).toHaveLength(6);
      expect(args[3]).toBe(event.region);
      const [entry] = JSON.parse(args[5]);
      expect(entry.DetailType).toBe(text);
      expect(JSON.parse(entry.Detail).message).toBe(text);
    });
  }
});

function commandArguments(command: string, shell: string): string[] {
  // Intercept aws locally: verify shell parsing without sending an event.
  return execFileSync(shell, ['-c', `aws() { printf '%s\\000' "$@"; }\n${command}`], {
    encoding: 'utf8',
    env: { ...process.env, EVENT_PREVIEW_TEST: 'expanded' },
  })
    .split('\0')
    .slice(0, -1);
}
