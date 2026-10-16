import { config, PluginPage } from '@grafana/runtime';
import { Alert, Button, useStyles2 } from '@grafana/ui';
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
        {error && (
          <Alert
            severity="error"
            title="Template request failed"
            bottomSpacing={2}
            action={
              <Button size="sm" variant="secondary" onClick={() => void loadTemplates(query)}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {!executing && !error && (
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
