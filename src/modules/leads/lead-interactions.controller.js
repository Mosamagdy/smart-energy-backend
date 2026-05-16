const interactionsService = require('./lead-interactions.service');

/**
 * POST /api/leads/:id/interactions
 * Log a new interaction (call/email/meeting/note)
 * Allowed: sales_rep, dept_head, general_manager
 */
async function createInteraction(req, res, next) {
  try {
    const { interaction_type, description, next_follow_up_date } = req.body;

    // Validate required fields
    if (!interaction_type || !description) {
      const err = new Error('نوع التفاعل والوصف مطلوبان');
      err.statusCode = 400;
      return next(err);
    }

    // Validate interaction type
    const validTypes = ['call', 'email', 'meeting', 'note'];
    if (!validTypes.includes(interaction_type)) {
      const err = new Error('نوع التفاعل غير صالح');
      err.statusCode = 400;
      return next(err);
    }

    const interaction = await interactionsService.createInteraction(
      req.params.id,
      { interaction_type, description, next_follow_up_date },
      req.user.id
    );

    res.status(201).json({
      status: 'success',
      message: 'تم تسجيل التفاعل بنجاح',
      data: { interaction }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads/:id/interactions
 * Get all interactions for a lead
 * Allowed: authenticated users
 */
async function getInteractions(req, res, next) {
  try {
    const interactions = await interactionsService.getInteractionsByLeadId(req.params.id);

    res.status(200).json({
      status: 'success',
      data: { interactions, count: interactions.length }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/leads/:id/request-survey
 * Request technical survey/inspection
 * Allowed: sales_rep, dept_head, general_manager
 */
async function requestSurvey(req, res, next) {
  try {
    const updatedLead = await interactionsService.requestTechnicalSurvey(
      req.params.id,
      req.user.id
    );

    res.status(200).json({
      status: 'success',
      message: 'تم طلب المعاينة الفنية بنجاح',
      data: { lead: updatedLead }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/leads/follow-ups/upcoming
 * Get upcoming follow-ups (for dashboard/notifications)
 * Allowed: authenticated users
 */
async function getUpcomingFollowUps(req, res, next) {
  try {
    const daysAhead = parseInt(req.query.days) || 3;
    const followUps = await interactionsService.getUpcomingFollowUps(daysAhead);

    res.status(200).json({
      status: 'success',
      data: { followUps, count: followUps.length }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createInteraction,
  getInteractions,
  requestSurvey,
  getUpcomingFollowUps
};
