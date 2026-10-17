import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  section: css({
    minWidth: 0,
  }),
  sectionHeader: css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  }),
  sectionIntro: css({
    flex: '1 1 420px',
    minWidth: 0,
  }),
  sectionTitle: css({
    margin: 0,
    fontSize: theme.typography.h2.fontSize,
    lineHeight: 1.3,
  }),
  sectionDescription: css({
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
    marginBottom: theme.spacing(2),
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    '& > button': {
      flexShrink: 0,
    },
  }),
  searchInput: css({
    flex: '1 1 320px',
    minWidth: 0,
  }),
  searchBarButton: css({
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
  templateList: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
    gap: theme.spacing(2),
    alignItems: 'stretch',
  }),
  templateCard: css({
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
  cardTitle: css({
    display: '-webkit-box',
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflowWrap: 'anywhere',
  }),
  cardMeta: css({
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: theme.spacing(3),
    rowGap: theme.spacing(2),
    alignItems: 'start',
    marginTop: theme.spacing(2),
  }),
  detailItem: css({
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
  cardTags: css({
    marginTop: theme.spacing(2),
  }),
  cardActions: css({
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: 'auto',
  }),
  '@media (max-width: 800px)': {
    sectionHeader: {
      gap: theme.spacing(1),
    },
  },
  '@media (max-width: 520px)': {
    searchBar: {
      alignItems: 'stretch',
      flexDirection: 'column',
    },
    searchInput: {
      flexBasis: 'auto',
      width: '100%',
    },
  },
});
