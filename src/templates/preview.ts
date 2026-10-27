import { buildEventDetail } from './api';
import { EventTemplate } from './types';

interface EventPreview {
  region: string;
  eventBusName: string;
  source: string;
  detailType: string;
  detail: Record<string, unknown>;
}

export function buildEventPreview(
  template: EventTemplate,
  detailType: string,
  values: Record<string, unknown>
): EventPreview {
  return {
    region: template.target.region,
    eventBusName: template.target.eventBusName,
    source: template.event.source,
    detailType: detailType.trim() || template.event.detailType,
    detail: buildEventDetail(template, values),
  };
}

export function buildEventCommand(event: EventPreview): string {
  const entries = [
    {
      EventBusName: event.eventBusName,
      Source: event.source,
      DetailType: event.detailType,
      Detail: JSON.stringify(event.detail),
    },
  ];

  return [
    'aws events put-events',
    `  --region ${shellQuote(event.region)}`,
    `  --entries ${shellQuote(JSON.stringify(entries))}`,
  ].join(' \\\n');
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}
