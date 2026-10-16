import { config, PluginPage } from '@grafana/runtime';
import { Alert, Badge, Icon, useStyles2 } from '@grafana/ui';
import React, { useCallback, useEffect, useState } from 'react';
import pluginJson from '../plugin.json';
import { TemplateCatalog } from '../components/TemplateCatalog/TemplateCatalog';
import { TemplateExecutor } from '../components/TemplateExecutor/TemplateExecutor';
import { testIds } from '../components/testIds';
import { errorMessage, listTemplates } from '../templates/api';
import { EventTemplate } from '../templates/types';
import { getStyles } from './HomePage.styles';

function HomePage() {
  const styles = useStyles2(getStyles);
  const canExecuteTemplates = config.bootData.user.orgRole === 'Editor' || config.bootData.user.orgRole === 'Admin';
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [executing, setExecuting] = useState<EventTemplate>();

  const loadTemplates = useCallback(async (search: string) => {
    setLoading(true);
    setError(undefined);
    try {
      setTemplates(await listTemplates(pluginJson.id, search));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTemplates(''), 0);
    return () => window.clearTimeout(timer);
  }, [loadTemplates]);

  return (
    <PluginPage>
      <main className={styles.page} data-testid={testIds.homePage.container}>
        <header className={styles.pageHeader}>
          <div className={styles.pageTitleGroup}>
            <div className={styles.eyebrow}>
              <Icon name="cloud" size="sm" />
              Event delivery
            </div>
            <h1 className={styles.pageTitle}>AWS EventBridge Emitter</h1>
            <p className={styles.pageSubtitle}>
              Choose a provisioned template, fill in its event values, and send an event through Grafana.
            </p>
          </div>
          <Badge color="blue" icon="code-branch" text="Provisioned templates" />
        </header>

        {error && (
          <Alert severity="error" title="Template request failed" onRemove={() => setError(undefined)}>
            {error}
          </Alert>
        )}

        {!executing && (
          <TemplateCatalog
            templates={templates}
            query={query}
            loading={loading}
            canExecute={canExecuteTemplates}
            onQueryChange={setQuery}
            onSearch={() => void loadTemplates(query)}
            onUseTemplate={setExecuting}
          />
        )}

        {executing && <TemplateExecutor template={executing} onCancel={() => setExecuting(undefined)} />}
      </main>
    </PluginPage>
  );
}

export default HomePage;
