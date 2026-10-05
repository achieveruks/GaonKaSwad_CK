# Production AWS Deployment Plan: https://swadclick.com/

Adapt the existing **Gaon Ka Swad** full-stack cloud kitchen platform for production deployment on AWS using the purchased domain **`https://swadclick.com/`**.

This plan strictly preserves all existing application logic, multi-outlet management, checkout, Swad Coins, kitchen ordering, and Supabase integration (PostgreSQL, Auth, RLS, and Realtime), making the minimum necessary changes to run on AWS serverless infrastructure.

---

## 1. Target Architecture & Domain Mapping

```text
Customer Browser
       │
       ▼
https://swadclick.com
       │
       ▼
AWS CloudFront Distribution (ACM SSL Certificate in us-east-1)
       │
       ├── /* (Default Cache Behavior) ──────► Amazon S3 Bucket (Private, via OAC)
       │                                       React / Vite production build (dist/)
       │                                       [Custom Error: 403/404 -> /index.html 200 OK]
       │
       └── /api/* (Zero-Cache Behavior) ────► AWS API Gateway (HTTP API v2)
                                                   │
                                                   ▼
                                        AWS Lambda: API Handler
                                        (Node.js 20, @codegenie/serverless-express)
                                                   │
                                  ┌────────────────┴────────────────┐
                                  ▼                                 ▼
                         Supabase PostgreSQL                  Amazon S3 Bucket
                       (Auth, RLS, Realtime, DB)           (Food Images & PDF Docs)
                                  ▲
                                  │
                   Amazon EventBridge Rule
                   [Schedule: cron(30 22 * * ? *)] = 04:00 AM IST
                                  │
                                  ▼
                     AWS Lambda: Cron Handler
                  (swadCoinDailyRewards execution)
```

---

## 2. Pre-Implementation Codebase Inspection

| Area | Current State in Codebase | Required AWS Adaptation |
| :--- | :--- | :--- |
| **Frontend API URLs** | Already uses clean relative paths (e.g. `/api/swad-coins/...`, `/api/products`, `/api/orders`). | **Zero frontend code changes needed.** CloudFront will seamlessly route `/api/*` to API Gateway and `/*` to S3. |
| **Express Backend (`server.ts`)** | Contains 5,300+ lines with 50+ routes, currently bundled inside `startServer()` with `app.listen(3000)`. | Extract Express `app` into an exportable module. Keep local `server.ts` for development; add `server/lambda.ts` for AWS Lambda. |
| **Database & Auth** | Supabase PostgreSQL (`supabase.ts`, `supabaseService.ts`, `serverSupabase`). Uses client anon key in Vite frontend and service key on backend. | **Preserved 100%.** Supabase remains the primary database and auth provider. Backend secrets stored in AWS Secrets Manager / Lambda env. |
| **Scheduled Jobs** | `node-cron` scheduled at `0 4 * * *` (04:00 AM IST) in `server.ts` (lines 5313–5327). | Remove production dependency on `node-cron`. Deploy a dedicated, lightweight Lambda function triggered by Amazon EventBridge at `22:30 UTC` (4:00 AM IST). |
| **Local File Generation** | `/api/prd-pdf` generates PDF files to local disk (`public/PRD_Multi_Outlet_Cloud_Kitchen.pdf`). | Adapt PDF generation to stream directly to the response or upload to the private AWS S3 media bucket with presigned download URLs. |
| **Routing / SPAs** | React Router client-side routes (`/menu`, `/cart`, `/checkout`, `/my-orders`, `/owner`). | Configure CloudFront Custom Error Responses: Map HTTP `403` and `404` from S3 origin to `/index.html` with response code `200`. |
| **Domain & SSL** | Localhost / test URL. | Provision AWS Certificate Manager (ACM) SSL certificate for `swadclick.com` and `*.swadclick.com` in `us-east-1` and bind to CloudFront. |

---

## 3. Implementation Steps (Minimum Required Code Changes)

### Step 1: Decouple Express App for Lambda & Local Dev
1. Refactor `server.ts` to export the configured Express `app` instance:
   - Create `server/app.ts` containing the Express middleware, security headers, and existing 50+ API routes.
   - `server.ts` simply imports `app` and runs `app.listen(3000)` for local Vite dev / container execution.
2. Create the Lambda entrypoint: `server/lambda.ts`:
   ```typescript
   import serverlessExpress from '@codegenie/serverless-express';
   import { app } from './app';

   export const handler = serverlessExpress({ app });
   ```
3. Create the dedicated EventBridge Cron handler: `server/cron-handler.ts`:
   ```typescript
   import { executeSwadCoinDailyRewards } from './swadCoinCron';

   export const handler = async (event: any) => {
     console.log('[EventBridge] Fired 04:00 AM IST Swad Coin daily reward job');
     const result = await executeSwadCoinDailyRewards('SCHEDULED');
     return { statusCode: 200, body: JSON.stringify(result) };
   };
   ```

### Step 2: Lambda Packaging with esbuild (Node.js 20)
1. Add `@codegenie/serverless-express` to `package.json`.
2. Configure `build-lambda.mjs` using `esbuild`:
   - Target: `node20`
   - Platform: `node`
   - External: `@aws-sdk/*` (available natively in AWS Lambda Node 20 runtime)
   - Outputs:
     - `dist-lambda/api.js` (Express API)
     - `dist-lambda/cron.js` (EventBridge Scheduled Job)
   - Add script to `package.json`: `"build:lambda": "node scripts/build-lambda.mjs"`

