import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  section: css({
    minWidth: 0,
  }),
  sectionHeader: css({
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
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
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    whiteSpace: 'nowrap',
  }),
  searchBar: css({
    display: 'flex',
    alignItems: 'flex-end',
    gap: theme.spacing(1),
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
  }),
  searchInput: css({
    flex: 1,
    minWidth: 0,
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
    gap: theme.spacing(2),
    alignItems: 'stretch',
  }),
  templateCard: css({
    height: '100%',
    '&:hover': {
      boxShadow: theme.shadows.z1,
    },
  }),
  cardTitle: css({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  cardMeta: css({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1.5fr) minmax(64px, 0.6fr)',
    gap: theme.spacing(2),
    alignItems: 'start',
    marginTop: theme.spacing(2),
  }),
  detailItem: css({
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
  cardTags: css({
    marginTop: theme.spacing(2),
  }),
  '@media (max-width: 800px)': {
    sectionHeader: {
      alignItems: 'flex-start',
      flexDirection: 'column',
    },
  },
  '@media (max-width: 520px)': {
    searchBar: {
      alignItems: 'stretch',
      flexDirection: 'column',
    },
    searchInput: {
      width: '100%',
    },
    cardMeta: {
      gridTemplateColumns: '1fr 1fr',
    },
  },
});
