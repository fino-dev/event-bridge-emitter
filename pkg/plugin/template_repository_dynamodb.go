package plugin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type dynamoDBAPI interface {
	GetItem(ctx context.Context, params *dynamodb.GetItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error)
	PutItem(ctx context.Context, params *dynamodb.PutItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.PutItemOutput, error)
	Query(ctx context.Context, params *dynamodb.QueryInput, optFns ...func(*dynamodb.Options)) (*dynamodb.QueryOutput, error)
	DeleteItem(ctx context.Context, params *dynamodb.DeleteItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.DeleteItemOutput, error)
}

type dynamoTemplateRepository struct {
	client    dynamoDBAPI
	tableName string
}

type dynamoTemplateItem struct {
	OrgID        string   `dynamodbav:"orgId"`
	ID           string   `dynamodbav:"id"`
	Name         string   `dynamodbav:"name"`
	Description  string   `dynamodbav:"description"`
	Tags         []string `dynamodbav:"tags"`
	Region       string   `dynamodbav:"region"`
	EventBusName string   `dynamodbav:"eventBusName"`
	Source       string   `dynamodbav:"source"`
	DetailType   string   `dynamodbav:"detailType"`
	FixedDetail  string   `dynamodbav:"fixedDetail"`
	Fields       string   `dynamodbav:"fields"`
	Version      int64    `dynamodbav:"version"`
	CreatedAt    string   `dynamodbav:"createdAt"`
	UpdatedAt    string   `dynamodbav:"updatedAt"`
}

func (r *dynamoTemplateRepository) List(ctx context.Context, orgID int64, query string) ([]Template, error) {
	var result []Template
	var startKey map[string]types.AttributeValue
	for {
		output, err := r.client.Query(ctx, &dynamodb.QueryInput{
			TableName:                 aws.String(r.tableName),
			KeyConditionExpression:    aws.String("orgId = :orgId"),
			ExpressionAttributeValues: map[string]types.AttributeValue{":orgId": &types.AttributeValueMemberS{Value: orgKey(orgID)}},
			ExclusiveStartKey:         startKey,
		})
		if err != nil {
			return nil, fmt.Errorf("query templates: %w", err)
		}
		for _, item := range output.Items {
			template, err := decodeDynamoTemplate(item)
			if err != nil {
				return nil, err
			}
			if matchesTemplateQuery(template, query) {
				result = append(result, template)
			}
		}
		if len(output.LastEvaluatedKey) == 0 {
			break
		}
		startKey = output.LastEvaluatedKey
	}
	sortedTemplates(result)
	return result, nil
}

func (r *dynamoTemplateRepository) Get(ctx context.Context, orgID int64, id string) (Template, error) {
	output, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key:       templateKey(orgID, id),
	})
	if err != nil {
		return Template{}, fmt.Errorf("get template: %w", err)
	}
	if len(output.Item) == 0 {
		return Template{}, ErrTemplateNotFound
	}
	return decodeDynamoTemplate(output.Item)
}

func (r *dynamoTemplateRepository) Create(ctx context.Context, orgID int64, template Template) (Template, error) {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	template.Version = 1
	template.CreatedAt = now
	template.UpdatedAt = now
	item, err := encodeDynamoTemplate(orgID, template)
	if err != nil {
		return Template{}, err
	}
	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.tableName),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(orgId) AND attribute_not_exists(id)"),
	})
	if err != nil {
		if isConditionalCheckFailed(err) {
			return Template{}, ErrTemplateConflict
		}
		return Template{}, fmt.Errorf("create template: %w", err)
	}
	return template, nil
}

func (r *dynamoTemplateRepository) Update(ctx context.Context, orgID int64, id string, template Template, expectedVersion int64) (Template, error) {
	current, err := r.Get(ctx, orgID, id)
	if err != nil {
		return Template{}, err
	}
	template.ID = id
	template.Version = current.Version + 1
	template.CreatedAt = current.CreatedAt
	template.UpdatedAt = time.Now().UTC().Format(time.RFC3339Nano)
	item, err := encodeDynamoTemplate(orgID, template)
	if err != nil {
		return Template{}, err
	}
	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.tableName),
		Item:                item,
		ConditionExpression: aws.String("version = :expectedVersion"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":expectedVersion": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", expectedVersion)},
		},
	})
	if err != nil {
		if isConditionalCheckFailed(err) {
			return Template{}, ErrTemplateConflict
		}
		return Template{}, fmt.Errorf("update template: %w", err)
	}
	return template, nil
}

func (r *dynamoTemplateRepository) Delete(ctx context.Context, orgID int64, id string) error {
	_, err := r.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName:           aws.String(r.tableName),
		Key:                 templateKey(orgID, id),
		ConditionExpression: aws.String("attribute_exists(orgId) AND attribute_exists(id)"),
	})
	if err != nil {
		if isConditionalCheckFailed(err) {
			return ErrTemplateNotFound
		}
		return fmt.Errorf("delete template: %w", err)
	}
	return nil
}

func encodeDynamoTemplate(orgID int64, template Template) (map[string]types.AttributeValue, error) {
	fixedDetail, err := json.Marshal(template.Event.FixedDetail)
	if err != nil {
		return nil, fmt.Errorf("encode fixed detail: %w", err)
	}
	fields, err := json.Marshal(template.Event.Fields)
	if err != nil {
		return nil, fmt.Errorf("encode template fields: %w", err)
	}
	return attributevalue.MarshalMap(dynamoTemplateItem{
		OrgID:        orgKey(orgID),
		ID:           template.ID,
		Name:         template.Name,
		Description:  template.Description,
		Tags:         template.Tags,
		Region:       template.Target.Region,
		EventBusName: template.Target.EventBusName,
		Source:       template.Event.Source,
		DetailType:   template.Event.DetailType,
		FixedDetail:  string(fixedDetail),
		Fields:       string(fields),
		Version:      template.Version,
		CreatedAt:    template.CreatedAt,
		UpdatedAt:    template.UpdatedAt,
	})
}

func decodeDynamoTemplate(item map[string]types.AttributeValue) (Template, error) {
	var stored dynamoTemplateItem
	if err := attributevalue.UnmarshalMap(item, &stored); err != nil {
		return Template{}, fmt.Errorf("decode template: %w", err)
	}
	var fixedDetail map[string]any
	if err := json.Unmarshal([]byte(stored.FixedDetail), &fixedDetail); err != nil {
		return Template{}, fmt.Errorf("decode fixed detail: %w", err)
	}
	var fields []TemplateField
	if err := json.Unmarshal([]byte(stored.Fields), &fields); err != nil {
		return Template{}, fmt.Errorf("decode template fields: %w", err)
	}
	return Template{
		ID:          stored.ID,
		Name:        stored.Name,
		Description: stored.Description,
		Tags:        stored.Tags,
		Target:      TemplateTarget{Region: stored.Region, EventBusName: stored.EventBusName},
		Event:       TemplateEvent{Source: stored.Source, DetailType: stored.DetailType, FixedDetail: fixedDetail, Fields: fields},
		Version:     stored.Version,
		CreatedAt:   stored.CreatedAt,
		UpdatedAt:   stored.UpdatedAt,
	}, nil
}

func templateKey(orgID int64, id string) map[string]types.AttributeValue {
	return map[string]types.AttributeValue{
		"orgId": &types.AttributeValueMemberS{Value: orgKey(orgID)},
		"id":    &types.AttributeValueMemberS{Value: id},
	}
}

func isConditionalCheckFailed(err error) bool {
	var conditionErr *types.ConditionalCheckFailedException
	return errors.As(err, &conditionErr)
}
