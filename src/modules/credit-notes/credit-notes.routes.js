const express = require('express');
const router = express.Router();
const creditNoteService = require('./credit-notes.service');
const { authMiddleware } = require('../../middlewares/auth');
const path = require('path');
const fs = require('fs');

// ============================================================================
// Credit Notes API Routes - ZATCA Compliant Sales Returns
// ============================================================================

/**
 * POST /api/credit-notes
 * Create a new credit note
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const creditNote = await creditNoteService.createCreditNote(req.body, req.user);
    res.status(201).json({
      message: 'تم إنشاء إشعار الدائن بنجاح',
      data: creditNote
    });
  } catch (error) {
    console.error('[CreditNotes] Create error:', error);
    res.status(error.statusCode || 500).json({
      message: error.message || 'خطأ في إنشاء إشعار الدائن'
    });
  }
});

/**
 * GET /api/credit-notes
 * Get all credit notes with optional filters
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filters = {
      invoice_id: req.query.invoice_id,
      client_id: req.query.client_id,
      status: req.query.status
    };

    const creditNotes = await creditNoteService.getAllCreditNotes(filters);

    res.status(200).json({
      data: creditNotes,
      count: creditNotes.length
    });
  } catch (error) {
    console.error('[CreditNotes] Get all error:', error);
    res.status(500).json({
      message: 'خطأ في جلب إشعارات الدائن'
    });
  }
});

/**
 * GET /api/credit-notes/:id
 * Get credit note by ID with items
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const creditNote = await creditNoteService.getCreditNoteById(req.params.id);

    if (!creditNote) {
      return res.status(404).json({
        message: 'إشعار الدائن غير موجود'
      });
    }

    res.status(200).json({
      data: creditNote
    });
  } catch (error) {
    console.error('[CreditNotes] Get by ID error:', error);
    res.status(500).json({
      message: 'خطأ في جلب إشعار الدائن'
    });
  }
});

/**
 * POST /api/credit-notes/:id/finalize
 * Finalize credit note (draft → final)
 */
router.post('/:id/finalize', authMiddleware, async (req, res) => {
  try {
    const creditNote = await creditNoteService.finalizeCreditNote(req.params.id, req.user);

    res.status(200).json({
      message: 'تم تأكيد إشعار الدائن بنجاح',
      data: creditNote
    });
  } catch (error) {
    console.error('[CreditNotes] Finalize error:', error);
    res.status(error.statusCode || 500).json({
      message: error.message || 'خطأ في تأكيد إشعار الدائن'
    });
  }
});

/**
 * GET /api/credit-notes/:id/pdf
 * Generate and download Credit Note PDF
 */
router.get('/:id/pdf', authMiddleware, async (req, res) => {
  try {
    const { generateCreditNotePDF } = require('../../services/credit-note-pdf.service');
    const creditNote = await creditNoteService.getCreditNoteById(req.params.id);
    
    if (!creditNote) {
      return res.status(404).json({ message: 'إشعار الدائن غير موجود' });
    }
    
    // Generate PDF
    const pdfPath = await generateCreditNotePDF(creditNote);
    
    // Send file for download
    const fullPath = path.join(__dirname, '../../../', pdfPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'ملف PDF غير موجود' });
    }
    
    res.download(fullPath, `credit-note-${creditNote.credit_note_number}.pdf`);
  } catch (error) {
    console.error('[CreditNotes] PDF generation error:', error);
    res.status(500).json({ message: 'فشل في إنشاء PDF' });
  }
});

module.exports = router;
