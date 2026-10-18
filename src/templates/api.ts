import { lastValueFrom } from 'rxjs';
import { getBackendSrv } from '@grafana/runtime';
import { EventTemplate, ExecutionResponse, ExecutionStatus } from './types';

const templatesUrl = (pluginId: string) => `/api/plugins/${pluginId}/resources/templates`;

async function request<T>(url: string, method: string, data?: unknown): Promise<T> {
  const response = await lastValueFrom(
    getBackendSrv().fetch<T>({
      url,
      method,
      data,
      showErrorAlert: false,
    })
  );
  return response.data;
}

export async function listTemplates(pluginId: string, query = ''): Promise<EventTemplate[]> {
  const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  const response = await request<{ templates: EventTemplate[] }>(`${templatesUrl(pluginId)}${suffix}`, 'GET');
  return response.templates.map(normalizeTemplate);
}

export async function getTemplate(pluginId: string, id: string): Promise<EventTemplate> {
  return normalizeTemplate(await request<EventTemplate>(`${templatesUrl(pluginId)}/${encodeURIComponent(id)}`, 'GET'));
}

export function templateFields(template: EventTemplate) {
  return template.event.fields ?? [];
}

export function executeTemplate(
  pluginId: string,
  id: string,
  detailType: string,
  values: Record<string, unknown>
): Promise<ExecutionResponse> {
  return request<ExecutionResponse>(`${templatesUrl(pluginId)}/${encodeURIComponent(id)}/execute`, 'POST', {
    detailType,
    values,
  });
}

export function errorMessage(error: unknown): string {
  const data = errorData(error);
  if (typeof data === 'string' && data.trim() !== '') {
    return data;
  }
  if (isRecord(data) && typeof data.message === 'string' && data.message.trim() !== '') {
    return data.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'The template request failed';
}

export function executionResponseFromError(error: unknown): ExecutionResponse | undefined {
  const data = errorData(error);
  if (!isRecord(data) || !isExecutionStatus(data.status)) {
    return undefined;
  }

  return {
    status: data.status,
    eventId: typeof data.eventId === 'string' ? data.eventId : undefined,
    errorCode: typeof data.errorCode === 'string' ? data.errorCode : undefined,
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
    message: typeof data.message === 'string' ? data.message : undefined,
  };
}

function errorData(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    return (error as { data?: unknown }).data;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isExecutionStatus(value: unknown): value is ExecutionStatus {
  return value === 'accepted' || value === 'failed' || value === 'unknown';
}

export function buildEventDetail(template: EventTemplate, values: Record<string, unknown>): Record<string, unknown> {
  const detail = { ...template.event.fixedDetail };
  for (const field of templateFields(template)) {
    const value = values[field.key] ?? field.default;
    if (value !== undefined) {
      detail[field.key] = value;
    }
  }
  return detail;
}

function normalizeTemplate(template: EventTemplate): EventTemplate {
  return {
    ...template,
    event: {
      ...template.event,
      fields: templateFields(template),
    },
  };
}
