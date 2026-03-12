# OpenSRS Email Reseller API Guide

## Overview

OpenSRS (by Tucows) provides a white-label email hosting platform. You buy mailboxes wholesale at $0.50/mailbox/month and resell under your own brand.

- **Reseller signup**: https://opensrs.com
- **Initial deposit**: $100 (becomes account credit)
- **API docs**: https://opensrs.com/resources/documentation/
- **No minimums**: Start with 1 mailbox

## Getting Started

### 1. Create Reseller Account

1. Go to https://opensrs.com and sign up for a reseller account
2. Pay the $100 deposit (applied as credit toward services)
3. Access the reseller control panel
4. Generate API credentials (username + API key)

### 2. API Authentication

OpenSRS uses XML-based API calls with MD5 signature authentication.

```
Endpoint: https://admin.hostedemail.com/api
Auth: API key + MD5 signature
Format: XML over HTTPS
```

Store credentials in `.env`:
```env
OPENSRS_API_USER=your_reseller_username
OPENSRS_API_KEY=your_api_key
OPENSRS_API_URL=https://admin.hostedemail.com/api
```

### 3. Core Operations

#### Provision a Domain for Email

Before creating mailboxes, register the domain with OpenSRS email:

```
Action: CREATE_DOMAIN
Object: DOMAIN
Attributes:
  - domain: customerbusiness.com
```

#### Create a Mailbox

```
Action: CREATE_MAILBOX
Object: MAILBOX
Attributes:
  - domain: customerbusiness.com
  - mailbox: info
  - password: (generated secure password)
  - workgroup: default
```

This creates `info@customerbusiness.com`.

#### Delete a Mailbox

```
Action: DELETE_MAILBOX
Object: MAILBOX
Attributes:
  - domain: customerbusiness.com
  - mailbox: info
```

#### Reset Password

```
Action: SET_MAILBOX_PASSWORD
Object: MAILBOX
Attributes:
  - domain: customerbusiness.com
  - mailbox: info
  - password: new_secure_password
```

#### List Mailboxes for a Domain

```
Action: GET_DOMAIN_MAILBOXES
Object: DOMAIN
Attributes:
  - domain: customerbusiness.com
```

### 4. Mailbox Settings

Each mailbox supports:
- **Storage**: 5GB base (expandable in 5GB increments)
- **Forwarding**: Forward copies to another address
- **Auto-reply**: Vacation/out-of-office messages
- **Aliases**: Multiple addresses pointing to one mailbox
- **Spam filtering**: Built-in, configurable sensitivity

### 5. Webmail Access

Customers access webmail at a URL you configure. OpenSRS provides a white-label webmail interface that you can point your own subdomain to (e.g., `mail.yourbrand.com`).

## SDK Implementation

The `sdk/opensrs-client/` directory in this repo wraps these API calls in a clean TypeScript interface. See `sdk/opensrs-client/index.ts` for the implementation.

## Billing Integration

Pair OpenSRS provisioning with Stripe for automated billing:

1. Customer signs up and pays via Stripe
2. Stripe webhook triggers mailbox provisioning via OpenSRS API
3. Monthly Stripe subscription handles recurring billing
4. Customer cancellation triggers mailbox deletion

See `sdk/billing/stripe-metered.ts` for the billing integration.

## Monitoring

- OpenSRS provides 99.9% uptime SLA
- Monitor your reseller account balance (auto-top-up recommended)
- DNS health checks: use `scripts/dns-checker.sh` to verify customer records
