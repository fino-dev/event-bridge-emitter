import { Badge, Button, Card, Stack, useStyles2 } from '@grafana/ui';
import React from 'react';
import { templateFields } from '../../templates/api';
import { EventTemplate } from '../../templates/types';
import { getStyles } from './TemplateCard.styles';

interface TemplateCardProps {
  template: EventTemplate;
  canExecute: boolean;
  onUse: (template: EventTemplate) => void;
}

export function TemplateCard({ template, canExecute, onUse }: TemplateCardProps) {
  const styles = useStyles2(getStyles);
  const fields = templateFields(template);

  return (
    <Card className={styles.card} noMargin>
      <Card.Heading>
        <div className={styles.title}>{template.name}</div>
      </Card.Heading>
      <Card.Description>{template.description || 'No description provided.'}</Card.Description>
      <Card.Meta className={styles.metadata} separator="">
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Destination</span>
          <strong>
            {template.target.region || '-'} / {template.target.eventBusName || '-'}
          </strong>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Event source</span>
          <strong>{template.event.source || '-'}</strong>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Detail type</span>
          <strong>{template.event.detailType || '-'}</strong>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Fields</span>
          <strong>{fields.length}</strong>
        </div>
      </Card.Meta>
      {template.tags && template.tags.length > 0 && (
        <Card.Tags className={styles.tags}>
          <Stack gap={1} wrap="wrap">
            {template.tags.map((tag) => (
              <Badge key={tag} color="darkgrey" text={tag} />
            ))}
          </Stack>
        </Card.Tags>
      )}
      {canExecute && (
        <Card.Actions className={styles.actions}>
          <Button icon="arrow-right" iconPlacement="right" onClick={() => onUse(template)}>
            Use template
          </Button>
        </Card.Actions>
      )}
    </Card>
  );
}
