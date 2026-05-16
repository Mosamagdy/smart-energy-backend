/**
 * Cron Job Scheduler
 * Registers and runs all scheduled background jobs
 */

const cron = require('node-cron');
const { sendRatingRequestEmails } = require('../cron-jobs/rating-trigger');
const { notifyUnreadMessages } = require('../cron-jobs/message-notifications');

/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
  console.log('📅 Initializing cron jobs...');
  
  // Job 1: Daily rating request emails at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('\n[Scheduler] Running daily rating request job...');
    await sendRatingRequestEmails();
  }, {
    timezone: 'Asia/Riyadh' // Saudi Arabia timezone
  });
  console.log('✅ Scheduled: Rating request emails (Daily at 10:00 AM)');
  
  // Job 2: Unread message notifications every hour
  cron.schedule('0 * * * *', async () => {
    console.log('\n[Scheduler] Running unread message notification job...');
    await notifyUnreadMessages();
  }, {
    timezone: 'Asia/Riyadh'
  });
  console.log('✅ Scheduled: Unread message notifications (Every hour)');
  
  console.log('\n🎉 All cron jobs initialized successfully!\n');
}

/**
 * Run jobs manually for testing
 */
async function runAllJobsManually() {
  console.log('🔧 Running all jobs manually for testing...\n');
  
  console.log('[Manual] Running rating request job...');
  const ratingResult = await sendRatingRequestEmails();
  console.log('[Manual] Rating job result:', ratingResult, '\n');
  
  console.log('[Manual] Running message notification job...');
  const messageResult = await notifyUnreadMessages();
  console.log('[Manual] Message job result:', messageResult, '\n');
  
  return {
    rating_job: ratingResult,
    message_job: messageResult
  };
}

module.exports = {
  initializeCronJobs,
  runAllJobsManually,
};
