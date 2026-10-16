import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  page: css({
    maxWidth: 1200,
    margin: '0 auto',
    padding: theme.spacing(0, 2, 6),
  }),
  pageHeader: css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing(3),
    marginBottom: theme.spacing(5),
  }),
  pageTitleGroup: css({
    minWidth: 0,
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
  pageTitle: css({
    margin: theme.spacing(1, 0, 0),
    fontSize: theme.typography.h1.fontSize,
    lineHeight: 1.2,
  }),
  pageSubtitle: css({
    maxWidth: 720,
    margin: theme.spacing(1, 0, 0),
    color: theme.colors.text.secondary,
    fontSize: theme.typography.body.fontSize,
  }),
  '@media (max-width: 800px)': {
    pageHeader: {
      flexDirection: 'column',
      marginBottom: theme.spacing(4),
    },
  },
  '@media (max-width: 520px)': {
    page: {
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
    },
  },
});
