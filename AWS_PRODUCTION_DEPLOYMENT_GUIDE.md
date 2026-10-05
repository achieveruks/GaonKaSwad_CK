# Production AWS Deployment Guide: https://swadclick.com/

Complete, step-by-step instructions to deploy the **Gaon Ka Swad** platform to your production domain: **`https://swadclick.com/`**.

---

## Architecture Overview

```text
Customer Browser (https://swadclick.com)
                       │
                       ▼
           AWS CloudFront Distribution
                       │
         ┌─────────────┴─────────────┐
         │ Default: `/*`             │ API: `/api/*`
         ▼                           ▼
  Amazon S3 Bucket             AWS API Gateway (HTTP API v2)
(Vite React Frontend)                 │
                                      ▼
                               AWS Lambda (Node.js 20)
                            (@codegenie/serverless-express)
                                      │
                       ┌──────────────┴──────────────┐
                       ▼                             ▼
              Supabase PostgreSQL               Amazon S3
         (Auth, Realtime, Orders, DB)        (Media & PDFs)
                       ▲
                       │
            Amazon EventBridge Rule
             [04:00 AM IST Daily]
                       │
                       ▼
            AWS Lambda (Cron Worker)
```

---

## Prerequisites

1. **AWS CLI installed & configured:**
   ```bash
   aws configure
   ```
2. **AWS SAM CLI installed:**
   ```bash
   # On macOS
   brew install aws-sam-cli
   # On Linux / Windows, follow AWS SAM CLI installation guide
   sam --version
   ```
3. **Domain Ownership:**
   - You own `swadclick.com`.
   - Access to your DNS registrar (Route 53, GoDaddy, Namecheap, Cloudflare, etc.).

---

## Step 1: Request ACM SSL Certificate for `swadclick.com`

> **CRITICAL AWS REQUIREMENT:** CloudFront distributions **MUST** use an SSL certificate created in region **`us-east-1` (US East - N. Virginia)**. Even if your Lambda and S3 buckets are in Mumbai (`ap-south-1`) or elsewhere, the CloudFront certificate must be in `us-east-1`.

1. Run the following AWS CLI command in `us-east-1`:
   ```bash
   aws acm request-certificate \
     --domain-name swadclick.com \
     --subject-alternative-names "*.swadclick.com" \
     --validation-method DNS \
     --region us-east-1
   ```
2. Retrieve the validation CNAME record:
   ```bash
   aws acm describe-certificate \
     --certificate-arn <YOUR_CERTIFICATE_ARN> \
     --region us-east-1 \
     --query "Certificate.DomainValidationOptions"
   ```
3. Add the output `Name` and `Value` CNAME records into your DNS registrar for `swadclick.com`.
4. Wait 2–5 minutes until the status changes to `ISSUED`. Note the Certificate ARN:
   `arn:aws:acm:us-east-1:123456789012:certificate/xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## Step 2: Build Application & Lambda Bundles

Run the production build commands in your terminal:

```bash
# 1. Build the Vite React Frontend (creates dist/)
npm run build

# 2. Build the optimized AWS Lambda bundles (creates dist-lambda/api and dist-lambda/cron)
npm run build:lambda
```

---

## Step 3: Deploy Infrastructure with AWS SAM

Run the guided SAM deployment:

```bash
sam deploy --guided
```

SAM will prompt you with the following configuration:
- **Stack Name [sam-app]:** `swadclick-production`
- **AWS Region [ap-south-1]:** `ap-south-1` (Mumbai is ideal for India cloud kitchen traffic)
- **Parameter DomainName [swadclick.com]:** `swadclick.com`
- **Parameter DomainAliases [swadclick.com,www.swadclick.com]:** `swadclick.com,www.swadclick.com`
- **Parameter AcmCertificateArn []:** Paste your `us-east-1` Certificate ARN from Step 1
- **Parameter SupabaseUrl:** `https://ifthfunawntmqjupafxp.supabase.co`
- **Parameter SupabaseAnonKey:** (Leave default or paste your key)
- **Parameter SupabaseServiceRoleKey:** (Paste your Supabase service_role key for backend access)
- **Parameter JwtSecret:** (Provide a strong random secret for JWTs)
- **Confirm changes before deploy [y/N]:** `y`
- **Allow SAM CLI IAM role creation [Y/n]:** `Y`
- **Disable rollback [y/N]:** `N`
- **Save arguments to configuration file [Y/n]:** `Y`

SAM will now provision the S3 buckets, CloudFront distribution, API Gateway, Lambda functions, and EventBridge rule.

Once deployment finishes, SAM prints the outputs:
```text
Outputs:
ProductionUrl            https://swadclick.com
CloudFrontDomain         d1234567890abc.cloudfront.net
CloudFrontDistributionId E1234567890ABC
FrontendBucketName       swadclick-frontend-123456789012-ap-south-1
MediaBucketName          swadclick-media-123456789012-ap-south-1
ApiGatewayEndpoint       https://abc123xyz.execute-api.ap-south-1.amazonaws.com
```

---

## Step 4: Upload Frontend to S3 and Invalidate CloudFront Cache

Sync the built React/Vite assets to the newly created frontend S3 bucket:

```bash
# 1. Sync static dist/ files to S3
aws s3 sync dist/ s3://<FrontendBucketName>/ --delete

# 2. Invalidate CloudFront cache so changes are live immediately
aws cloudfront create-invalidation \
  --distribution-id <CloudFrontDistributionId> \
  --paths "/*"
```

---

## Step 5: Point DNS Records to CloudFront

In your domain registrar / DNS management console for `swadclick.com`:

| Type | Name / Host | Target / Value | TTL |
| :--- | :--- | :--- | :--- |
| **A / ALIAS / ANAME** | `@` (or `swadclick.com`) | `<CloudFrontDomain>` (e.g. `d1234567890abc.cloudfront.net`) | Auto / 300 |
| **CNAME** | `www` | `<CloudFrontDomain>` (or `swadclick.com`) | Auto / 300 |

*(If using AWS Route 53, select "Alias to CloudFront distribution" and choose your distribution).*

---

## Step 6: Production Verification Checklist

1. **Website & SSL:**
   Open **`https://swadclick.com/`** in browser. Verify SSL padlock and fast page load.
2. **Direct SPA Routes:**
   Directly open `https://swadclick.com/menu`, `/cart`, `/checkout`, `/my-orders`, `/owner`.
   Verify they load cleanly without 403 or 404 errors (handled by CloudFront custom error response).
3. **API Health Check:**
   Run:
   ```bash
   curl -I https://swadclick.com/api/health
   ```
   Should return `HTTP/2 200` with JSON `{ "status": "ok" }`.
4. **Products Catalog API:**
   ```bash
   curl https://swadclick.com/api/products
   ```
   Should return your live outlet products from Supabase.
5. **Swad Coins Loyalty:**
   Test balance and pending reward retrieval. All requests go to relative `/api/swad-coins/...` on the same domain with 0 CORS issues.
6. **PDF Download:**
   Visit `https://swadclick.com/api/prd-pdf`. Returns the document cleanly.
7. **Scheduled 4:00 AM IST Cron:**
   In AWS CloudWatch Console, inspect log group `/aws/lambda/swadclick-production-SwadClickCronFunction...`. Verify EventBridge invocations at 22:30 UTC.
