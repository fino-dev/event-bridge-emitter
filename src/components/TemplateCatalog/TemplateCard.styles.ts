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
    gap: theme.spacing(2),
    overflowWrap: 'anywhere',
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
  description: css({
    margin: 0,
  }),
  metadata: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    columnGap: theme.spacing(3),
    rowGap: theme.spacing(2),
    alignItems: 'start',
    margin: 0,
    '& > div': {
      minWidth: 0,
    },
    '@media (max-width: 360px)': {
      gridTemplateColumns: '1fr',
    },
  }),
  detail: css({
    display: 'flex',
    flexDirection: 'column',
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
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    alignSelf: 'stretch',
    minWidth: 0,
  }),
  tag: css({
    minWidth: 0,
    maxWidth: '100%',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
  }),
  actions: css({
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: 'auto',
  }),
});
