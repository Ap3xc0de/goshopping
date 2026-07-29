variable "environment"      { type = string }
variable "db_host"          { type = string }
variable "core_api_url"     { type = string }
variable "integrations_url" { type = string }
variable "sqs_queue_urls"   { type = map(string) }
