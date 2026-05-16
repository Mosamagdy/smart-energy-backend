const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================================================
// Employee File Upload Configuration - ID-Based Folder Structure
// ============================================================================

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'employees');

// Ensure base directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('[Multer-Employees] Created base upload directory:', uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Employee ID must be available in route params
    const employeeId = req.params.id;
    
    if (!employeeId) {
      return cb(new Error('Employee ID is required for file upload'));
    }
    
    // Create ID-based folder: uploads/employees/{id}/
    const employeeDir = path.join(uploadDir, String(employeeId));
    
    if (!fs.existsSync(employeeDir)) {
      fs.mkdirSync(employeeDir, { recursive: true });
      console.log(`[Multer-Employees] Created folder for employee ${employeeId}:`, employeeDir);
    }
    
    cb(null, employeeDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const fieldName = file.fieldname; // passport_file, national_id_file, etc.
    cb(null, `${fieldName}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Only PDF, JPG, PNG files are allowed');
    error.statusCode = 400;
    cb(error, false);
  }
};

const uploadEmployeeFiles = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = uploadEmployeeFiles;
