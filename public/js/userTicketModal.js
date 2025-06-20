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

    const actionButton = document.getElementById('ticketActionBtn');
    const reopenButton = document.getElementById('reopenTicketBtn');
    if (actionButton && reopenButton) {
        actionButton.style.display = 'none';
        reopenButton.style.display = 'none';

        const ticketStatus = ticket.status ? ticket.status.toLowerCase() : '';
        if (ticketStatus !== 'closed') {
            if (ticket.creatorUsername === window.loggedInUsername) {
                actionButton.style.display = 'block';
                actionButton.innerText = 'Close Ticket';
                actionButton.classList.remove('btn-success');
                actionButton.classList.add('btn-danger');
                actionButton.onclick = () => closeTicket(currentTicketId, document.getElementById('csrfToken').value);

                if (ticketStatus === 'resolved') {
                    reopenButton.style.display = 'block';
                    reopenButton.innerText = 'Re-Open Ticket';
                    reopenButton.classList.remove('btn-danger');
                    reopenButton.classList.add('btn-success');
                    reopenButton.onclick = () => reopenTicket();
                }
            } else if (ticket.assigneeUsername === window.loggedInUsername && ticketStatus !== 'resolved') {
                actionButton.style.display = 'block';
                actionButton.innerText = 'Mark as Resolved';
                actionButton.classList.remove('btn-danger');
                actionButton.classList.add('btn-success');
                actionButton.onclick = () => markAsResolved(currentTicketId, document.getElementById('csrfToken').value);
            }
        }
    }
}