import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  root: css({
    width: '100%',
    maxWidth: 600,
    minWidth: 0,
  }),
  fieldSet: css({
    minWidth: 0,
    margin: 0,
  }),
  fields: css({
    display: 'grid',
    gap: theme.spacing(2),
    minWidth: 0,
  }),
});
