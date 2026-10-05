import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

async function buildLambda() {
  console.log('Building AWS Lambda bundles for swadclick.com...');

  // Ensure output directory exists
  const outDir = path.resolve('dist-lambda');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Bundle API Lambda Handler (serverless-express)
  console.log('1. Bundling API Gateway Lambda Handler...');
  await esbuild.build({
    entryPoints: ['server/lambda.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    sourcemap: true,
    outfile: 'dist-lambda/api/index.js',
    // Exclude @aws-sdk packages as they are pre-installed in AWS Lambda Node.js 20 runtime
    external: [
      'vite',
      'esbuild',
      '@aws-sdk/*',
      '@aws-sdk/client-s3',
      '@aws-sdk/s3-request-presigner',
    ],
    // Keep bundle clean
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  // Write package.json in dist-lambda/api so Node treats .js as CommonJS
  fs.writeFileSync('dist-lambda/api/package.json', JSON.stringify({ type: 'commonjs' }, null, 2));

  // 2. Bundle EventBridge Cron Lambda Handler (4:00 AM IST Swad Coin rewards)
  console.log('2. Bundling EventBridge Cron Lambda Handler...');
  await esbuild.build({
    entryPoints: ['server/cron-handler.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    sourcemap: true,
    outfile: 'dist-lambda/cron/index.js',
    external: [
      '@aws-sdk/*',
      '@aws-sdk/client-s3',
      '@aws-sdk/s3-request-presigner',
    ],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  // Write package.json in dist-lambda/cron
  fs.writeFileSync('dist-lambda/cron/package.json', JSON.stringify({ type: 'commonjs' }, null, 2));

  console.log('Lambda bundles built successfully in dist-lambda/api/ and dist-lambda/cron/');
}

buildLambda().catch((err) => {
  console.error('Lambda build failed:', err);
  process.exit(1);
});
