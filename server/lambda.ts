import serverlessExpress from '@codegenie/serverless-express';
import { app } from '../server';

/**
 * AWS Lambda API Handler for swadclick.com
 * Handles all /api/* routes via API Gateway HTTP API (v2) or REST API
 */
export const handler = serverlessExpress({
  app,
  binarySettings: {
    contentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  },
});
