import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  root: css({
    minWidth: 0,
  }),
  header: css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing(3),
    marginBottom: theme.spacing(3),
  }),
  titleGroup: css({
    marginTop: theme.spacing(3),
  }),
  eyebrow: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  }),
  title: css({
    margin: theme.spacing(1, 0, 0),
    fontSize: theme.typography.h2.fontSize,
    lineHeight: 1.3,
  }),
  description: css({
    margin: theme.spacing(0.75, 0, 0),
    color: theme.colors.text.secondary,
  }),
  destinationNotice: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5, 2),
    marginBottom: theme.spacing(2),
    color: theme.colors.text.secondary,
    background: theme.colors.background.secondary,
    borderLeft: `3px solid ${theme.colors.primary.main}`,
    borderRadius: theme.shape.radius.default,
  }),
  grid: css({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)',
    gap: theme.spacing(2),
    alignItems: 'start',
  }),
  card: css({
    // Grafana's refreshed Card uses a named grid with an optional Figure
    // column. These cards do not have a Figure, so keep their content in a
    // predictable vertical flow instead of letting children auto-place into
    // the empty column.
    '&&': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    minWidth: 0,
    height: '100%',
  }),
  formBody: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
    marginTop: theme.spacing(2),
  }),
  previewBody: css({
    display: 'flex',
    flex: '1 1 auto',
    flexDirection: 'column',
    minWidth: 0,
    marginTop: theme.spacing(2),
    '& textarea': {
      width: '100%',
      flex: '1 1 auto',
      boxSizing: 'border-box',
      minHeight: 360,
      fontFamily: theme.typography.fontFamilyMonospace,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: 1.5,
    },
  }),
  actions: css({
    marginTop: 'auto',
  }),
  '@media (max-width: 800px)': {
    header: {
      flexDirection: 'column',
    },
    grid: {
      gridTemplateColumns: '1fr',
    },
  },
});
