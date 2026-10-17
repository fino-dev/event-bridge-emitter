import { EmptyState, Button, Icon, Input, LoadingPlaceholder, useStyles2 } from '@grafana/ui';
import React from 'react';
import { EventTemplate } from '../../templates/types';
import { getStyles } from './TemplateCatalog.styles';
import { TemplateCard } from './TemplateCard';

interface TemplateCatalogProps {
  templates: EventTemplate[];
  query: string;
  loading: boolean;
  canExecute: boolean;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onUseTemplate: (template: EventTemplate) => void;
}

export function TemplateCatalog({
  templates,
  query,
  loading,
  canExecute,
  onQueryChange,
  onSearch,
  onUseTemplate,
}: TemplateCatalogProps) {
  const styles = useStyles2(getStyles);

  return (
    <section className={styles.section} aria-labelledby="templates-heading">
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIntro}>
          <h2 id="templates-heading" className={styles.sectionTitle}>
            Available templates
          </h2>
          <p className={styles.sectionDescription}>
            Templates are managed by Grafana provisioning and are read-only here.
          </p>
        </div>
        {!loading && templates.length > 0 && (
          <span className={styles.resultCount}>
            {templates.length} {templates.length === 1 ? 'template' : 'templates'}
          </span>
        )}
      </div>

      <div className={styles.searchBar}>
        <div className={styles.searchInput}>
          <Input
            aria-label="Search templates"
            prefix={<Icon name="search" />}
            value={query}
            placeholder="Search by name, tag, bus, source, or detail type"
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSearch();
              }
            }}
          />
        </div>
        <Button className={styles.searchBarButton} icon="search" onClick={onSearch}>
          Search
        </Button>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <LoadingPlaceholder text="Loading provisioned templates…" />
        </div>
      ) : templates.length === 0 ? (
        <div className={styles.emptyState}>
          <EmptyState
            variant="not-found"
            message={query ? 'No templates match your search' : 'No provisioned templates'}
          >
            <p>
              {query
                ? 'Try a different search term.'
                : 'Ask an administrator to add templates to the Grafana app provisioning configuration.'}
            </p>
          </EmptyState>
        </div>
      ) : (
        <div className={styles.templateList}>
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} canExecute={canExecute} onUse={onUseTemplate} />
          ))}
        </div>
      )}
    </section>
  );
}
