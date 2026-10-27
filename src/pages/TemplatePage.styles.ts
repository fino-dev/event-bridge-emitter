import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  root: css({
    width: '100%',
    maxWidth: 1200,
    minWidth: 0,
    boxSizing: 'border-box',
    margin: '0 auto',
    padding: theme.spacing(3, 2, 6),
    display: 'grid',
    gap: theme.spacing(2),
    '@media (max-width: 520px)': {
      padding: theme.spacing(2, 1, 4),
    },
  }),
  actions: css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  }),
});
