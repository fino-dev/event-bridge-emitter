import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  executor: css({
    minWidth: 0,
  }),
  executorHeader: css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing(3),
    marginBottom: theme.spacing(3),
  }),
  executorTitleGroup: css({
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
  executorTitle: css({
    margin: theme.spacing(1, 0, 0),
    fontSize: theme.typography.h2.fontSize,
    lineHeight: 1.3,
  }),
  sectionDescription: css({
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
  executorGrid: css({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)',
    gap: theme.spacing(2),
    alignItems: 'start',
  }),
  executorCard: css({
    height: '100%',
  }),
  formBody: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
    marginTop: theme.spacing(2),
  }),
  previewBody: css({
    marginTop: theme.spacing(2),
    '& textarea': {
      minHeight: 360,
      fontFamily: theme.typography.fontFamilyMonospace,
      fontSize: theme.typography.bodySmall.fontSize,
      lineHeight: 1.5,
    },
  }),
  '@media (max-width: 800px)': {
    executorHeader: {
      flexDirection: 'column',
    },
    executorGrid: {
      gridTemplateColumns: '1fr',
    },
  },
});
