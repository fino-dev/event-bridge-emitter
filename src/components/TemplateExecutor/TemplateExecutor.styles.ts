import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  root: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
    minWidth: 0,
  }),
  header: css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
  }),
  introduction: css({
    flex: '1 1 420px',
    minWidth: 0,
    overflowWrap: 'anywhere',
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
    color: theme.colors.text.secondary,
    background: theme.colors.background.secondary,
    borderLeft: `3px solid ${theme.colors.primary.main}`,
    borderRadius: theme.shape.radius.default,
    overflowWrap: 'anywhere',
    '& > svg': {
      flexShrink: 0,
    },
    '& > span': {
      minWidth: 0,
    },
  }),
  grid: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
    gap: theme.spacing(2),
    alignItems: 'stretch',
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
    gap: theme.spacing(2),
    overflowWrap: 'anywhere',
  }),
  cardDescription: css({
    margin: 0,
  }),
  formBody: css({
    display: 'grid',
    gap: theme.spacing(3),
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
  previewHeading: css({
    '& > span': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(1),
      width: '100%',
      minWidth: 0,
    },
  }),
  previewBody: css({
    display: 'flex',
    flex: '1 1 auto',
    flexDirection: 'column',
    minWidth: 0,
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
});
