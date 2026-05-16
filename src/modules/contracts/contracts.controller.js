const multer = require('multer');
const path = require('path');
const fs = require('fs');
const service = require('./contracts.service');

// Configure multer for contract PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'contracts');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `contract-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('يُسمح فقط بملفات PDF'));
    }
  }
});

// ============================================================================
// Contracts Controller - HTTP Request Handlers
// ============================================================================

/**
 * POST /api/contracts
 * Create a new contract with PDF upload
 */
async function createContract(req, res, next) {
  try {
    // Handle file upload if present
    let attachmentUrl = null;
    
    if (req.file) {
      attachmentUrl = `/uploads/contracts/${req.file.filename}`;
    }

    // Parse form data if multipart
    const contractData = { ...req.body };
    
    if (attachmentUrl) {
      contractData.attachment_url = attachmentUrl;
    }

    const contract = await service.createContract(contractData, req.user);
    
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء العقد بنجاح',
      data: { contract }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contracts
 * List all contracts (filtered by role)
 */
async function getAllContracts(req, res, next) {
  try {
    const filters = {};
    
    if (req.query.project_id) {
      filters.project_id = parseInt(req.query.project_id);
    }
    
    if (req.query.client_id) {
      filters.client_id = parseInt(req.query.client_id);
    }
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    if (req.query.contract_type) {
      filters.contract_type = req.query.contract_type;
    }
    
    const contracts = await service.getAllContracts(filters, req.user);
    
    res.status(200).json({
      status: 'success',
      data: { contracts, count: contracts.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contracts/:id
 * Get single contract details
 */
async function getContractById(req, res, next) {
  try {
    const contract = await service.getContractById(req.params.id, req.user);
    
    res.status(200).json({
      status: 'success',
      data: { contract }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/contracts/:id
 * Update contract information
 */
async function updateContract(req, res, next) {
  try {
    const contract = await service.updateContract(req.params.id, req.body, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث العقد',
      data: { contract }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/contracts/:id/sign
 * Sign contract
 */
async function signContract(req, res, next) {
  try {
    const { signed_by } = req.body;
    
    if (!signed_by) {
      const err = new Error('يجب تحديد طرف التوقيع');
      err.statusCode = 400;
      throw err;
    }
    
    const contract = await service.signContract(req.params.id, signed_by, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'تم توقيع العقد بنجاح',
      data: { contract }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contracts/expiring
 * Get expiring contracts
 */
async function getExpiringContracts(req, res, next) {
  try {
    const daysThreshold = req.query.days || 30;
    const contracts = await service.getExpiringContracts(parseInt(daysThreshold));
    
    res.status(200).json({
      status: 'success',
      data: { contracts, count: contracts.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ✅ POST /api/contracts/:projectId/upload
 * Upload contract for a specific project and update contract_status
 */
async function uploadContract(req, res, next) {
  try {
    const { projectId } = req.params;
    
    if (!req.file) {
      const err = new Error('يجب رفع ملف العقد');
      err.statusCode = 400;
      throw err;
    }

    // Get the relative file path
    const attachmentUrl = `/uploads/contracts/${req.file.filename}`;

    // Upload contract and update project status
    const result = await service.uploadContractForProject(
      projectId,
      attachmentUrl,
      req.user
    );

    res.status(200).json({
      status: 'success',
      message: 'تم رفع العقد بنجاح',
      data: {
        contract: result.contract,
        project: result.project,
        redirect_url: `/projects/${projectId}/reports`  // Post-upload redirect
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  upload,
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  signContract,
  getExpiringContracts,
  uploadContract,  // ✅ Export new function
};
