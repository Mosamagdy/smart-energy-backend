const { query } = require('../../db');

/**
 * Create a new lead interaction (call/email/meeting/note)
 */
async function createInteraction({
  lead_id,
  interaction_type,
  description,
  performed_by,
  next_follow_up_date
}) {
  const result = await query(
    `INSERT INTO lead_interactions 
       (lead_id, interaction_type, description, performed_by, next_follow_up_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [lead_id, interaction_type, description, performed_by, next_follow_up_date || null]
  );
  return result.rows[0];
}

/**
 * Get all interactions for a lead with performer info
 */
async function getInteractionsByLeadId(leadId) {
  const result = await query(
    `SELECT 
       li.*,
       u.first_name || ' ' || u.last_name AS performed_by_name,
       u.email AS performed_by_email
     FROM lead_interactions li
     LEFT JOIN users u ON u.id = li.performed_by
     WHERE li.lead_id = $1
     ORDER BY li.created_at DESC`,
    [leadId]
  );
  return result.rows;
}

/**
 * Get single interaction by ID
 */
async function getInteractionById(id) {
  const result = await query(
    `SELECT 
       li.*,
       u.first_name || ' ' || u.last_name AS performed_by_name
     FROM lead_interactions li
     LEFT JOIN users u ON u.id = li.performed_by
     WHERE li.id = $1
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Update interaction
 */
async function updateInteraction(id, { description, next_follow_up_date }) {
  const result = await query(
    `UPDATE lead_interactions SET
       description = COALESCE($1, description),
       next_follow_up_date = COALESCE($2, next_follow_up_date),
       updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [description, next_follow_up_date, id]
  );
  return result.rows[0] || null;
}

/**
 * Delete interaction
 */
async function deleteInteraction(id) {
  await query(`DELETE FROM lead_interactions WHERE id = $1`, [id]);
}

/**
 * Get upcoming follow-ups (for notifications)
 */
async function getUpcomingFollowUps(daysAhead = 3) {
  const result = await query(
    `SELECT 
       li.*,
       l.client_name,
       u.first_name || ' ' || u.last_name AS performed_by_name
     FROM lead_interactions li
     JOIN leads l ON l.id = li.lead_id
     LEFT JOIN users u ON u.id = li.performed_by
     WHERE li.next_follow_up_date IS NOT NULL
       AND li.next_follow_up_date <= NOW() + INTERVAL '${daysAhead} days'
       AND li.next_follow_up_date >= NOW()
     ORDER BY li.next_follow_up_date ASC`,
    []
  );
  return result.rows;
}

module.exports = {
  createInteraction,
  getInteractionsByLeadId,
  getInteractionById,
  updateInteraction,
  deleteInteraction,
  getUpcomingFollowUps
};
