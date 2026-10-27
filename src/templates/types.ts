export type TemplateFieldType = 'string' | 'number' | 'boolean' | 'select' | 'json';

export interface TemplateTarget {
  region: string;
  eventBusName: string;
}

export interface TemplateField {
  key: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
  default?: unknown;
  options?: string[];
}

export interface TemplateEvent {
  source: string;
  detailType: string;
  fixedDetail: Record<string, unknown>;
  fields?: TemplateField[];
}

export interface EventTemplate {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  target: TemplateTarget;
  event: TemplateEvent;
}

export type ExecutionStatus = 'accepted' | 'failed' | 'unknown';

export interface ExecutionResponse {
  status: ExecutionStatus;
  eventId?: string;
  errorCode?: string;
  errorMessage?: string;
  message?: string;
}
