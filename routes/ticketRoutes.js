const express = require('express');
const router = express.Router();
const { axiosInstance2 } = require('../utils/axios');
const { axiosInstance } = require('../utils/axios');
const multer = require('multer');
const upload = multer();
const FormData = require('form-data');
const fs = require('fs');

// Show form
router.get('/create-ticket', (req, res) => {
  const token = req.session.token;
  const jsessionid = req.session.jsessionid;
  const username = req.session.username;
  const role = req.session.role;

  if (!token || !jsessionid) {
    return res.json({ success: false, message: 'Session expired. Please login again.', redirect: '/' });
  }

  res.render('create-ticket', {
      username,
      role
});
});

// Handle submission
router.post('/create-ticket', upload.array('attachments'), async (req, res) => {
  const token = req.session.token;
  const jsessionid = req.session.jsessionid;
  const { title, description } = req.body;
  const files = req.files;

  if (!token || !jsessionid) {
    return res.json({
      success: false,
      message: 'Missing auth token or session cookie.',
      redirect: '/'
    });
  }

  try {
    // Prepare FormData to forward to the API
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);

    // If there are files, append them
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('attachments', file.buffer, file.originalname);
      });
    }

    // Forward the request to your API
    await axiosInstance2.post('/api/createTicket', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: jsessionid,
        ...formData.getHeaders() // Important: sets proper multipart/form-data headers
      }
    });

    return res.json({
      success: true,
      message: 'Ticket Successfully Created!',
      redirect: '/tickets'
    });

  } catch (err) {
    console.error(err.response?.data || err);

    let errorMessage = 'Error creating ticket. Please try again.';
    if (err.response && err.response.data && err.response.data.message) {
      errorMessage = err.response.data.message;
    }

    return res.json({
      success: false,
      message: errorMessage,
      redirect: '/create-ticket'
    });
  }
});



// View all tickets route
router.get('/tickets', async (req, res) => {
  const token = req.session.token;
  const jsessionid = req.session.jsessionid;
  const role = req.session.role;
  const username = req.session.usermame;

  if (!token || !jsessionid) {
    req.flash('error', 'Please log in to view the tickets!');
    return res.redirect('/');
    // return res.redirect('/?error=Session expired. Please login again!');
  }

  try {
    const response = await axiosInstance2.get('/api/getAllTickets', {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: jsessionid
      }
    });
    
    const tickets = response.data.tickets;

    res.render('view-tickets', {
      csrfToken: req.csrfToken(),
      tickets,
      role,
      username
    });


  } catch (err) {
    console.error(err.response?.data || err);
    return res.redirect('/dashboard?error=Failed to load tickets.');
  }
});


// View all assignable users
router.get('/assignees', async (req, res) => {
  const token = req.session.token;
  const jsessionid = req.session.jsessionid;

  if (!token || !jsessionid) {
    return res.json({ success: false, message: 'Session expired. Please login again.', redirect: '/' });
  }

  try {
    const response = await axiosInstance.get('/auth/getAssignableUsers', {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: jsessionid
      }
    });
    
    const users = response.data.users;
    
    res.json({
      success: true,
      users: users
    });

  } catch (err) {
    console.error(err.response?.data || err);
    res.json({ message: 'Failed to load assignees.' });
  }
});



// Assign Ticket Route
router.post('/tickets/assign', upload.none(), async (req, res) => {
  const { ticketId, assigneeUsername, priority } = req.body;

  // Prepare form data
  const formDataAssign = new FormData();
  formDataAssign.append('ticketId', ticketId);
  formDataAssign.append('assigneeUsername', assigneeUsername);
  formDataAssign.append('priority', priority);

  const token = req.session.token;
  const jsessionid = req.session.jsessionid;

  if (!token || !jsessionid) {
    return res.json({ success: false, message: 'Session expired. Please login again.', redirect: '/' });
  }

  try {
    const response = await axiosInstance2.post('/api/assignTicket',
      formDataAssign,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: jsessionid,
          ...formDataAssign.getHeaders() // Important: sets proper multipart/form-data headers

        }
      }
    );

    return res.json({
        success: true,
        message: response.data.message || 'Ticket assigned successfully!',
        redirect: '/tickets'
      });

  } catch (err) {
    console.error('Error assigning ticket:', err.response?.data || err.message);
    if (err.response && err.response.status === 403) {
        return res.json({
            success: false,
            forbidden: true,
            message: err.response.data.error || 'You cannot assign your own ticket.',
            redirect: '/tickets'
        });
    }

    return res.json({
        success: false,
        message: err.response?.data?.message || 'Assignment failed on the API side.',
        redirect: '/tickets'
    });
  }
});


