const express = require('express');
const router = express.Router();
const { axiosInstance, axiosInstance2} = require('../utils/axios');
const qs = require('qs');
const validateToken = require('./middlewares/validateToken');


// login routes
router.get('/', (req, res) => {
  res.render('login');
});


router.post('/', async (req, res) => {
  const { username, password } = req.body;

  try{
    const response = await axiosInstance.post('/login', 
      qs.stringify({username, password}),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

  
    const {token} = response.data;
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
  const jsessionid = req.session.jsessionid;

  if (!token || !jsessionid) {
    req.flash('error', 'Please log in to access the dashboard!');
    return res.redirect('/');
  }

  try {
    const [userRes, rolesRes, ticketsRes] = await Promise.all([
      axiosInstance.get('/auth/getUsername', {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: jsessionid
        }
      }),
      axiosInstance.get('/auth/getRoles', {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: jsessionid
        }
      }),
      axiosInstance2.get('/api/getAllTickets', {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: jsessionid
        }
      })
    ]);

    
    const { name, username} = userRes.data;
    const role = rolesRes.data.roles;
    const tickets = ticketsRes.data.tickets || [];

    // Extract recent activity for this user
    // Util function: get "time ago" label
    const timeAgo = (date) => {
      const diffMs = Date.now() - new Date(date).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? "s" : ""} ago`;
      const diffDays = Math.floor(diffHrs / 24);
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    };

    const activity = [];
    tickets.forEach(ticket => {
      const isCreator = ticket.creatorUsername === username;
      const isAssignee = ticket.assigneeUsername === username;
      const isAssigner = ticket.assignedByUsername === username;

      // 1. New Ticket
      if (isCreator && ticket.createdAt) {
        activity.push({
          msg: `New ticket ${ticket.ticketId} created`,
          time: ticket.createdAt
        });
      }

      // 2. You were assigned ticket
      if (isAssignee && ticket.updatedAt) {
        activity.push({
          msg: `You were assigned ticket ${ticket.ticketId}`,
          time: ticket.assignedAt || ticket.updatedAt
        });
      }

      // 3. You assigned a ticket
      if (isAssigner && ticket.updatedAt) {
        activity.push({
          msg: `You assigned ticket ${ticket.ticketId}`,
          time: ticket.updatedAt
        });
      }

      // 4. Your ticket was acted upon
      if (isCreator) {
        if (ticket.assignedByUsername) {
          activity.push({
            msg: `Your ticket ${ticket.ticketId} was assigned`,
            time: ticket.updatedAt
          });
        }
        if (ticket.resolvedAt) {
          activity.push({
            msg: `Your ticket ${ticket.ticketId} was resolved`,
            time: ticket.resolvedAt
          });
        }
        if (ticket.closedAt) {
          activity.push({
            msg: `Your closed ticket ${ticket.ticketId}`,
            time: ticket.closedAt
          });
        }
      }

      // 5. You resolved someone's ticket
      if (isAssignee) {
        if (ticket.status === 'Resolved') {
          activity.push({
            msg: `You resolved ticket ${ticket.ticketId}`,
            time: ticket.resolvedAt
          });
        }
      }
    });

    const recentActivity = activity
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 4)
      .map(a => ({
        message: a.msg,
        timeAgo: timeAgo(a.time)
      }));



    // Optional summary stats
    const myTickets = tickets.filter(t => (t.creatorUsername === username || t.assigneeUsername === username));
    const ticketStats = {
      total: myTickets.length,
      open: myTickets.filter(t => t.status === 'Open').length,
      inprogress: myTickets.filter(t => t.status === 'In Progress').length,
      resolved: myTickets.filter(t => t.status === 'Resolved').length,
      closed: myTickets.filter(t => t.status === 'Closed').length
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