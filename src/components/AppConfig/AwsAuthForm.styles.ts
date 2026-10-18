import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  fieldSpacing: css({
    marginTop: theme.spacing(3),
  }),
});
