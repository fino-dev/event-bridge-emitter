import pluginJson from './plugin.json';

export enum ROUTES {
  Home = 'home',
  Template = 'templates/:templateId',
}

export const homePath = `/a/${pluginJson.id}/${ROUTES.Home}`;
export const templatePath = (id: string) => `/a/${pluginJson.id}/templates/${encodeURIComponent(id)}`;

export function templateIdFromPath(pathname: string): string {
  const encodedId = pathname.replace(/\/+$/, '').split('/').pop() ?? '';
  try {
    return decodeURIComponent(encodedId);
  } catch {
    return encodedId;
  }
}
