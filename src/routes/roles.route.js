const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authMiddleware } = require('../middlewares/auth');
const roleMiddleware = require('../middlewares/role');

// All authenticated users can read roles
router.use(authMiddleware);

/**
 * GET /api/roles
 * Get all available roles
 */
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, description, created_at, updated_at 
       FROM roles 
       ORDER BY name ASC`
    );
    
    res.status(200).json({
      status: 'success',
      data: { roles: result.rows }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
