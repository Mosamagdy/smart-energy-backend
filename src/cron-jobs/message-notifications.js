const { query } = require('../db');
const { notify } = require('../utils/notify');

/**
 * Unread Message Notification Job
 * Runs every hour to check and notify sales reps about unread client messages
 */

async function notifyUnreadMessages() {
  console.log('[Cron Job] Checking unread client messages...');
  
  try {
    // Find sales reps with unread messages from clients
    const result = await query(`
      SELECT 
        csm.sales_rep_id,
        u.first_name || ' ' || u.last_name AS sales_rep_name,
        u.email AS sales_rep_email,
        COUNT(csm.id) AS unread_count,
        STRING_AGG(DISTINCT p.name, ', ') AS project_names
      FROM client_support_messages csm
      INNER JOIN users u ON csm.sales_rep_id = u.id
      INNER JOIN projects p ON csm.project_id = p.id
      WHERE csm.is_from_client = true
        AND csm.is_read = false
        AND csm.created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY csm.sales_rep_id, u.first_name, u.last_name, u.email
      HAVING COUNT(csm.id) > 0;
    `);
    
    const salesReps = result.rows;
    
    if (salesReps.length === 0) {
      console.log('[Cron Job] No unread client messages to notify.');
      return { success: true, count: 0 };
    }
    
    console.log(`[Cron Job] Found ${salesReps.length} sales reps with unread messages.`);
    
    let notifiedCount = 0;
    
    for (const rep of salesReps) {
      try {
        // Send system notification
        await notify(rep.sales_rep_id, {
          title: 'رسائل جديدة من العملاء',
          message: `لديك ${rep.unread_count} رسائل جديدة من العملاء بخصوص المشاريع: ${rep.project_names}`,
          type: 'alert',
          entity_type: 'client_messages',
          badge_count: parseInt(rep.unread_count),
        });
        
        console.log(`[Cron Job] ✅ Notified ${rep.sales_rep_name} about ${rep.unread_count} unread messages`);
        notifiedCount++;
        
      } catch (error) {
        console.error(`[Cron Job] ❌ Failed to notify ${rep.sales_rep_id}:`, error.message);
      }
    }
    
    return {
      success: true,
      total_reps: salesReps.length,
      notified_count: notifiedCount
    };
    
  } catch (error) {
    console.error('[Cron Job] Error in unread message notification:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

module.exports = {
  notifyUnreadMessages,
};
