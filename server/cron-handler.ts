import { executeSwadCoinDailyRewards } from '../server';

/**
 * AWS Lambda EventBridge Scheduled Cron Handler for swadclick.com
 * Executed daily at 4:00 AM IST (22:30 UTC) via Amazon EventBridge
 */
export const handler = async (event: any, context: any) => {
  console.log('[EventBridge] Fired 04:00 AM IST Swad Coin daily reward job', {
    time: new Date().toISOString(),
    event,
    awsRequestId: context?.awsRequestId,
  });

  try {
    const cronResult = await executeSwadCoinDailyRewards('SCHEDULED');
    console.log(`[Swad Coins] Scheduled cron completed successfully:`, cronResult);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: cronResult.message,
        summary: cronResult.summary,
      }),
    };
  } catch (err: any) {
    console.error('[Swad Coins] Error during EventBridge daily reward cron execution:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Cron execution failed',
      }),
    };
  }
};
