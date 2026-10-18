import { Badge, Button, Card, Stack, useStyles2 } from '@grafana/ui';
import React from 'react';
import { templateFields } from '../../templates/api';
import { EventTemplate } from '../../templates/types';
import { getStyles } from './TemplateCatalog.styles';

interface TemplateCardProps {
  template: EventTemplate;
  canExecute: boolean;
  onUse: (template: EventTemplate) => void;
}

export function TemplateCard({ template, canExecute, onUse }: TemplateCardProps) {
  const styles = useStyles2(getStyles);
  const fields = templateFields(template);

  return (
    <Card className={styles.templateCard} noMargin>
      <Card.Heading>
        <div className={styles.cardTitle}>{template.name}</div>
      </Card.Heading>
      <Card.Description>{template.description || 'No description provided.'}</Card.Description>
      <Card.Meta className={styles.cardMeta} separator="">
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Destination</span>
          <strong>
            {template.target.region} / {template.target.eventBusName}
          </strong>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Event</span>
          <strong>{template.event.source}</strong>
          <span>{template.event.detailType}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Fields</span>
          <strong>{fields.length}</strong>
          <span>{fields.length === 1 ? 'input' : 'inputs'}</span>
        </div>
      </Card.Meta>
      {template.tags && template.tags.length > 0 && (
        <Card.Tags className={styles.cardTags}>
          <Stack gap={1} wrap="wrap">
            {template.tags.map((tag) => (
              <Badge key={tag} color="darkgrey" text={tag} />
            ))}
          </Stack>
        </Card.Tags>
      )}
      {canExecute && (
        <Card.Actions className={styles.cardActions}>
          <Button icon="arrow-right" iconPlacement="right" onClick={() => onUse(template)}>
            Use template
          </Button>
        </Card.Actions>
      )}
    </Card>
  );
}
