import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  card: css({
    // Keep Card content in one vertical flow when Grafana's refreshed Card
    // grid has no Figure column.
    '&&': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    minWidth: 0,
    height: '100%',
    '&:hover': {
      boxShadow: theme.shadows.z1,
    },
  }),
  title: css({
    display: '-webkit-box',
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflowWrap: 'anywhere',
  }),
  metadata: css({
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: theme.spacing(3),
    rowGap: theme.spacing(2),
    alignItems: 'start',
    marginTop: theme.spacing(2),
  }),
  detail: css({
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 140px',
    minWidth: 0,
    gap: theme.spacing(0.5),
    overflowWrap: 'anywhere',
    '& strong': {
      color: theme.colors.text.primary,
      fontWeight: theme.typography.fontWeightMedium,
    },
  }),
  detailLabel: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  tags: css({
    marginTop: theme.spacing(2),
  }),
  actions: css({
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: 'auto',
  }),
});
