package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
)

// Config holds all configuration values for the application.
type Config struct {
	AppEnv    string
	Port      string
	LogLevel  string
	AWSRegion string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// JWT
	JWTSecret        string
	JWTAccessExpiry  time.Duration
	JWTRefreshExpiry time.Duration

	// SQS
	SQSEndpoint              string
	SQSOrderEventsURL        string
	SQSPaymentEventsURL      string
	SQSAccountingEventsURL   string
	SQSNotificationEventsURL string
	SQSMarketingEventsURL    string

	// S3
	S3BucketAssets string
	S3Endpoint     string
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseDuration(s, fallback string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		d, _ = time.ParseDuration(fallback)
	}
	return d
}

// Load reads configuration from environment variables. In staging/production
// it enriches sensitive values from AWS Secrets Manager and SSM Parameter Store,
// falling back to env vars when AWS calls fail.
func Load() *Config {
	cfg := &Config{
		AppEnv:    getEnv("APP_ENV", "development"),
		Port:      getEnv("PORT", "3000"),
		LogLevel:  getEnv("LOG_LEVEL", "info"),
		AWSRegion: getEnv("AWS_REGION", "us-east-1"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "goshopping"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "goshopping"),
		DBSSLMode:  getEnv("DB_SSL_MODE", "disable"),

		JWTSecret:        getEnv("JWT_SECRET", ""),
		JWTAccessExpiry:  parseDuration(getEnv("JWT_ACCESS_EXPIRY", "15m"), "15m"),
		JWTRefreshExpiry: parseDuration(getEnv("JWT_REFRESH_EXPIRY", "168h"), "168h"),

		SQSEndpoint:              getEnv("SQS_ENDPOINT", ""),
		SQSOrderEventsURL:        getEnv("SQS_ORDER_EVENTS_URL", ""),
		SQSPaymentEventsURL:      getEnv("SQS_PAYMENT_EVENTS_URL", ""),
		SQSAccountingEventsURL:   getEnv("SQS_ACCOUNTING_EVENTS_URL", ""),
		SQSNotificationEventsURL: getEnv("SQS_NOTIFICATION_EVENTS_URL", ""),
		SQSMarketingEventsURL:    getEnv("SQS_MARKETING_EVENTS_URL", ""),

		S3BucketAssets: getEnv("S3_BUCKET_ASSETS", ""),
		S3Endpoint:     getEnv("S3_ENDPOINT", ""),
	}

	if cfg.AppEnv == "staging" || cfg.AppEnv == "production" {
		cfg.loadFromAWS()
	}

	return cfg
}

// loadFromAWS enriches the config with values from AWS Secrets Manager and SSM.
// Failures are non-fatal: a warning is logged and env var fallbacks are used.
func (c *Config) loadFromAWS() {
	ctx := context.Background()
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(c.AWSRegion))
	if err != nil {
		log.Printf("[WARN] Could not load AWS config, using env var fallbacks: %v", err)
		return
	}

	// ── Secrets Manager ─────────────────────────────────────────────────────
	smClient := secretsmanager.NewFromConfig(awsCfg)
	c.loadSecret(ctx, smClient, "goshopping/db-credentials", func(val string) {
		// Expected JSON: {"username":"...","password":"..."}
		// Simple env-style override: if the secret IS the password string, use it directly.
		c.DBPassword = val
	})
	c.loadSecret(ctx, smClient, "goshopping/jwt-signing-key", func(val string) {
		c.JWTSecret = val
	})

	// ── SSM Parameter Store ─────────────────────────────────────────────────
	ssmClient := ssm.NewFromConfig(awsCfg)
	env := c.AppEnv
	paramMap := map[string]*string{
		fmt.Sprintf("/goshopping/%s/db-host", env):                     &c.DBHost,
		fmt.Sprintf("/goshopping/%s/sqs-order-events-url", env):        &c.SQSOrderEventsURL,
		fmt.Sprintf("/goshopping/%s/sqs-payment-events-url", env):      &c.SQSPaymentEventsURL,
		fmt.Sprintf("/goshopping/%s/sqs-accounting-events-url", env):   &c.SQSAccountingEventsURL,
		fmt.Sprintf("/goshopping/%s/sqs-notification-events-url", env): &c.SQSNotificationEventsURL,
		fmt.Sprintf("/goshopping/%s/sqs-marketing-events-url", env):    &c.SQSMarketingEventsURL,
		fmt.Sprintf("/goshopping/%s/s3-bucket-assets", env):            &c.S3BucketAssets,
	}

	for name, dest := range paramMap {
		c.loadSSMParam(ctx, ssmClient, name, dest)
	}
}

func (c *Config) loadSecret(ctx context.Context, client *secretsmanager.Client, name string, apply func(string)) {
	out, err := client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
		SecretId: aws.String(name),
	})
	if err != nil {
		log.Printf("[WARN] Could not read secret %q, using env var fallback: %v", name, err)
		return
	}
	if out.SecretString != nil {
		apply(*out.SecretString)
	}
}

func (c *Config) loadSSMParam(ctx context.Context, client *ssm.Client, name string, dest *string) {
	out, err := client.GetParameter(ctx, &ssm.GetParameterInput{
		Name:           aws.String(name),
		WithDecryption: aws.Bool(true),
	})
	if err != nil {
		log.Printf("[WARN] Could not read SSM parameter %q, using env var fallback: %v", name, err)
		return
	}
	if out.Parameter != nil && out.Parameter.Value != nil {
		*dest = *out.Parameter.Value
	}
}
