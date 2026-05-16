const repo = require('./quotations.repository');
const { notifyRole, notify } = require('../../utils/notify');
const { query, pool } = require('../../db');
const { sendNotification } = require('../../services/socket.service');

/**
 * Create quotation with BOQ
 * - Called by quotation_specialist
 * - Validates inspection report is completed
 * - Auto-notifies finance manager
 */
async function createQuotation(data, userId) {
  // Validate required fields
  if (!data.inspection_report_id) {
    const err = new Error('تقرير المعاينة مطلوب');
    err.statusCode = 400;
    throw err;
  }

  if (!data.boq_data || !data.boq_data.items) {
    const err = new Error('بيانات قائمة الكميات (BOQ) مطلوبة');
    err.statusCode = 400;
    throw err;
  }

  // Validate inspection report exists
  // NOTE: inspection_reports table has lead_id directly (not inspection_id)
  const { rows: [report] } = await query(
    `SELECT ir.*, ir.lead_id 
     FROM inspection_reports ir
     WHERE ir.id = $1`,
    [data.inspection_report_id]
  );

  if (!report) {
    const err = new Error('تقرير المعاينة غير موجود');
    err.statusCode = 400;
    throw err;
  }

  // Check if quotation already exists for this inspection
  const { rows: [existing] } = await query(
    `SELECT id FROM quotations WHERE inspection_report_id = $1 LIMIT 1`,
    [data.inspection_report_id]
  );

  if (existing) {
    const err = new Error('يوجد عرض سعر مسبقاً لهذه المعاينة');
    err.statusCode = 409;
    throw err;
  }

  // Calculate total if not provided
  let totalPrice = data.total_price || 0;
  if (!totalPrice && data.boq_data.items) {
    totalPrice = data.boq_data.items.reduce((sum, item) => sum + (item.total || 0), 0);
    if (data.boq_data.labor_cost) totalPrice += data.boq_data.labor_cost;
    if (data.boq_data.equipment_cost) totalPrice += data.boq_data.equipment_cost;
  }

  // Create quotation
  const quotation = await repo.createQuotation({
    inspection_report_id: data.inspection_report_id,
    lead_id: report.lead_id,  // ← CRITICAL: Link to lead
    created_by: userId,
    boq_data: data.boq_data,
    total_price: totalPrice,
    discount: data.discount || 0,
    tax: data.tax || 0,
    details: data.details || {},
    comments: data.comments || '',
    file_url: data.file_url || null
  });

  // Update lead status to quotation_sent
  await query(
    `UPDATE leads 
     SET status = 'quotation_sent', updated_at = NOW()
     WHERE id = $1`,
    [report.lead_id]
  );

  // Get client name for notification
  const { rows: [lead] } = await query(
    `SELECT l.client_name 
     FROM leads l
     WHERE l.id = $1`,
    [report.lead_id]
  );

  // Auto-notify finance manager
  await notifyRole('finance_manager', {
    title: 'عرض سعر بانتظار المراجعة المالية',
    message: `العميل ${lead?.client_name || 'العميل'} — يرجى مراجعة عرض السعر والموافقة`,
    type: 'warning',
    entity_type: 'quotation',
    entity_id: quotation.id
  });

  return quotation;
}

/**
 * Get quotation by ID
 */
async function getQuotationById(id) {
  const quotation = await repo.getQuotationById(id);
  if (!quotation) {
    const err = new Error('عرض السعر غير موجود');
    err.statusCode = 404;
    throw err;
  }
  return quotation;
}

/**
 * Get quotations by lead ID
 */
async function getQuotationsByLeadId(leadId) {
  return await repo.getQuotationsByLeadId(leadId);
}

/**
 * Get all quotations with filters
 */
async function getAllQuotations(filters = {}) {
  return await repo.getAllQuotations(filters);
}

/**
 * Finance review - approve or reject quotation
 */