// Closing ticket route
router.post('/tickets/close', async (req, res) => {
    const { ticketId } = req.query; 
    const token = req.session.token;
    const jsessionid = req.session.jsessionid;

    if (!token || !jsessionid) {
      return res.json({ success: false, message: 'Session expired. Please login again.', redirect: '/' });
    }

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('ticketId', ticketId);

      const response = await axiosInstance2.post('/api/closeTicket',
        formData,
        {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: jsessionid,
        }
      });
      
      res.json({ success: true, message: response.data.message || `Ticket ${ticketId} closed successfully.`, redirect: '/tickets' });

    } catch (err) {
      console.error(err.response?.data || err);

      if (err.response && err.response.data.code === 403) {
          return res.json({
              success: false,
              forbidden: true,
              message: err.response.data.error || 'Ticket is already closed.',
              redirect: '/tickets'
          });
      }

      return res.json({
          success: false,
          message: err.response?.data?.message || 'Assignment failed on the API side.',
          redirect: '/tickets'
      });

      
    }
});

// Resolving ticket route
router.post('/tickets/resolve', async (req, res) => {
    const { ticketId } = req.query;
    const token = req.session.token;
    const jsessionid = req.session.jsessionid;

    if (!token || !jsessionid) {
      return res.json({ success: false, message: 'Session expired. Please login again.', redirect: '/' });
    }

    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('ticketId', ticketId);
  
      const response = await axiosInstance2.post('/api/resolveTicket',
        formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: jsessionid
        }
      });
      
      res.json({ success: true, message: response.data.message || `Ticket ${ticketId} marked as resolved successfully.`, redirect: '/tickets' });

    } catch (err) {
      console.error(err.response?.data || err);
      if (err.response && err.response.data.code === 403) {
          return res.json({
              success: false,
              forbidden: true,
              message: err.response.data.error || 'Ticket is already marked as resolved.',
              redirect: '/tickets'
          });
      }

      return res.json({
          success: false,
          message: err.response?.data?.message || 'Assignment failed on the API side.',
          redirect: '/tickets'
      });
    }
});


// Route to reopen ticket
router.post('/tickets/reopen', upload.array('attachments'), async (req, res) => {
  const token = req.session.token;
  const jsessionid = req.session.jsessionid;
  const { ticketId, message } = req.body;
  const files = req.files;

  if (!token || !jsessionid) {
    return res.json({
      success: false,
      message: 'Missing auth token or session cookie.',
      redirect: '/'
    });
  }

  try {
    // Prepare FormData to forward to the API
    const formData = new FormData();
    formData.append('ticketId', ticketId);
    formData.append('message', message);

    // If there are files, append them
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('attachments', file.buffer, file.originalname);
      });
    }

    // Forward the request to your API
    await axiosInstance2.post('/api/reopenTicket', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: jsessionid,
        ...formData.getHeaders() // Important: sets proper multipart/form-data headers
      }
    });

    return res.json({
      success: true,
      message: 'Ticket Successfully Reo-openned!',
      redirect: '/tickets'
    });

  } catch (err) {
    console.error(err.response?.data || err);

    let errorMessage = 'Error re-openning ticket. Please try again.';
    if (err.response && err.response.data && err.response.data.message) {
      errorMessage = err.response.data.message;
    }

    return res.json({
      success: false,
      message: errorMessage,
      redirect: '/tickets'
    });
  }
});




module.exports = router;