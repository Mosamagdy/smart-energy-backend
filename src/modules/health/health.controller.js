function healthCheck(req, res) {
  res.json({ status: 'ok', uptime: process.uptime(), message: 'Healthy' });
}

module.exports = {
  healthCheck
};
