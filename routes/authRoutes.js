const express = require('express');
const router = express.Router();
const { axiosInstance, axiosInstance2} = require('../utils/axios');
const qs = require('qs');
const validateToken = require('./middlewares/validateToken');
require("../logger"); // Require the logger utility to store the logs
const crypto = require('crypto');
require('dotenv').config();


// Encryption setup (replace with your secure 32-byte key)
const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.IP_KEY); // 32 bytes for AES-256

function encrypt(text) {
  const iv = crypto.randomBytes(12); // 12-byte IV for AES-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  return `${encrypted}:${iv.toString('base64')}:${authTag}`;
}


// login route
router.get('/', (req, res) => {
  // Check if session already contains valid auth data
  const { token, jsessionid, refresh_token } = req.session;

  // If session exists, skip login and go to dashboard
  if (token && jsessionid && refresh_token) {
    return res.redirect('/dashboard');
  }

  // Otherwise, render the login page
  res.render('login');
});


router.post('/', async (req, res) => {
  const clientIp = req.ip;
  const { username, password } = req.body;

  try{
    const response = await axiosInstance.post('/login', 
      qs.stringify({username, password}),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Client-Ip': encrypt(clientIp)
        }
      });


    console.log(response.data);
    const {token, refresh_token} = response.data;
    const cookies = response.headers['set-cookie'];
    let jsessionid = null;

    if (cookies) {
      const jsessionidCookie = cookies.find(cookie => cookie.includes('JSESSIONID'));
      if (jsessionidCookie) {
        jsessionid = jsessionidCookie.split(';')[0];
      }
    }


    if (!token || !jsessionid) {
      return res.json({ success: false, message: 'Missing auth token or session cookie.' });
    }

    // Store sesion in data
    req.session.token = token;
    req.session.jsessionid = jsessionid;
    req.session.refresh_token = refresh_token;

    // Save session before redirect
    req.session.save(err => {
      if (err) {
         return res.json({ success: false, message: 'Session save failed.' });
      }
      
      return res.json({
        success: true,
        message: 'Login successful!',
        redirect: '/dashboard'
      });
    });

  } catch (err) {
    console.error('Login failed:', err.response?.data || err);
    res.json({
      success: false,
      message: 'Invalid credentials. Please try again.'
    });
  }
});


// Dashboard route
router.get('/dashboard', validateToken, async (req, res) => {
  const token = req.session.token;
  const clientIp = req.ip;
  const jsessionid = req.session.jsessionid;

  if (!token || !jsessionid) {
    req.flash('error', 'Please log in to access the dashboard!');
    return res.redirect('/');
  }

  try {
    const [userRes, rolesRes, ticketStats1, ticketRes2] = await Promise.all([
      axiosInstance.get('/auth/getUsername', {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: jsessionid,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Client-Ip': encrypt(clientIp)
        }
      }),
      axiosInstance.get('/auth/getRoles', {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: jsessionid,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Client-Ip': encrypt(clientIp)
        }
      }),
      axiosInstance2.get('/api/getTicketStatistics', {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: jsessionid,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Client-Ip': encrypt(clientIp)
        }
      }),
      axiosInstance2.get('/api/getRecentActivity', {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: jsessionid,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Client-Ip': encrypt(clientIp)
        }
      }),
    ]);

    
    const { name, username} = userRes.data;
    const role = rolesRes.data.roles;
    const recentActivity = ticketRes2.data.activity;

  
    const ticketStats = {
      total: ticketStats1.data.ticketStats.totalTickets,
      open: ticketStats1.data.ticketStats.openTickets,
      inprogress: ticketStats1.data.ticketStats.inProgressTickets,
      resolved: ticketStats1.data.ticketStats.resolvedTickets,
      closed: ticketStats1.data.ticketStats.closedTickets
    };

    req.session.name = name ;
    req.session.username = username ;
    req.session.role = role ;

    res.render('dashboard', { 
      name,
      username,
      role,
      activity: recentActivity,
      ticketStats
    });

  } catch (err) {
    console.error('Failed to fetch user info:', err.response?.data || err.message);
    req.flash('error', 'Session expired. Please log in again.');
    req.session.destroy(() => res.redirect('/'));
  }
});


// Logout route
router.get('/logout', (req, res) => {
  const token = req.session.token;
  const jsessionid = req.session.jsessionid;
  
  if (!token || !jsessionid) {
    return res.json({
            success: false,
            message: 'No active session to logout.',
            redirect: '/'
        });
  }

  req.session.destroy((err)=> {

    if (err) {
      return res.json({
                success: false,
                message: 'Failed to logout. Please try again.',
                redirect: '/'
            });
    }
    
    res.json({
    success: true,
    message: 'Logout successful, Bye!', 
    redirect: '/'});
  });
});


module.exports = router;