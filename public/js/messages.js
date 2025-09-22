document.addEventListener('DOMContentLoaded', () => {
  const chatWindow = document.getElementById('chatWindow');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const attachmentInput = document.getElementById('attachmentInput');
  const attachmentPreview = document.getElementById('attachmentPreview');
  const csrfToken = document.getElementById('modalCsrfToken')?.value;
  const currentUser = window.loggedInUsername || 'Guest';
  let selectedFiles = [];

  // ======== Helpers ========
  const getInitials = name => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const getColorFromName = name => {
    const colors = ['#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#20c997', '#198754'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  function renderMessages(messages) {
    const prevLastId = chatWindow.lastElementChild?.dataset.id;

    // ===== 1. Get unsent messages BEFORE we clear the chat =====
    const unsentMessages = Array.from(chatWindow.children)
      .filter(el => el.id && el.id.startsWith('msg-'))
      .map(el => {
        const msg = el.dataset.message ? JSON.parse(el.dataset.message) : null;
        return msg?.sending ? msg : null;
      })
      .filter(Boolean);

    // ===== 2. Clear all messages =====
    chatWindow.innerHTML = '';

    // ===== 3. Remove pending local versions that now exist on server =====
    // 3. Remove pending local versions that now exist on server (loose match)
    messages.forEach(serverMsg => {
      const index = unsentMessages.findIndex(localMsg => {
        const timeDiff = Math.abs(new Date(serverMsg.createdAt) - new Date(localMsg.createdAt));
        const isSameTime = timeDiff < 10000; // 10 seconds window
        const isSameText = serverMsg.message === localMsg.message;
        const isSameCreator = serverMsg.creatorName === localMsg.creatorName;

        const localFilenames = (localMsg.attachments || []).map(a => a.filename).sort().join(',');
        const serverFilenames = (serverMsg.attachments || []).map(a => a.filename).sort().join(',');
        const isSameFiles = localFilenames === serverFilenames;

        return isSameCreator && isSameText && isSameFiles && isSameTime;
      });

      if (index !== -1) {
        unsentMessages.splice(index, 1); // remove the local duplicate
      }
    });


    // ===== 4. Render confirmed messages from server =====
    messages.forEach(msg => appendMessage(msg, true));

    // ===== 5. Re-render still-pending messages =====
    unsentMessages.forEach(msg => appendMessage(msg, true));

    const newLastId = chatWindow.lastElementChild?.dataset.id;

    // ===== 6. Scroll logic =====
    const isInitialLoad = chatWindow.dataset.initialLoad === 'true';
    const isNewMessage = newLastId !== prevLastId;
    const isNearBottom = chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight < 150;

    if (isInitialLoad || (isNewMessage && isNearBottom)) {
      requestAnimationFrame(() => {
        chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
      });
    }

    // ===== 7. Cleanup and tracking =====
    delete chatWindow.dataset.initialLoad;
    previousMessageIds = messages.map(msg => msg.id || msg.timestamp);
  }



  function appendMessage(msg, skipScroll = false) {
    const isSystem = /created the ticket|reopened the ticket/i.test(msg.message);
    const isMe = msg.creatorName === currentUser;

    const wrapper = document.createElement('div');
    wrapper.dataset.id = msg.id || msg.timestamp || msg.localId;

    if (msg.localId) {
      wrapper.id = msg.localId;
      wrapper.dataset.message = JSON.stringify(msg); // Store raw message
    }

    wrapper.className = isSystem
      ? 'system-msg text-center mb-0'
      : `d-flex w-100 mb-2 ${isMe ? 'justify-content-end' : 'justify-content-start'}`;
    if (msg.localId) wrapper.id = msg.localId;

    if (isSystem) {
      let attachments = '';
      if (msg.attachments?.length) {
        attachments =
          `<div class="attachments mt-2 text-center">
            ${msg.attachments.map(a =>
              `<a href="/download-attachment/${a.attachmentId}" class="attachment-link" download target="_blank">
                <i class="bi bi-paperclip"></i> ${a.filename}
              </a>`
            ).join('<br>')}
          </div>`;
      }
      wrapper.innerHTML = `${msg.message}${attachments}`;
    } else {
      const avatar = `
        <div class="avatar ${isMe ? 'ms-2' : 'me-2'}"
             style="background-color: ${getColorFromName(msg.creatorName)}">
          ${getInitials(msg.creatorName)}
        </div>`;

      const attachments = msg.attachments?.length
        ? `<div class="attachments mt-2">
             ${msg.attachments.map(a =>
               `<a href="/download-attachment/${a.attachmentId}" class="attachment-link" download target="_blank">
                  <i class="bi bi-paperclip"></i> ${a.filename}
                </a>`).join('<br>')}
           </div>`
        : '';

      const statusIcon = msg.sending
        ? '<i class="bi bi-clock ms-2 text-muted small" title="Sending..."></i>'
        : msg.failed
          ? '<i class="bi bi-exclamation-triangle ms-2 text-danger small" title="Send failed"></i>'
          : '';

      wrapper.innerHTML = `
        ${!isMe ? avatar : ''}
        <div class="message-bubble ${isMe ? 'outgoing' : 'incoming'}">
          ${msg.message}
          ${attachments}
          <div class="timestamp">
            ${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${statusIcon}
          </div>
        </div>
        ${isMe ? avatar : ''}`;
    }

    chatWindow.appendChild(wrapper);
    if (!skipScroll) {
      chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
    }
  }

  function markAsFailed(localId) {
    const bubble = document.getElementById(localId);
    if (bubble) {
      const icon = bubble.querySelector('.timestamp i');
      if (icon) {
        icon.className = 'bi bi-exclamation-triangle ms-2 text-danger small';
        icon.title = 'Send failed';
      }
    }
  }

  // ======== Attachments ========
  function renderAttachmentPreview() {
    attachmentPreview.innerHTML = '';
    selectedFiles.forEach((file, i) => {
      const pill = document.createElement('div');
      pill.className = 'file-pill';
      pill.innerHTML = `${file.name} <span class="remove-file" data-index="${i}">&times;</span>`;
      attachmentPreview.appendChild(pill);
    });

    attachmentPreview.querySelectorAll('.remove-file').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFiles.splice(parseInt(btn.dataset.index), 1);
        renderAttachmentPreview();
      });
    });
  }

  attachmentInput?.addEventListener('change', e => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        selectedFiles.push(file);
      }
    });
    renderAttachmentPreview();
  });

  // ======== Message Form Submission ========
  messageForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message && selectedFiles.length === 0) return;

    sendBtn.disabled = true;
    const localId = 'msg-' + Date.now();

    appendMessage({
      creatorName: currentUser,
      message,
      createdAt: new Date(),
      localId,
      sending: true,
      attachments: selectedFiles.map(file => ({ filename: file.name }))
    });

    const formData = new FormData();
    formData.append('ticketId', window.ticketId);
    formData.append('message', message);
    formData.append('_csrf', csrfToken);
    selectedFiles.forEach(file => formData.append('attachments', file));

    messageInput.value = '';
    selectedFiles = [];
    renderAttachmentPreview();

    try {
      const res = await fetch('/create-message', {
        method: 'POST',
        headers: { 'CSRF-Token': csrfToken },
        body: formData
      });

      if (res.ok) {
        await window.fetchMessages?.();
      } else {
        markAsFailed(localId);
      }
    } catch (err) {
      console.error('Send error:', err);
      markAsFailed(localId);
    } finally {
      sendBtn.disabled = false;
    }
  });

  // ======== Fetch Messages API ========
  window.fetchMessages = async function () {
    const loading = document.getElementById('loadingIndicator');
    try {
      const res = await fetch(`/api/messages/${window.ticketId}`, {
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (loading) loading.style.display = 'none';

      const sorted = data.messages
        .map(m => ({ ...m, createdAt: new Date(m.createdAt) }))
        .sort((a, b) => a.createdAt - b.createdAt);
      renderMessages(sorted);
    } catch (err) {
      console.error(err);
      if (loading) loading.textContent = 'Error loading messages.';
      Swal.fire({
        icon: 'error',
        title: 'Session expired',
        text: 'Please log in again.',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        window.location.href = '/';
      });
    }
  };

  // ======== Modal Open Listener (Fix!) ========
  // document.querySelectorAll('.message-icon').forEach(icon => {
  //   icon.addEventListener('click', async () => {
  //     const ticketId = icon.getAttribute('data-ticket-id');
  //     window.ticketId = ticketId;

  //     document.getElementById('modalTicketId').textContent = ticketId;
  //     chatWindow.innerHTML = `<div class="text-center text-muted py-3" id="loadingIndicator">Loading messages...</div>`;
  //     attachmentPreview.innerHTML = '';
  //     messageInput.value = '';

  //     chatWindow.dataset.initialLoad = 'true';
  //     previousMessageIds = []; // Clear previous tracking


  //     const modal = new bootstrap.Modal(document.getElementById('messageModal'));
  //     modal.show();

  //     await window.fetchMessages?.();
  //   });
  // });

  
  // ======== Modal Open Listener (with delegation) ========
  document.addEventListener("click", async e => {
    const icon = e.target.closest(".message-icon");
    if (!icon) return; // not a message icon
    e.stopPropagation();

    // 🔍 Find the row that holds the ticket data
    const row = icon.closest("tr");
    if (!row || !row.dataset.ticket) {
      console.error("Ticket data not found");
      return;
    }

    const ticket = JSON.parse(decodeURIComponent(row.dataset.ticket));
    const currentUser = window.loggedInUsername;

    // 💾 Store ticket context globally
    window.ticketContext = {
      ticketId: ticket.ticketId,
      creator: ticket.creatorUsername,
      assignee: ticket.assigneeUsername,
      status: ticket.status
    };

    // ✅ Determine permission
    window.canSendMessage =
      ticket.assigneeUsername && // must be assigned
      (
        currentUser === ticket.creatorUsername ||
        currentUser === ticket.assigneeUsername
      ) &&
      (ticket.status != "Resolved" && ticket.status != "Closed");

    // 💬 Show ticket ID in modal
    window.ticketId = ticket.ticketId;
    document.getElementById("modalTicketId").textContent = ticket.ticketId;

    // 🧹 Reset chat and inputs
    chatWindow.innerHTML =
      `<div class="text-center text-muted py-3" id="loadingIndicator">Loading messages...</div>`;
    attachmentPreview.innerHTML = "";
    messageInput.value = "";
    chatWindow.dataset.initialLoad = "true";
    previousMessageIds = [];

    // 🧠 Apply permission logic to form
    const isAllowed = window.canSendMessage;
    const input = document.getElementById("messageInput");
    const attach = document.getElementById("attachmentInput");
    const attachLabel = document.querySelector('label[for="attachmentInput"]');

    [input, sendBtn, attachLabel].forEach(el => {
      if (!isAllowed) {
        el.classList.add("not-allowed");
        el.title = "You cannot send a message on unassigned or closed tickets.";
      } else {
        el.classList.remove("not-allowed");
        el.removeAttribute("title");
      }
    });

    input.disabled = !isAllowed;
    sendBtn.disabled = !isAllowed;
    attach.disabled = !isAllowed;

    // 🪟 Open the modal
    const modal = new bootstrap.Modal(document.getElementById("messageModal"));
    modal.show();

    // 📩 Fetch messages
    await window.fetchMessages?.();
  });



  // ======== Auto-refresh every 5 seconds ========
  setInterval(() => {
    const modalEl = document.getElementById('messageModal');
    if (modalEl && modalEl.classList.contains('show')) {
      window.fetchMessages?.();
    }
  }, 5000);
});
