import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const momentTimezone = require('moment-timezone') as typeof import('moment-timezone');

export const tz = momentTimezone.tz;
export default momentTimezone;
