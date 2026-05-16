const express = require('express');
const router = express.Router({ mergeParams: true });
const { query } = require('../../db');
const { authMiddleware } = require('../../middlewares/auth');
const roleMiddleware = require('../../middlewares/role');

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * Project Documents Aggregation Routes
 * Provides a unified endpoint to fetch all documents for a project
 */

// GET /api/projects/:id/documents - Get all project documents
router.get(
  '/',
  roleMiddleware(['super_admin', 'general_manager', 'project_manager', 'engineer', 'dep_pr_manager', 'tech_head', 'mc_manager', 'qs_manager', 'finance_manager']),
  async (req, res, next) => {
    console.log('✅ Project Documents Route Hit! Project ID:', req.params.id);
    try {
      const projectId = parseInt(req.params.id);
      
      if (!projectId || isNaN(projectId)) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'معرف المشروع غير صالح',
          debug: { params: req.params, query: req.query }
        });
      }
      
      const baseUrl = process.env.BASE_URL ;

      // Fetch all document types in parallel
      const [projectResult, inspectionsResult, quotationsResult, contractsResult, invoicesResult] = await Promise.all([
        // 1. Get project details
        query(`SELECT id, name, client_id, lead_id, quotation_id FROM projects WHERE id = $1`, [projectId]),
        
        // 2. Get inspection reports (via project.lead_id)
        query(`
          SELECT 
            ir.id,
            ir.summary,
            ir.photos,
            ir.file_url,
            ir.status,
            ir.created_at,
            u.first_name || ' ' || u.last_name AS uploader_name,
            ir.lead_id,
            ir.user_id
          FROM inspection_reports ir
          LEFT JOIN users u ON ir.user_id = u.id
          WHERE ir.lead_id = (SELECT lead_id FROM projects WHERE id = $1)
          ORDER BY ir.created_at DESC
        `, [projectId]),
        
        // 3. Get quotations (via project.quotation_id)
        query(`
          SELECT 
            q.id,
            q.status,
            q.total_price,
            q.boq_data,
            q.created_at,
            q.approved_at,
            u.first_name || ' ' || u.last_name AS created_by_name
          FROM quotations q
          LEFT JOIN users u ON u.id = q.created_by
          WHERE q.id = (SELECT quotation_id FROM projects WHERE id = $1)
        `, [projectId]),
        
        // 4. Get contracts
        query(`
          SELECT 
            c.id,
            c.contract_number,
            c.status,
            c.start_date,
            c.end_date,
            c.contract_value,
            c.attachment_url AS file_path,
            c.created_at,
            u.first_name || ' ' || u.last_name AS created_by_name
          FROM contracts c
          LEFT JOIN users u ON u.id = c.created_by
          WHERE c.project_id = $1
          ORDER BY c.created_at DESC
        `, [projectId]),
        
        // 5. Get invoices
        query(`
          SELECT 
            i.id,
            i.invoice_number,
            i.invoice_type,
            i.status,
            i.total_amount,
            i.issue_date,
            i.file_path,
            i.pdf_path,
            i.created_at,
            u.first_name || ' ' || u.last_name AS created_by_name
          FROM invoices i
          LEFT JOIN users u ON u.id = i.created_by
          WHERE i.project_id = $1
          ORDER BY i.created_at DESC
        `, [projectId])
      ]);

      const project = projectResult.rows[0];
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found' });
      }

      // Strict: tech_head can only access documents for projects in their department
      const role = (req.user?.role || req.user?.role_name || '').toLowerCase();
      if (role === 'tech_head') {
        const userDeptId = req.user?.department_id;
        if (!userDeptId || Number(project.department_id) !== Number(userDeptId)) {
          return res.status(403).json({ status: 'error', message: 'Forbidden' });
        }
      }

      const documents = [];

      // Process Inspection Reports
      inspectionsResult.rows.forEach(report => {
        // Add main file if exists
        if (report.file_url) {
          const fileExt = report.file_url.split('.').pop().toLowerCase();
          const fileType = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt) ? 'image' : 'pdf';
          
          documents.push({
            id: `inspection_${report.id}`,
            document_type: 'inspection_report',
            file_name: `تقرير معاينة #${report.id}`,
            file_path: report.file_url.startsWith('http') ? report.file_url : `${baseUrl}${report.file_url}`,
            file_type: fileType,
            category: 'technical',
            category_label: 'تقرير معاينة',
            upload_date: report.created_at,
            uploader_name: report.uploader_name || 'النظام',
            description: report.summary || `الحالة: ${report.status}`,
            status: report.status
          });
        }

        // Add photos from JSONB array
        if (report.photos && Array.isArray(report.photos)) {
          report.photos.forEach((photoUrl, index) => {
            documents.push({
              id: `inspection_photo_${report.id}_${index}`,
              document_type: 'inspection_photo',
              file_name: `صورة معاينة #${report.id} - ${index + 1}`,
              file_path: photoUrl.startsWith('http') ? photoUrl : `${baseUrl}${photoUrl}`,
              file_type: 'image',
              category: 'technical',
              category_label: 'صورة معاينة',
              upload_date: report.created_at,
              uploader_name: report.uploader_name || 'النظام',
              description: `صورة من تقرير المعاينة #${report.id}`
            });
          });
        }
      });

      // Process Quotations
      quotationsResult.rows.forEach(quotation => {
        // Generate PDF path (quotations are auto-generated PDFs)
        const quotationPdfPath = `/uploads/quotations/quotation-${quotation.id}.pdf`;
        
        documents.push({
          id: `quotation_${quotation.id}`,
          document_type: 'quotation',
          file_name: `عرض سعر #${quotation.id}`,
          file_path: `${baseUrl}${quotationPdfPath}`,
          file_type: 'pdf',
          category: 'technical',
          category_label: 'عرض سعر',
          upload_date: quotation.created_at,
          uploader_name: quotation.created_by_name || 'النظام',
          description: quotation.status === 'approved' ? 'تمت الموافقة' : 'قيد المراجعة',
          status: quotation.status,
          metadata: {
            total_price: quotation.total_price,
            boq_data: quotation.boq_data
          }
        });
      });

      // Process Contracts
      contractsResult.rows.forEach(contract => {
        if (contract.file_path) {
          documents.push({
            id: `contract_${contract.id}`,
            document_type: 'contract',
            file_name: `عقد #${contract.contract_number || contract.id}`,
            file_path: contract.file_path.startsWith('http') ? contract.file_path : `${baseUrl}${contract.file_path}`,
            file_type: 'pdf',
            category: 'contract',
            category_label: 'عقد',
            upload_date: contract.created_at,
            uploader_name: contract.created_by_name || 'النظام',
            description: `قيمة العقد: ${contract.contract_value?.toLocaleString() || 0} ريال - ${contract.status}`,
            status: contract.status,
            metadata: {
              start_date: contract.start_date,
              end_date: contract.end_date,
              contract_value: contract.contract_value
            }
          });
        }
      });

      // Process Invoices
      invoicesResult.rows.forEach(invoice => {
        const filePath = invoice.file_path || invoice.pdf_path;
        if (filePath) {
          documents.push({
            id: `invoice_${invoice.id}`,
            document_type: 'invoice',
            file_name: `فاتورة #${invoice.invoice_number || invoice.id} - ${invoice.invoice_type === 'sales' ? 'مبيعات' : 'مشتريات'}`,
            file_path: filePath.startsWith('http') ? filePath : `${baseUrl}${filePath}`,
            file_type: 'pdf',
            category: 'financial',
            category_label: 'فاتورة',
            upload_date: invoice.created_at || invoice.issue_date,
            uploader_name: invoice.created_by_name || 'النظام',
            description: `${invoice.total_amount?.toLocaleString() || 0} ريال - ${invoice.status}`,
            status: invoice.status,
            metadata: {
              invoice_type: invoice.invoice_type,
              total_amount: invoice.total_amount,
              issue_date: invoice.issue_date
            }
          });
        }
      });

      res.status(200).json({
        status: 'success',
        data: {
          project,
          documents,
          summary: {
            total_documents: documents.length,
            inspection_reports: documents.filter(d => d.document_type.startsWith('inspection')).length,
            quotations: documents.filter(d => d.document_type === 'quotation').length,
            contracts: documents.filter(d => d.document_type === 'contract').length,
            invoices: documents.filter(d => d.document_type === 'invoice').length
          }
        }
      });
    } catch (error) {
      console.error('Error fetching project documents:', error);
      next(error);
    }
  }
);

module.exports = router;