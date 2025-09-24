// middlewares/validateToken.js
const { axiosInstance} = require('../../utils/axios');
require("../../logger"); // Require the logger utility to store the logs

const validateTokenMiddleware = async (req, res, next) => {
  const token = req.session.token;
  const jsessionid = req.session.jsessionid;

  if (!token || !jsessionid) {
    return res.redirect('/?error=Session expired. Please login again!');
  }

  try {
    await axiosInstance.get('/auth/isTokenValid', {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: jsessionid
      }
    });

    // Token is valid, continue
    next();

  } catch (err) {
    console.error('Token validation failed:', err.response?.data || err.message);

    // Optional: clear session
    req.session.destroy(() => {
      res.redirect('/?error=Session expired. Please login again!');
    });
  }
};

module.exports = validateTokenMiddleware;