async function financeReview(id, action, rejectionComment, reviewerId) {
  const quotation = await repo.getQuotationById(id);
  if (!quotation) {
    const err = new Error('عرض السعر غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Validate current status
  if (quotation.status !== 'pending_finance_review') {
    const err = new Error('عرض السعر ليس قيد المراجعة المالية حالياً');
    err.statusCode = 400;
    throw err;
  }

  // Get client name
  // NOTE: inspection_reports has lead_id directly (not inspection_id)
  const { rows: [lead] } = await query(
    `SELECT l.client_name 
     FROM quotations q
     JOIN inspection_reports ir ON ir.id = q.inspection_report_id
     JOIN leads l ON l.id = ir.lead_id
     WHERE q.id = $1`,
    [id]
  );

  const clientName = lead?.client_name || 'العميل';

  if (action === 'approve') {
    const updated = await repo.financeReview(id, 'approve', null, reviewerId);

    // Notify general manager
    await notifyRole('general_manager', {
      title: 'تمت الموافقة المالية على عرض السعر',
      message: `عرض سعر العميل ${clientName} تمت الموافقة عليه مالياً — بانتظار موافقتكم`,
      type: 'warning',
      entity_type: 'quotation',
      entity_id: id
    });

    return updated;

  } else if (action === 'reject') {
    if (!rejectionComment) {
      const err = new Error('سبب الرفض مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const updated = await repo.financeReview(id, 'reject', rejectionComment, reviewerId);

    // Notify quotation specialist to revise
    await notifyRole('quotation_specialist', {
      title: 'الموافقة المالية مرفوضة',
      message: `عرض سعر العميل ${clientName} تم رفضه مالياً — يرجى المراجعة والتعديل`,
      type: 'danger',
      entity_type: 'quotation',
      entity_id: id
    });

    return updated;
  } else {
    const err = new Error('الإجراء يجب أن يكون approve أو reject');
    err.statusCode = 400;
    throw err;
  }
}

/**
 * GM review - approve or reject quotation
 */
async function gmReview(id, action, rejectionComment, reviewerId) {
  const quotation = await repo.getQuotationById(id);
  if (!quotation) {
    const err = new Error('عرض السعر غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Validate current status
  if (quotation.status !== 'pending_gm_approval') {
    const err = new Error('عرض السعر ليس قيد اعتماد المدير العام حالياً');
    err.statusCode = 400;
    throw err;
  }

  // Get client name
  // NOTE: inspection_reports has lead_id directly (not inspection_id)
  const { rows: [lead] } = await query(
    `SELECT l.client_name 
     FROM quotations q
     JOIN inspection_reports ir ON ir.id = q.inspection_report_id
     JOIN leads l ON l.id = ir.lead_id
     WHERE q.id = $1`,
    [id]
  );

  const clientName = lead?.client_name || 'العميل';

  if (action === 'approve') {
    const updated = await repo.gmReview(id, 'approve', null, reviewerId);

    // Get lead_id to update lead status
    const { rows: [report] } = await query(
      `SELECT ir.lead_id 
       FROM quotations q
       JOIN inspection_reports ir ON ir.id = q.inspection_report_id
       WHERE q.id = $1`,
      [id]
    );

    // Update lead status to quotation_approved
    if (report?.lead_id) {
      await query(
        `UPDATE leads SET status = 'quotation_approved', updated_at = NOW() WHERE id = $1`,
        [report.lead_id]
      );
    }

    // Notify finance manager
    await notifyRole('finance_manager', {
      title: 'تم اعتماد عرض السعر من المدير العام',
      message: `يمكنكم متابعة الإجراءات المالية للعميل ${clientName}`,
      type: 'success',
      entity_type: 'quotation',
      entity_id: id
    });

    // Notify quotation specialist
    await notifyRole('quotation_specialist', {
      title: 'تم اعتماد عرض السعر',
      message: `تم اعتماد عرض السعر للعميل ${clientName} — يمكنكم إرساله للعميل`,
      type: 'success',
      entity_type: 'quotation',
      entity_id: id
    });

    return updated;

  } else if (action === 'reject') {
    if (!rejectionComment) {
      const err = new Error('سبب الرفض مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const updated = await repo.gmReview(id, 'reject', rejectionComment, reviewerId);

    // Notify finance manager
    await notifyRole('finance_manager', {
      title: 'المدير العام رفض عرض السعر',
      message: `تم رفض عرض سعر العميل ${clientName} من قبل المدير العام — يرجى المراجعة`,
      type: 'danger',
      entity_type: 'quotation',
      entity_id: id
    });

    // Notify quotation specialist
    await notifyRole('quotation_specialist', {
      title: 'رفض المدير العام لعرض السعر',
      message: `تم رفض عرض السعر للعميل ${clientName} — يرجى إجراء تعديلات جوهرية`,
      type: 'danger',
      entity_type: 'quotation',
      entity_id: id
    });

    return updated;
  } else {
    const err = new Error('الإجراء يجب أن يكون approve أو reject');
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Approve for client - final step
 */
async function approveForClient(id, userId) {
  const quotation = await repo.getQuotationById(id);
  if (!quotation) {
    const err = new Error('عرض السعر غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Validate status
  if (quotation.status !== 'gm_approved') {
    const err = new Error('عرض السعر لم يحصل على اعتماد المدير العام بعد');
    err.statusCode = 400;
    throw err;
  }

  const updated = await repo.approveForClient(id);

  // Notify quotation specialist
  await notifyRole('quotation_specialist', {
    title: 'عرض السعر جاهز للإرسال',
    message: `يمكنكم الآن إرسال عرض السعر النهائي للعميل`,
    type: 'success',
    entity_type: 'quotation',
    entity_id: id
  });

  return updated;
}

/**
 * Update quotation (before approval process)
 */
async function updateQuotation(id, data, userId) {
  const quotation = await repo.getQuotationById(id);
  if (!quotation) {
    const err = new Error('عرض السعر غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Check if quotation is still in editable state
  const editableStatuses = ['pending_finance_review', 'finance_rejected'];
  if (!editableStatuses.includes(quotation.status)) {
    const err = new Error('لا يمكن تعديل عرض السعر في حالته الحالية');
    err.statusCode = 400;
    throw err;
  }

  return await repo.updateQuotation(id, data);
}

/**
 * Delete quotation
 */
async function deleteQuotation(id, userId) {
  const quotation = await repo.getQuotationById(id);
  if (!quotation) {
    const err = new Error('عرض السعر غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Only admins can delete
  const { rows: [user] } = await query(
    `SELECT u.*, r.name AS role_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );

  const userRole = (user?.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager'].includes(userRole)) {
    const err = new Error('غير مصرّح لك بحذف عرض السعر');
    err.statusCode = 403;
    throw err;
  }

  return await repo.deleteQuotation(id);
}

/**
 * Get quotations by client email
 * Security: Client can ONLY see their own quotations
 */
async function getQuotationsByClientEmail(clientEmail) {
  // Find leads with this contact_email
  const { rows: leads } = await query(
    `SELECT id FROM leads WHERE contact_email = $1`,
    [clientEmail]
  );
  
  if (!leads || leads.length === 0) {
    return [];
  }
  
  const leadIds = leads.map(l => l.id);
  
  // Get inspection reports for these leads
  const { rows: inspections } = await query(
    `SELECT DISTINCT ir.id
     FROM inspection_reports ir
     JOIN inspections i ON i.lead_id = ANY($1::int[])
     WHERE ir.id IN (SELECT inspection_report_id FROM quotations)`,
    [leadIds]
  );
  
  if (!inspections || inspections.length === 0) {
    return [];
  }
  
  // Get all quotations linked to these inspections
  const quotationIds = inspections.map(i => i.inspection_report_id);
  const { rows } = await query(
    `SELECT q.*, l.client_name, l.contact_email, l.contact_phone
     FROM quotations q
     JOIN inspection_reports ir ON ir.id = q.inspection_report_id
     JOIN inspections i ON i.id = ir.inspection_id
     JOIN leads l ON l.id = i.lead_id
     WHERE l.contact_email = $1
     ORDER BY q.created_at DESC`,
    [clientEmail]
  );
  
  return rows || [];
}

/**
 * Client responds to quotation (approve or reject)
 * ENHANCED: Added security validation and fixed column names
 */
async function clientRespondToQuotation(quotationId, clientEmail, status, reason) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // 0. SECURITY: Verify quotation belongs to this client
        const ownershipCheck = await client.query(
            `SELECT q.id, l.contact_email, l.client_user_id
             FROM quotations q
             JOIN leads l ON l.id = q.lead_id
             WHERE q.id = $1::int`,
            [quotationId]
        );

        if (ownershipCheck.rows.length === 0) {
            throw new Error('عرض السعر غير موجود');
        }

        const quotation = ownershipCheck.rows[0];
        
        if (quotation.contact_email !== clientEmail) {
            throw new Error('ليس لديك صلاحية الرد على عرض السعر هذا');
        }

        // 1. تحديث جدول العروض
        const qResult = await client.query(
            `UPDATE quotations 
             SET client_response = $1::varchar, 
                 rejection_reason = $2::text, 
                 responded_at = NOW(),
                 status = $1::varchar
             WHERE id = $3::int
             RETURNING lead_id, total_price, boq_data`,
            [status, reason || null, quotationId]
        );

        if (qResult.rows.length === 0) throw new Error('فشل في تحديث عرض السعر');
        const leadId = qResult.rows[0].lead_id;
        const totalBudget = qResult.rows[0].total_price;
        const boqData = qResult.rows[0].boq_data;

        // 2. جلب بيانات العميل
        const leadResult = await client.query(
            `SELECT l.id,
                    l.client_name,
                    l.contact_email,
                    l.client_user_id,
                    l.technical_dept_id,
                    l.assigned_sales_rep_id,
                    l.assigned_engineer_id
             FROM leads l
             WHERE l.id = $1::int
             LIMIT 1`,
            [leadId]
        );

        if (leadResult.rows.length === 0) throw new Error('العميل غير موجود');
        const lead = leadResult.rows[0];

        // 3. تحديث حالة العميل
        const newLeadStatus = (status === 'client_approved') ? 'won' : 'lost';
        await client.query(
            `UPDATE leads SET status = $1::varchar, updated_at = NOW() WHERE id = $2::int`,
            [newLeadStatus, leadId]
        );

        // 4. إنشاء المشروع تلقائياً عند القبول
        if (status === 'client_approved') {
            const departmentId = lead.technical_dept_id;
            const salesRepId = lead.assigned_sales_rep_id;
            const engineerId = lead.assigned_engineer_id;

            const projectResult = await client.query(
                `INSERT INTO projects 
                 (name, description, department_id, assigned_sales_rep_id, assigned_engineer_id, 
                  total_budget, status, lead_id, quotation_id, created_at)
                 VALUES ($1::text, $2::text, $3::int, $4::int, $5::int, $6::numeric, $7::varchar, $8::int, $9::int, NOW())
                 RETURNING *`,
                [
                    `مشروع ${lead.client_name}`,
                    `مشروع تلقائي ناتج عن موافقة العميل - ${lead.client_name}`,
                    departmentId || null,
                    salesRepId || null,
                    engineerId || null,
                    totalBudget || 0,
                    'awaiting_pm_assignment',
                    leadId,
                    quotationId
                ]
            );

            const newProject = projectResult.rows[0];

            // تحديث عرض السعر بـ project_id
            await client.query(
                `UPDATE quotations SET project_id = $1::int WHERE id = $2::int`,
                [newProject.id, quotationId]
            );

            // إنشاء مهام المشروع من BOQ
            // Enhanced: Map BOQ fields to task metadata (quantity, unit_price, total)
            if (boqData && boqData.items && boqData.items.length > 0) {
                for (let i = 0; i < boqData.items.length; i++) {
                    const item = boqData.items[i] || {};
                    const title = (item.name || item.item || `مهمة ${i + 1}`).toString();
                    const description = (item.description || `بند من عرض السعر: ${item.name || item.item || 'بند ' + (i + 1)}`).toString();
                    
                    // Store BOQ-specific data in metadata JSONB column
                    const metadata = JSON.stringify({
                        boq_item: true,
                        quantity: item.quantity || item.quant || 0,
                        unit_price: item.unit_price || item.unitPrice || 0,
                        total: item.total || item.lineTotal || 0,
                        unit: item.unit || item.uom || 'piece',
                        source: 'quotation_boq',
                        quotation_id: quotationId
                    });
                    
                    await client.query(
                        `INSERT INTO tasks 
                         (project_id, title, description, status, priority, metadata, created_at)
                         VALUES ($1::int, $2::text, $3::text, 'pending'::varchar, 'medium'::varchar, $4::jsonb, NOW())`,
                        [newProject.id, title, description, metadata]
                    );
                }
            }

            // إشعار رئيس قسم المشاريع
            const pmoHeadResult = await client.query(
                `SELECT u.id FROM users u
                 JOIN roles r ON r.id = u.role_id
                 JOIN departments d ON d.id = u.department_id
                 WHERE r.name = 'dept_head' 
                   AND (LOWER(d.name) LIKE '%project%' OR d.name LIKE '%مشاريع%')
                 LIMIT 1`
            );

            if (pmoHeadResult.rows.length > 0) {
                const pmoHeadId = pmoHeadResult.rows[0].id;
                await client.query(
                    `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, created_at)
                     VALUES ($1::int, $2::text, $3::text, $4::varchar, $5::varchar, $6::int, NOW())`,
                    [
                        pmoHeadId,
                        'مشروع جديد جاهز للتعيين',
                        `يرجى تعيين مدير لمشروع "${newProject.name}"`,
                        'info',
                        'project',
                        newProject.id
                    ]
                );
            }

            // ✅ إشعار المدير العام — تصليح الـ $1 null
            await client.query(
                `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, created_at)
                 SELECT u.id, $1::text, $2::text, $3::varchar, $4::varchar, $5::int, NOW()
                 FROM users u
                 JOIN roles r ON r.id = u.role_id
                 WHERE r.name = 'general_manager'`,
                [
                    'مشروع جديد تلقائي 🎉',
                    `وافق العميل على العرض - تم إنشاء مشروع "${newProject.name}"`,
                    'success',
                    'project',
                    newProject.id
                ]
            );

            // إشعار العميل
            if (lead.client_user_id) {
                await client.query(
                    `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id, created_at)
                     VALUES ($1::int, $2::text, $3::text, $4::varchar, $5::varchar, $6::int, NOW())`,
                    [
                        lead.client_user_id,
                        'تم بدء مشروعكم 🎉',
                        'تم تحويل عرض السعر لمشروع قيد التنفيذ - يمكنكم متابعة التقدم من البوابة',
                        'success',
                        'project',
                        newProject.id
                    ]
                );
            }
        }

        await client.query('COMMIT');
        
        const { rows: [updatedQuotation] } = await client.query(
            `SELECT * FROM quotations WHERE id = $1`,
            [quotationId]
        );
        
        return updatedQuotation;

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error in clientRespondToQuotation:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Send quotation to client & auto-create client account if needed
 */
async function sendToClient(id, userId) {
  const quotation = await repo.getQuotationById(id);
  if (!quotation) {
    const err = new Error('عرض السعر غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Validate status - must be GM approved
  if (quotation.status !== 'gm_approved') {
    const err = new Error('لا يمكن إرسال العرض للعميل قبل اعتماد المدير العام');
    err.statusCode = 400;
    throw err;
  }

  // Get lead information (inspection_reports has lead_id directly in actual DB)
  const { rows: [lead] } = await query(
    `SELECT l.*, ir.id as inspection_report_id 
     FROM quotations q
     JOIN inspection_reports ir ON ir.id = q.inspection_report_id
     JOIN leads l ON l.id = ir.lead_id
     WHERE q.id = $1`,
    [id]
  );

  if (!lead) {
    const err = new Error('بيانات العميل غير موجودة');
    err.statusCode = 404;
    throw err;
  }

  const clientEmail = lead.contact_email;
  if (!clientEmail) {
    const err = new Error('البريد الإلكتروني للعميل غير موجود');
    err.statusCode = 400;
    throw err;
  }

  // Check if client user already exists by email (PRIMARY CHECK)
  const { rows: [userByEmail] } = await query(
    `SELECT u.id, u.email, u.is_first_login 
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1 AND r.name = 'client'`,
    [clientEmail]
  );

  let clientUserId = userByEmail?.id;
  let tempPassword = null;
  let isNewUser = false;

  // Create client user if doesn't exist
  if (!clientUserId) {
    // Generate temporary password
    const crypto = require('crypto');
    tempPassword = crypto.randomBytes(6).toString('hex'); // 12 char password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Get client role ID
    const { rows: [clientRole] } = await query(
      `SELECT id FROM roles WHERE name = 'client' LIMIT 1`
    );

    if (!clientRole) {
      const err = new Error('دور العميل غير موجود في النظام');
      err.statusCode = 500;
      throw err;
    }

    // Create client user
    const { rows: [newUser] } = await query(
      `INSERT INTO users (role_id, first_name, last_name, email, username, password_hash, phone, status, is_first_login, department_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', true, NULL)
       RETURNING id, email, first_name, last_name`,
      [
        clientRole.id,
        lead.client_name || 'عميل',
        '',
        clientEmail,
        clientEmail, // username = email
        hashedPassword,
        lead.contact_phone || null
      ]
    );

    clientUserId = newUser.id;
    isNewUser = true;

    // Update lead with client user link
    await query(
      `UPDATE leads SET client_user_id = $1, temp_password_sent = true, updated_at = NOW() WHERE id = $2`,
      [clientUserId, lead.id]
    );

    // Send email with credentials
    const { sendWelcomeEmail } = require('../../utils/mailer');
    const emailBody = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2 style="color: #1a1a2e;">مرحباً بك في شركة Smart Energy للطاقة</h2>
        <p>مرحباً ${lead.client_name || 'العميل العزيز'}،</p>
        <p>تم إنشاء حسابك في بوابة العملاء بنجاح. يمكنك الآن الدخول وعرض عروض الأسعار الخاصة بك والموافقة عليها.</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #22c55e; margin-top: 0;">بيانات الدخول:</h3>
          <p><strong>البريد الإلكتروني:</strong> ${clientEmail}</p>
          <p><strong>كلمة المرور المؤقتة:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px; font-size: 16px; font-weight: bold;">${tempPassword}</code></p>
        </div>
        
        <p style="color: #dc2626; font-weight: bold;">⚠️ مهم:</p>
        <p>سيُطلب منك تغيير كلمة المرور عند أول دخول لك.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:4200/login" 
             style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            تسجيل الدخول الآن
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px;">إذا لم تتوقع هذا البريد، يرجى تجاهله.</p>
      </div>
    `;

    try {
      await sendWelcomeEmail(clientEmail, emailBody, 'حسابك الجديد في بوابة العملاء - Smart Energy');
      console.log(`✅ Email sent to ${clientEmail} with credentials`);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError.message);
      // Don't throw error - user was created successfully
    }

    // Log temp password for fallback
    console.log(`🔑 Temporary password for ${clientEmail}: ${tempPassword}`);
  }

  // Update quotation status to sent_to_client
  const updated = await query(
    `UPDATE quotations 
     SET status = 'sent_to_client', 
         approved_by = $1, 
         approved_at = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [userId, id]
  );

  // Update lead status to quotation_sent
  await query(
    `UPDATE leads SET status = 'quotation_sent', updated_at = NOW() WHERE id = $1`,
    [lead.id]
  );

  // Notify client (if user exists)
  if (clientUserId) {
    await notify({
      user_id: clientUserId,
      title: 'عرض سعر جديد بانتظار مراجعتكم',
      message: `تم إرسال عرض سعر جديد - يرجى مراجعة البوابة والموافقة`,
      type: 'info',
      entity_type: 'quotation',
      entity_id: id
    });
  }

  // Notify quotation specialist
  await notifyRole('quotation_specialist', {
    title: 'تم إرسال عرض السعر للعميل',
    message: `تم إرسال عرض السعر للعميل ${lead.client_name}`, 
    type: 'success',
    entity_type: 'quotation',
    entity_id: id
  });

  // Notify GM
  await notifyRole('general_manager', {
    title: 'تم إرسال عرض السعر للعميل',
    message: `عرض السعر للعميل ${lead.client_name} بانتظار الرد`,
    type: 'info',
    entity_type: 'quotation',
    entity_id: id
  });

  return {
    quotation: updated.rows[0],
    client_user_id: clientUserId,
    temp_password: tempPassword // Will be null if user already existed
  };
}

/**
 * Convert approved quotation to project with BOQ migration
 */
async function convertQuotationToProject(id, userId) {
  const quotation = await repo.getQuotationById(id);
  if (!quotation) {
    const err = new Error('عرض السعر غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Validate - quotation must be client approved and payment confirmed
  const validStatuses = ['client_approved', 'downpayment_received', 'fully_paid'];
  if (!validStatuses.includes(quotation.client_response)) {
    const err = new Error('لا يمكن تحويل العرض لمشروع - العميل لم يوافق بعد');
    err.statusCode = 400;
    throw err;
  }

  // Check if already converted
  if (quotation.project_id) {
    const err = new Error('تم تحويل عرض السعر لمشروع مسبقاً');
    err.statusCode = 400;
    throw err;
  }

  // Get lead and inspection data (inspection_reports has lead_id directly)
  const { rows: [leadData] } = await query(
    `SELECT l.*, ir.report_text as summary, ir.images_urls as photos, ir.file_url
     FROM quotations q
     JOIN inspection_reports ir ON ir.id = q.inspection_report_id
     JOIN leads l ON l.id = ir.lead_id
     WHERE q.id = $1`,
    [id]
  );

  if (!leadData) {
    const err = new Error('بيانات العميل غير مكتملة');
    err.statusCode = 404;
    throw err;
  }

  // Create project
  const { rows: [newProject] } = await query(
    `INSERT INTO projects (
      quotation_id, client_id, name, description, budget, 
      start_date, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'planning', NOW(), NOW())
    RETURNING *`,
    [
      id,
      leadData.client_user_id || null,
      `مشروع ${leadData.client_name}`,
      `مشروع ناتج من عرض السعر - ${leadData.service_type || ''}`,
      quotation.total_price
    ]
  );

  // Migrate BOQ items to project tasks
  if (quotation.boq_data && quotation.boq_data.items) {
    const boqItems = quotation.boq_data.items;
    
    for (let i = 0; i < boqItems.length; i++) {
      const item = boqItems[i];
      
      // Create task from BOQ item
      await query(
        `INSERT INTO tasks (
          project_id, title, description, status, priority, 
          metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, 'pending', 'medium', $4, NOW(), NOW())`,
        [
          newProject.id,
          item.name || `مهمة ${i + 1}`,
          item.description || item.name || '',
          JSON.stringify({
            boq_item: true,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
            source_quotation_id: id
          })
        ]
      );
    }
  }

  // Update quotation with project link
  await query(
    `UPDATE quotations 
     SET project_id = $1, 
         converted_to_project_at = NOW(), 
         converted_by = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [newProject.id, userId, id]
  );

  // Update lead status to won
  await query(
    `UPDATE leads SET status = 'won', updated_at = NOW() WHERE id = $1`,
    [leadData.id]
  );

  // Notify stakeholders
  await notifyRole('general_manager', {
    title: 'تم تحويل العرض لمشروع 🎉',
    message: `تم إنشاء مشروع جديد للعميل ${leadData.client_name} - الميزانية: ${quotation.total_price}`,
    type: 'success',
    entity_type: 'project',
    entity_id: newProject.id
  });

  await notifyRole('project_manager', {
    title: 'مشروع جديد متاح للإدارة',
    message: `مشروع العميل ${leadData.client_name} جاهز للبدء - يرجى تعيين مدير المشروع`,
    type: 'warning',
    entity_type: 'project',
    entity_id: newProject.id
  });

  await notifyRole('finance_manager', {
    title: 'مشروع جديد - متابعة مالية',
    message: `تم تحويل عرض سعر العميل ${leadData.client_name} لمشروع - يرجى متابعة الدفعات`,
    type: 'info',
    entity_type: 'project',
    entity_id: newProject.id
  });

  // Notify client
  if (leadData.client_user_id) {
    await notify({
      user_id: leadData.client_user_id,
      title: 'تم بدء مشروعكم! 🎉',
      message: `تم تحويل عرض السعر لمشروع قيد التنفيذ - يمكنكم متابعة التقدم من البوابة`,
      type: 'success',
      entity_type: 'project',
      entity_id: newProject.id
    });
  }

  return {
    project: newProject,
    tasks_created: quotation.boq_data?.items?.length || 0,
    quotation_id: id
  };
}

/**
 * Confirm downpayment payment
 */
async function confirmDownpayment(id, amount, userId) {
  const quotation = await repo.getQuotationById(id);
  if (!quotation) {
    const err = new Error('عرض السعر غير موجود');
    err.statusCode = 404;
    throw err;
  }

  // Validate amount
  if (!amount || amount <= 0) {
    const err = new Error('المبلغ غير صحيح');
    err.statusCode = 400;
    throw err;
  }

  // Update payment status
  const updated = await query(
    `UPDATE quotations 
     SET payment_status = 'downpayment_received',
         downpayment_amount = $1,
         downpayment_date = NOW(),
         payment_confirmed_by = $2,
         payment_confirmed_at = NOW(),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [amount, userId, id]
  );

  // Get lead info
  const { rows: [lead] } = await query(
    `SELECT l.client_name, l.client_user_id
     FROM quotations q
     JOIN inspection_reports ir ON ir.id = q.inspection_report_id
     JOIN leads l ON l.id = ir.lead_id
     WHERE q.id = $1`,
    [id]
  );

  // Notify GM
  await notifyRole('general_manager', {
    title: 'تم استلام الدفعة الأولى',
    message: `تم استلام دفعة بقيمة ${amount} من العميل ${lead?.client_name || 'العميل'}`,
    type: 'success',
    entity_type: 'quotation',
    entity_id: id
  });

  // Notify finance
  await notifyRole('finance_manager', {
    title: 'تم تأكيد الدفعة الأولى',
    message: `العميل ${lead?.client_name || 'العميل'} - الدفعة: ${amount}`,
    type: 'success',
    entity_type: 'quotation',
    entity_id: id
  });

  // Notify client
  if (lead?.client_user_id) {
    await notify({
      user_id: lead.client_user_id,
      title: 'تم استلام الدفعة الأولى',
      message: 'شكراً لكم - سيتم بدء التنفيذ قريباً',
      type: 'success',
      entity_type: 'quotation',
      entity_id: id
    });
  }

  return updated.rows[0];
}

module.exports = {
  createQuotation,
  getQuotationById,
  getQuotationsByLeadId,
  getAllQuotations,
  financeReview,
  gmReview,
  approveForClient,
  updateQuotation,
  deleteQuotation,
  getQuotationsByClientEmail,
  clientRespondToQuotation,
  sendToClient,
  convertQuotationToProject,
  confirmDownpayment
};
