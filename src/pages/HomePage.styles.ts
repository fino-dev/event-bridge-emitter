import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  page: css({
    maxWidth: 1200,
    margin: '0 auto',
    padding: theme.spacing(0, 2, 6),
  }),
  '@media (max-width: 520px)': {
    page: {
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
    },
  },
});
