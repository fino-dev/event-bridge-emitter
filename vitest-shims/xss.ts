import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const xss = require('xss') as typeof import('xss');

export const FilterXSS = xss.FilterXSS;
export const escapeAttrValue = xss.escapeAttrValue;
export const getDefaultCSSWhiteList = xss.getDefaultCSSWhiteList;
export const whiteList = xss.whiteList;
export default xss;
