package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	awstypes "github.com/aws/aws-sdk-go-v2/service/sqs/types"
	"github.com/google/uuid"
	"github.com/goshopping/core/internal/config"
)

// Event is the standard envelope sent to every SQS queue.
type Event struct {
	EventID   string      `json:"event_id"`
	EventType string      `json:"event_type"`
	StoreID   string      `json:"store_id"`
	Payload   interface{} `json:"payload"`
	Timestamp time.Time   `json:"timestamp"`
}

// EventService publishes domain events to AWS SQS.
type EventService struct {
	client *sqs.Client
	cfg    *config.Config
}

// NewEventService creates an EventService. It loads AWS credentials from the
// environment; if SQS_ENDPOINT is set it uses that URL (for local ElasticMQ).
func NewEventService(cfg *config.Config) *EventService {
	ctx := context.Background()

	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.AWSRegion),
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		// Non-fatal: event publishing will fail gracefully at call time.
		return &EventService{cfg: cfg}
	}

	sqsClient := sqs.NewFromConfig(awsCfg, func(o *sqs.Options) {
		if cfg.SQSEndpoint != "" {
			o.BaseEndpoint = aws.String(cfg.SQSEndpoint)
		}
	})

	return &EventService{client: sqsClient, cfg: cfg}
}

// Publish serialises an Event and sends it to the given SQS queue URL.
func (s *EventService) Publish(queueURL string, eventType string, storeID string, payload interface{}) error {
	if s.client == nil {
		return fmt.Errorf("event service: SQS client not initialised")
	}

	evt := Event{
		EventID:   uuid.New().String(),
		EventType: eventType,
		StoreID:   storeID,
		Payload:   payload,
		Timestamp: time.Now().UTC(),
	}

	body, err := json.Marshal(evt)
	if err != nil {
		return fmt.Errorf("event service: marshal event: %w", err)
	}

	_, err = s.client.SendMessage(context.Background(), &sqs.SendMessageInput{
		QueueUrl:    aws.String(queueURL),
		MessageBody: aws.String(string(body)),
		MessageAttributes: map[string]awstypes.MessageAttributeValue{
			"EventType": {
				DataType:    aws.String("String"),
				StringValue: aws.String(eventType),
			},
		},
	})
	if err != nil {
		return fmt.Errorf("event service: send message to %s: %w", queueURL, err)
	}

	return nil
}
