import { config, PluginPage } from '@grafana/runtime';
import { Alert, Button, LoadingPlaceholder, useStyles2 } from '@grafana/ui';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TemplateExecutor } from '../components/TemplateExecutor/TemplateExecutor';
import { homePath } from '../constants';
import pluginJson from '../plugin.json';
import { errorMessage, getTemplate } from '../templates/api';
import { EventTemplate } from '../templates/types';
import { getStyles } from './TemplatePage.styles';

function TemplatePage() {
  const { templateId = '' } = useParams<{ templateId: string }>();
  return <TemplateDetails key={templateId} templateId={templateId} />;
}

function TemplateDetails({ templateId }: { templateId: string }) {
  const styles = useStyles2(getStyles);
  const navigate = useNavigate();
  const orgRole = config.bootData?.user?.orgRole;
  const canExecute = orgRole === 'Editor' || orgRole === 'Admin';
  const [result, setResult] = useState<{ template: EventTemplate } | { error: string }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canExecute) {
      return;
    }
    let active = true;
    void getTemplate(pluginJson.id, templateId).then(
      (template) => active && setResult({ template }),
      (error) => active && setResult({ error: errorMessage(error) })
    );
    return () => {
      active = false;
    };
  }, [templateId, attempt, canExecute]);

  const goBack = () => navigate(homePath);

  return (
    <PluginPage
      pageNav={{
        text: pluginJson.name,
        subTitle: pluginJson.info.description,
        url: homePath,
        img: `${config.appSubUrl}/public/plugins/${pluginJson.id}/${pluginJson.info.logos.small}`,
      }}
    >
      <main className={styles.root}>
        {!canExecute ? (
          <>
            <Alert severity="warning" title="Editor role required" bottomSpacing={0}>
              An Editor or Admin role is required to execute templates.
            </Alert>
            <Button variant="secondary" onClick={goBack}>
              Back to templates
            </Button>
          </>
        ) : !result ? (
          <LoadingPlaceholder text="Loading template…" />
        ) : 'error' in result ? (
          <>
            <Alert severity="error" title="Template request failed" bottomSpacing={0}>
              {result.error}
            </Alert>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={goBack}>
                Back to templates
              </Button>
              <Button
                onClick={() => {
                  setResult(undefined);
                  setAttempt((current) => current + 1);
                }}
              >
                Retry
              </Button>
            </div>
          </>
        ) : (
          <TemplateExecutor template={result.template} onCancel={goBack} />
        )}
      </main>
    </PluginPage>
  );
}

export default TemplatePage;
