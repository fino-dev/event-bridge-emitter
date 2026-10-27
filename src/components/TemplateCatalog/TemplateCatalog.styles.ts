import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  root: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    minWidth: 0,
  }),
  header: css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
  }),
  intro: css({
    flex: '1 1 420px',
    minWidth: 0,
  }),
  title: css({
    margin: 0,
    fontSize: theme.typography.h2.fontSize,
    lineHeight: 1.3,
  }),
  description: css({
    margin: theme.spacing(0.75, 0, 0),
    color: theme.colors.text.secondary,
  }),
  resultCount: css({
    flexShrink: 0,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    whiteSpace: 'nowrap',
  }),
  searchBar: css({
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    '@media (max-width: 520px)': {
      alignItems: 'stretch',
      flexDirection: 'column',
    },
  }),
  searchInput: css({
    flex: '1 1 320px',
    minWidth: 0,
    '@media (max-width: 520px)': {
      flexBasis: 'auto',
      width: '100%',
    },
  }),
  searchButton: css({
    flexShrink: 0,
    '@media (max-width: 520px)': {
      width: '100%',
    },
  }),
  loadingState: css({
    minHeight: 160,
    display: 'grid',
    placeItems: 'center',
    padding: theme.spacing(3),
    border: `1px dashed ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
  }),
  emptyState: css({
    padding: theme.spacing(3),
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    textAlign: 'center',
  }),
  list: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
    gap: theme.spacing(2),
    alignItems: 'stretch',
  }),
});
