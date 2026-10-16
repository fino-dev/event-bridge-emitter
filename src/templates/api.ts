import { lastValueFrom } from 'rxjs';
import { getBackendSrv } from '@grafana/runtime';
import { EventTemplate, ExecutionResponse } from './types';

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
  return response.templates;
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
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: { message?: string } | string }).data;
    if (typeof data === 'string' && data.trim() !== '') {
      return data;
    }
    if (typeof data === 'object' && data?.message) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'The template request failed';
}

export function buildEventDetail(template: EventTemplate, values: Record<string, unknown>): Record<string, unknown> {
  const detail = { ...template.event.fixedDetail };
  for (const field of template.event.fields) {
    const value = values[field.key] ?? field.default;
    if (value !== undefined) {
      detail[field.key] = value;
    }
  }
  return detail;
}
