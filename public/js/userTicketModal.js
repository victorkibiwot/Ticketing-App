/* User Modal Logic for View Tickets Page */

/**
 * Populate user modal with ticket data
 * @param {Object} ticket - Ticket data
 */
function populateUserModal(ticket) {
    currentTicketId = ticket.ticketId;
    let content = '';
    for (const [key, value] of Object.entries(ticket)) {
        const displayValue = ['createdAt', 'updatedAt', 'resolvedAt', 'closedAt'].includes(key) && value !== null && !isNaN(new Date(value).getTime())
            ? new Date(value).toLocaleString()
            : value === null ? '—' : value;
        content += `
            <div class="ticket-detail-row">
                <div class="row">
                    <div class="col-4 fw-bold text-start">${window.headerMapping[key] || key}:</div>
                    <div class="col-8 fw-bold2 text-start">${displayValue}</div>
                </div>
            </div>
        `;
    }
    const modalBody = document.getElementById('userModalBodyContent');
    if (modalBody) modalBody.innerHTML = content;

    const resolveButton = document.getElementById('resolveTicketBtn');
    const closeButton = document.getElementById('closeTicketBtn');
    const reopenButton = document.getElementById('reopenTicketBtn');
    if (resolveButton && reopenButton && closeButton) {

        const ticketStatus = ticket.status ? ticket.status.toLowerCase() : '';
        const ticketAssignee = ticket.assigneeUsername ? ticket.assigneeUsername.toLowerCase() : '';
        const currentUser = window.currentUsername ? window.currentUsername.toLowerCase() : '';

        if(ticketStatus === 'open'){
            closeButton.style.display = 'block';
            closeButton.onclick = () => closeTicket(currentTicketId, document.getElementById('csrfToken').value);
        }

        if(ticketStatus === 'in progress'){
            if(ticketAssignee === currentUser){
                resolveButton.style.display = 'block';
                resolveButton.onclick = () => markAsResolved(currentTicketId, document.getElementById('csrfToken').value);
            }
            closeButton.style.display = 'block';
            closeButton.onclick = () => closeTicket(currentTicketId, document.getElementById('csrfToken').value);
        }

        if(ticketStatus === 'resolved'){
            closeButton.style.display = 'block';
            closeButton.onclick = () => closeTicket(currentTicketId, document.getElementById('csrfToken').value);
        }

        if(ticketStatus === 'closed'){
            reopenButton.style.display = 'block';
            reopenButton.onclick = () => reopenTicket();
        }
    }
}