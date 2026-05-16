const service = require('./employees.service');

// ============================================================================
// Employees Controller - Request Handler Layer
// ============================================================================

async function createEmployee(req, res, next) {
  try {
    const employee = await service.createEmployee(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'تم إنشاء الموظف بنجاح',
      data: employee
    });
  } catch (error) {
    next(error);
  }
}

async function getAllEmployees(req, res, next) {
  try {
    const { department, department_id, is_active } = req.query;
    const filters = {};
    
    // ✅ Support both query params AND route params (for /departments/:id/employees)
    const deptId = department_id || req.params.id;
    
    if (deptId) {
      filters.department_id = parseInt(deptId, 10);
    } else if (department) {
      filters.department = department;
    }
    
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const employees = await service.getAllEmployees(filters);
    res.status(200).json({
      status: 'success',
      data: { employees }  // ✅ Wrap in { employees: [] } for frontend compatibility
    });
  } catch (error) {
    next(error);
  }
}

async function getEmployeeById(req, res, next) {
  try {
    const employee = await service.getEmployeeById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: employee
    });
  } catch (error) {
    next(error);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const employee = await service.updateEmployee(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'تم تحديث الموظف بنجاح',
      data: employee
    });
  } catch (error) {
    next(error);
  }
}

async function uploadEmployeeFiles(req, res, next) {
  try {
    const employeeId = req.params.id;
    const files = req.files;
    
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }
    
    // Build file paths to update in database
    const fileUpdates = {};
    
    // files is an object with field names as keys and arrays of files as values
    Object.keys(files).forEach(fieldname => {
      const file = files[fieldname][0]; // Take the first file for each field
      
      // Convert field name to database column (based on ACTUAL DB schema)
      const fieldMap = {
        'passport_file': 'passport_file_path',
        'national_id_file': 'id_document_url',  // DB column is id_document_url
        'residence_file': 'residence_file_path',
        'contract_file': 'contract_file_path'
      };
      
      const dbColumn = fieldMap[fieldname];
      if (dbColumn) {
        // Store relative path: uploads/employees/{id}/filename.ext
        fileUpdates[dbColumn] = file.path.replace(/\\/g, '/');
      }
    });
    
    // Update employee record with file paths
    const employee = await service.updateEmployee(employeeId, fileUpdates, req.user);
    
    res.status(200).json({
      status: 'success',
      message: 'Files uploaded successfully',
      data: employee
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  uploadEmployeeFiles
};
