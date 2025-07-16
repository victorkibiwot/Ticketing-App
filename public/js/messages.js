const ticketId = window.ticketId;
const currentUser = window.currentUser || 'Guest';

document.addEventListener('DOMContentLoaded', () => {
    function getInitials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    function getColorFromName(name) {
        const colors = ['#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#20c997', '#198754'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    function renderMessages(messages) {
        const container = document.getElementById('chatWindow');
        container.innerHTML = '';

        messages.forEach(msg => {
            const isSystemMsg = /created the ticket|reopened the ticket/i.test(msg.message);
            const isCurrentUser = msg.creatorName === currentUser;

            // Prepare attachments (if any)
            let attachmentsHTML = '';
            if (msg.attachments && msg.attachments.length > 0) {
            attachmentsHTML = `
                <div class="attachments mt-2">
                ${msg.attachments.map(att => `
                    <a href="/download-attachment/${att.attachmentId}" 
                    class="attachment-link" 
                    download="${att.filename}" 
                    target="_blank">
                    <i class="bi bi-paperclip"></i> ${att.filename}
                    </a>
                `).join('<br>')}
                </div>`;
            }

            if (isSystemMsg) {
            container.innerHTML += `
                <div class="system-msg text-center mb-3">
                ${msg.message}
                ${attachmentsHTML}
                </div>`;
            return;
            }

            const avatar = `
            <div class="avatar ${isCurrentUser ? 'ms-2' : 'me-2'}"
                style="background-color: ${getColorFromName(msg.creatorName)}">
                ${getInitials(msg.creatorName)}
            </div>`;

            container.innerHTML += `
            <div class="d-flex w-100 mb-2 ${isCurrentUser ? 'justify-content-end' : 'justify-content-start'}">
                ${!isCurrentUser ? avatar : ''}
                <div class="message-bubble ${isCurrentUser ? 'outgoing' : 'incoming'}">
                ${msg.message}
                ${attachmentsHTML}
                <div class="timestamp">
                    ${new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                    })}
                </div>
                </div>
                ${isCurrentUser ? avatar : ''}
            </div>`;
        });

        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }


    // Funtion to add message to the chatwindow after submission
    function appendMessage(msg) {
        const container = document.getElementById('chatWindow');
        const isCurrentUser = msg.creatorName === currentUser;

        let attachmentsHTML = '';
        if (msg.attachments?.length) {
            attachmentsHTML = `<div class="attachments mt-2">
            ${msg.attachments.map(att => `
                <span class="attachment-link"><i class="bi bi-paperclip"></i> ${att.filename}</span>
            `).join('<br>')}
            </div>`;
        }

        const avatar = `
            <div class="avatar ${isCurrentUser ? 'ms-2' : 'me-2'}"
                style="background-color: ${getColorFromName(msg.creatorName)}">
            ${getInitials(msg.creatorName)}
            </div>`;

        const statusIcon = msg.sending
            ? '<i class="bi bi-clock ms-2 text-muted small" title="Sending..."></i>'
            : msg.failed
            ? '<i class="bi bi-exclamation-triangle ms-2 text-danger small" title="Send failed"></i>'
            : '';

        const wrapper = document.createElement('div');
        wrapper.className = `d-flex w-100 mb-2 ${isCurrentUser ? 'justify-content-end' : 'justify-content-start'}`;
        wrapper.id = msg.localId || '';

        wrapper.innerHTML = `
            ${!isCurrentUser ? avatar : ''}
            <div class="message-bubble ${isCurrentUser ? 'outgoing' : 'incoming'}">
            ${msg.message}
            ${attachmentsHTML}
            <div class="timestamp">
                ${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                ${statusIcon}
            </div>
            </div>
            ${isCurrentUser ? avatar : ''}
        `;

        container.appendChild(wrapper);
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }


    // fallback for if message fails to send 
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




    // ========== Fetch Messages ==========
    async function fetchMessages() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        try {
            const res = await fetch(`/api/messages/${ticketId}`, {
            headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (loadingIndicator) loadingIndicator.style.display = 'none';

            if (Array.isArray(data.messages)) {
            const sorted = data.messages
                .map(m => ({ ...m, createdAt: new Date(m.createdAt) }))
                .sort((a, b) => a.createdAt - b.createdAt);
            renderMessages(sorted);
            } else {
            loadingIndicator.textContent = 'Failed to load messages.';
            }
        } catch (err) {
            console.error(err);
            if (loadingIndicator) loadingIndicator.textContent = 'Error loading messages.';

            Swal.fire({
                icon: 'error',
                title: 'Session expired',
                text: 'Please log in and try again!',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = '/';
            });
        }
    }

    // ========== Attachment Preview Logic ==========
    let selectedFiles = [];

    document.getElementById('attachmentInput').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        selectedFiles.push(file);
        }
    });
    renderAttachmentPreview();
    });

    function renderAttachmentPreview() {
        const preview = document.getElementById('attachmentPreview');
        preview.innerHTML = '';
        selectedFiles.forEach((file, i) => {
            const pill = document.createElement('div');
            pill.className = 'file-pill';
            pill.innerHTML = `
            ${file.name}
            <span class="remove-file" data-index="${i}">&times;</span>
            `;
            preview.appendChild(pill);
        });

        preview.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            selectedFiles.splice(index, 1);
            renderAttachmentPreview();
            });
        });
    }

    // ========== Submit Message ==========
    document.getElementById('messageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('messageInput');
        const btn = document.getElementById('sendBtn');
        const csrf = document.getElementById('csrfToken')?.value;
        const message = input.value.trim();

        if (!message && selectedFiles.length === 0) return;

        btn.disabled = true;

        const localId = 'msg-' + Date.now();

        // Render optimistic message
        const optimisticMsg = {
            creatorName: currentUser,
            message,
            createdAt: new Date(),
            localId,
            sending: true,
            attachments: selectedFiles.map(file => ({ filename: file.name }))
        };

        appendMessage(optimisticMsg);



        const formData = new FormData();
        formData.append('ticketId', ticketId);
        formData.append('message', message);
        formData.append('_csrf', csrf);

        selectedFiles.forEach(file => {
            formData.append('attachments', file);
        });

        input.value = '';
        selectedFiles = [];
        renderAttachmentPreview();


        try {
            const res = await fetch('/create-message', {
            method: 'POST',
            headers: { 'CSRF-Token': csrf },
            body: formData
            });

            if (res.ok) {
                await fetchMessages();
            } else {
                markAsFailed(localId);
                // Swal.fire({
                //     icon: 'error',
                //     title: 'Send failed',
                //     text: 'Something went wrong. Please try again.'
                // });
            }
        } catch (err) {
            console.error('Send error:', err);
            markAsFailed(localId);
            // Swal.fire({
            // icon: 'error',
            // title: 'Send failed',
            // text: 'Error sending message.'
            // });
        } finally {
            btn.disabled = false;
        }
    });

    // ========== Initial Load ==========
    fetchMessages();

    // Poll every 5 seconds
    setInterval(() => {
    fetchMessages();
    }, 5000);
});