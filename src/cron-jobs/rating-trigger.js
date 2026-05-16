const { query } = require('../db');
const { sendOtpEmail } = require('../utils/mailer');
const { notify } = require('../utils/notify');

/**
 * Daily Rating Request Email Job
 * Runs every day at 10:00 AM
 * Identifies projects delivered 30+ days ago and sends rating request emails
 */

async function sendRatingRequestEmails() {
  console.log('[Cron Job] Starting daily rating request email job...');
  
  try {
    // Query the view for projects ready for rating
    const result = await query(`
      SELECT 
        prp.project_id,
        prp.project_name,
        prp.client_id,
        prp.client_name,
        prp.client_email,
        prp.assigned_sales_rep_id,
        prp.assigned_sales_rep_email,
        prp.days_since_delivery
      FROM vw_projects_ready_for_rating prp
      LEFT JOIN projects p ON prp.project_id = p.id
      WHERE p.rating_email_sent IS NOT TRUE
      ORDER BY prp.delivered_at ASC
    `);
    
    const projects = result.rows;
    
    if (projects.length === 0) {
      console.log('[Cron Job] No projects ready for rating requests today.');
      return { success: true, count: 0, message: 'No projects to process' };
    }
    
    console.log(`[Cron Job] Found ${projects.length} projects to process.`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const project of projects) {
      try {
        // 1. Send professional Arabic email to client
        const emailSubject = 'تقييم تجربة المشروع - شركة Smart Energy';
        const emailBody = `
          عزيزنا العميل ${project.client_name}،
          
          نأمل أنكم بخير وسعادة.
          
          يسعدنا في شركة Smart Energy لخدمات الطاقة أن نتواصل معكم بخصوص المشروع الذي تم تسليمه منذ شهر:
          
          📋 اسم المشروع: ${project.project_name}
          📅 تاريخ التسليم: منذ ${project.days_since_delivery} يوماً
          
          بعد مرور شهر على التسليم، نود منكم التكرم بتقييم تجربتكم معنا. آراؤكم غالية جداً وتساعدنا على تحسين خدماتنا.
          
          ⭐ للتقييم، يرجى:
          1. تسجيل الدخول إلى بوابة العميل
          2. الذهاب إلى قسم "مشاريعي"
          3. اختيار المشروع
          4. الضغط على زر "تقييم المشروع"
          
          شاكرين لكم ثقتكم الغالية.
          
          مع أطيب التحيات،
          فريق خدمة العملاء
          شركة Smart Energy لخدمات الطاقة
          
          📞 للاستفسارات: support@smartenergy.com
        `;
        
        await sendOtpEmail(project.client_email, emailBody, emailSubject);
        
        // 2. Mark rating_email_sent = true to avoid duplicates
        await query(
          `UPDATE projects SET rating_email_sent = TRUE, rating_email_sent_at = NOW() WHERE id = $1`,
          [project.project_id]
        );
        
        // 3. Notify sales representative about the pending rating
        if (project.assigned_sales_rep_id) {
          await notify(project.assigned_sales_rep_id, {
            title: 'طلب تقييم مشروع',
            message: `تم إرسال طلب تقييم للعميل بخصوص المشروع: ${project.project_name}`,
            type: 'info',
            entity_type: 'rating_request',
            entity_id: project.project_id,
          });
        }
        
        // 4. Log success
        console.log(`[Cron Job] ✅ Sent rating request to ${project.client_email} for project ${project.project_name}`);
        successCount++;
        
      } catch (error) {
        console.error(`[Cron Job] ❌ Failed to process project ${project.project_id}:`, error.message);
        failCount++;
      }
    }
    
    const summary = {
      success: true,
      total: projects.length,
      success_count: successCount,
      fail_count: failCount,
      message: `Processed ${projects.length} projects: ${successCount} successful, ${failCount} failed`
    };
    
    console.log('[Cron Job] Summary:', summary);
    return summary;
    
  } catch (error) {
    console.error('[Cron Job] Fatal error in rating request job:', error.message);
    console.error(error.stack);
    return { 
      success: false, 
      error: error.message,
      stack: error.stack 
    };
  }
}

module.exports = {
  sendRatingRequestEmails,
};
