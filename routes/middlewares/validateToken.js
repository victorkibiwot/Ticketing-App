// middlewares/validateToken.js
const { axiosInstance } = require('../../utils/axios');
require("../../logger"); // Require the logger utility to store the logs

const validateTokenMiddleware = async (req, res, next) => {
  const token = req.session.token;
  const jsessionid = req.session.jsessionid;
  const refreshToken = req.session.refresh_token;

  if (!token || !jsessionid) {
    return res.redirect('/?error=Missing token or jsessionid. Please login again!');
  }

  try {
    // Step 1: Validate current token
    await axiosInstance.get('/auth/isTokenValid', {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: jsessionid
      }
    });

    // Token is valid
    return next();

  } catch (err) {
    console.error('Token validation failed:', err.response?.data || err.message);

    // Step 2: Try refreshing the token if refresh_token exists
    if (refreshToken) {
      try {
        const response = await axiosInstance.get('/auth/refreshToken', {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
            Cookie: jsessionid  // pass the current jsessionid along
          }
        });

        if (response.data && response.data.token) {
          const { token: newToken, refresh_token: newRefreshToken } = response.data;

          // Update tokens in session
          req.session.token = newToken;
          if (newRefreshToken) {
            req.session.refresh_token = newRefreshToken; // update refresh token if provided
          }

          // Extract new JSESSIONID from Set-Cookie header
          const cookies = response.headers['set-cookie'];
          if (cookies) {
            const jsessionidCookie = cookies.find(cookie => cookie.includes('JSESSIONID'));
            if (jsessionidCookie) {
              req.session.jsessionid = jsessionidCookie.split(';')[0];
            }
          }

          console.log("Access token refreshed successfully.");
          return next();
        }
      } catch (refreshErr) {
        console.error('Token refresh failed:', refreshErr.response?.data || refreshErr.message);
      }
    }

    // Step 3: Clear session and redirect if all fails
    req.session.destroy(() => {
      res.redirect('/?error=Session expired. Please login again!');
    });
  }
};

module.exports = validateTokenMiddleware;
