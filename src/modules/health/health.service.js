// Business logic placeholder for health module
function getHealth() {
  return {
    status: 'ok',
    uptime: process.uptime()
  };
}

module.exports = {
  getHealth
};
