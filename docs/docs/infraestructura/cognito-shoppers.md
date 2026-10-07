---
sidebar_position: 8
---

# Shopper authentication (Cognito)

Terraform module: `infra/modules/cognito`, wired into `infra/environments/staging`.
It creates a dedicated user pool for shoppers (email sign-in), a hosted UI domain,
a public mobile app client (authorization code flow, no secret) and, optionally,
Google, Facebook and Sign in with Apple identity providers.

## Enabling a social provider

Each provider is off by default. Set its `enable_*_login` variable to `true` and
supply the credentials through `TF_VAR_*` environment variables or CI secrets
(never in `terraform.tfvars`).

| Provider | Enable flag | Credentials to supply |
| --- | --- | --- |
| Google | `enable_google_login` | `google_client_id`, `google_client_secret` (OAuth client) |
| Facebook | `enable_facebook_login` | `facebook_app_id`, `facebook_app_secret` |
| Apple | `enable_apple_login` | `apple_services_id`, `apple_team_id`, `apple_key_id`, `apple_private_key` (contents of the `.p8` key) |

Terraform fails the plan when a provider is enabled with missing credentials.

## Redirect URI to register

Register this URI in each provider console (Google authorized redirect URI,
Facebook valid OAuth redirect URI, Apple Services ID return URL):

```
https://<hosted-ui-domain>/oauth2/idpresponse
```

`<hosted-ui-domain>` is the `cognito_hosted_ui_domain` output, for example
`goshopping-staging.auth.us-east-1.amazoncognito.com`.

## Core configuration

The staging ECS Core task receives `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`
and `COGNITO_REGION` from the module outputs. Mobile callback and logout deep links
are set with `cognito_callback_urls` and `cognito_logout_urls`.
