import pluginJson from './plugin.json';

export enum ROUTES {
  Home = 'home',
  Template = 'templates/:templateId',
}

export const homePath = `/a/${pluginJson.id}/${ROUTES.Home}`;
export const templatePath = (id: string) => `/a/${pluginJson.id}/templates/${encodeURIComponent(id)}`;