### Step 3: Infrastructure as Code (AWS SAM `template.yaml`)
Using **AWS SAM** as the single, standard deployment framework:
1. **Frontend S3 Bucket & Origin Access Control (OAC):**
   - Private S3 Bucket `swadclick-frontend-prod`.
   - CloudFront OAC allowing only CloudFront distribution read access.
2. **Media/Documents S3 Bucket:**
   - Private S3 Bucket `swadclick-media-prod` for generated PDFs and product images.
3. **API Gateway HTTP API (v2):**
   - Routes `ANY /api/{proxy+}` to the API Lambda function.
   - Configures binary media types (`application/pdf`, `*/*`).
4. **AWS Lambda Functions (Node.js 20):**
   - `SwadClickApiFunction`: 1024 MB RAM, 30s timeout, environment variables populated from AWS Secrets Manager (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `S3_MEDIA_BUCKET`).
   - `SwadClickCronFunction`: 512 MB RAM, 60s timeout, attached to EventBridge rule.
5. **Amazon EventBridge Rule:**
   - Name: `SwadCoinDailyRewardsSchedule`
   - Schedule Expression: `cron(30 22 * * ? *)` (4:00 AM IST daily).
   - Target: `SwadClickCronFunction`.
6. **CloudFront Distribution for `swadclick.com`:**
   - **Aliases:** `swadclick.com`, `www.swadclick.com`
   - **Viewer Certificate:** ACM Certificate ARN (in `us-east-1`).
   - **Default Origin:** S3 Frontend Bucket (OAC enabled).
   - **Default Cache Behavior (`/*`):** Caching optimized for static web assets.
   - **Custom Error Responses:**
     - ErrorCode: `403` -> ResponsePagePath: `/index.html`, ResponseCode: `200`
     - ErrorCode: `404` -> ResponsePagePath: `/index.html`, ResponseCode: `200`
   - **API Origin:** API Gateway HTTP API domain.
   - **API Cache Behavior (`/api/*`):**
     - AllowedMethods: `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`
     - CachePolicy: `CachingDisabled` (AWS Managed Policy)
     - OriginRequestPolicy: `AllViewerExceptHostHeader` (AWS Managed Policy)

### Step 4: S3 Storage & PDF Generation Adapter
1. In `server/s3Storage.ts`, implement S3 upload and presigned URL helpers using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
2. In the `/api/prd-pdf` route:
   - When running in Lambda (`process.env.AWS_LAMBDA_FUNCTION_NAME` is set):
     - Generate PDF in memory buffer.
     - Upload to `s3://${S3_MEDIA_BUCKET}/documents/PRD_Multi_Outlet_Cloud_Kitchen.pdf`.
     - Return an HTTP 302 redirect to a secure 15-minute presigned S3 download URL.
   - When running locally: continue using local disk/stream.

### Step 5: Route 53 & ACM Domain Setup for `swadclick.com`
1. Request a public certificate in AWS Certificate Manager in region **`us-east-1`** (CloudFront requires certificates to be in `us-east-1`):
   - Domain names: `swadclick.com`, `*.swadclick.com`.
   - Validate via DNS CNAME records in your domain registrar / Route 53.
2. In Route 53 (or your DNS provider):
   - Point `swadclick.com` (Apex record / A-Alias) -> CloudFront Distribution domain.
   - Point `www.swadclick.com` (CNAME) -> `swadclick.com` (or CloudFront domain).

---

## 4. Deployment & Build Sequence

### Local Preparation
```bash
# 1. Install Lambda serverless adapter
npm install @codegenie/serverless-express

# 2. Build Vite React frontend (creates dist/)
npm run build

# 3. Build Node 20 Lambda bundles (creates dist-lambda/)
npm run build:lambda
```

### AWS SAM Deployment
```bash
# 1. Build SAM artifacts
sam build

# 2. Deploy infrastructure and Lambda functions
sam deploy --guided \
  --stack-name swadclick-production \
  --parameter-overrides DomainName=swadclick.com CertificateArn=arn:aws:acm:us-east-1:...

# 3. Sync frontend assets to S3 and invalidate CloudFront cache
aws s3 sync dist/ s3://swadclick-frontend-prod/ --delete
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

---

## 5. Production Validation Checklist

- [ ] **Domain & SSL:** `https://swadclick.com/` loads over HTTPS with a valid certificate.
- [ ] **Client-side Direct Routes:** Direct navigation to `https://swadclick.com/menu`, `/cart`, `/checkout`, `/my-orders`, `/owner` loads without 404/403.
- [ ] **Health Check API:** `https://swadclick.com/api/health` returns `{ "status": "ok" }` with 200 OK via CloudFront -> API Gateway -> Lambda.
- [ ] **Products API:** `https://swadclick.com/api/products` returns active outlet products from Supabase.
- [ ] **Multi-Outlet Switcher:** Switching between Bangalore and Bhubaneswar outlets reflects immediately.
- [ ] **Orders & Checkout:** Test cart submission and order creation persists to `public.orders` in Supabase.
- [ ] **Supabase Realtime:** Kitchen manager dashboard updates live on order placement.
- [ ] **Swad Coins Loyalty:** Pending rewards, balances, and vault card claims work correctly without 404s.
- [ ] **Daily EventBridge Cron:** Trigger test event on `SwadClickCronFunction` in AWS Console; verify CloudWatch log output for 4:00 AM IST execution.
- [ ] **PDF Download:** `https://swadclick.com/api/prd-pdf` returns the PDF document via S3 presigned URL.
- [ ] **Zero Exposed Secrets:** Verify no service-role keys or database passwords exist in frontend bundles.
