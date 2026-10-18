import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  root: css({
    width: '100%',
    maxWidth: 1200,
    boxSizing: 'border-box',
    margin: '0 auto',
    padding: theme.spacing(3, 2, 6),
  }),
  '@media (max-width: 520px)': {
    root: {
      padding: theme.spacing(2, 1, 4),
    },
  },
});
