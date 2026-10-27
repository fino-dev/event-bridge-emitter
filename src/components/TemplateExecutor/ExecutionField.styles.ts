import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  root: css({
    minWidth: 0,
    maxWidth: '100%',
  }),
  checkbox: css({
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    alignItems: 'center',
    gap: theme.spacing(1),
    minWidth: 0,
    '& > div': {
      marginBottom: 0,
      minWidth: 0,
    },
  }),
  label: css({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: theme.spacing(0.5, 1),
    minWidth: 0,
    overflowWrap: 'anywhere',
  }),
  name: css({
    minWidth: 0,
  }),
  type: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightRegular,
    fontFamily: theme.typography.fontFamilyMonospace,
  }),
});
