/* Admin Modal Logic for View Tickets Page */
 
let allUsers = [];
let selectedAssignee = null;
let currentTicketId = null;
let currentTicketCreator = null;
let assignFormMode = null;

/**
 * Fetch available assignees
 * @returns {Promise<Array>} List of users
 */
async function fetchAssignees() {
    try {
        const response = await fetch('/assignees');
        const data = await response.json();

        if (data.success) {
            return data.users || [];
        } else if (data.redirect) {
            Swal.fire({
                icon: 'warning',
                title: 'Session Expired',
                text: data.message || 'Your session has expired. You will be redirected to login.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = data.redirect;
            });
            return [];
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Failed to load assignees.'
            });
            return [];
        }
    } catch (error) {
        console.error('Error fetching assignees:', error);
        Swal.fire({
            icon: 'error',
            title: 'Network Error',
            text: 'Could not connect to the server.'
        });
        return [];
    }
}

/**
 * Populate admin modal with ticket data
 * @param {Object} ticket - Ticket data
 */
function populateModal(ticket) {
    let content = '';
    for (const [key, value] of Object.entries(ticket)) {
        const displayValue = ['createdAt', 'updatedAt', 'resolvedAt', 'closedAt'].includes(key) && value !== null && !isNaN(new Date(value).getTime())
            ? new Date(value).toLocaleString()
            : value === null ? '—' : value;
        content += `
            <div class="ticket-detail-row">
                <div class="row align-items-center">
                    <div class="col-5 fw-bold text-end">${window.headerMapping[key] || key}:</div>
                    <div class="col-7 text-start">${displayValue}</div>
                </div>
            </div>
        `;
    }
    const modalBody = document.getElementById('modalBodyContent');
    if (modalBody) modalBody.innerHTML = content;

    currentTicketId = ticket.ticketId;
    currentTicketCreator = ticket.creatorUsername;

    const ticketStatus = ticket.status ? ticket.status.toLowerCase() : '';
    let actionButtons = '';

    if (ticketStatus !== 'closed') {
        if (window.currentUsername === currentTicketCreator) {
            actionButtons += `<button class="btn btn-danger m-2" onclick="closeTicket('${currentTicketId}', document.getElementById('csrfToken').value)">Close Ticket</button>`;
        }
        if (window.currentUsername === ticket.assigneeUsername && ticketStatus !== 'resolved') {
            actionButtons += `<button class="btn btn-success m-2" onclick="markAsResolved('${currentTicketId}', document.getElementById('csrfToken').value)">Mark as Resolved</button>`;
        }
        if (ticketStatus === 'resolved' && window.currentUsername === currentTicketCreator) {
            actionButtons += `<button class="btn btn-success m-2" onclick="reopenTicket()">Re-Open Ticket</button>`;
        }
    }

    if (actionButtons && modalBody) {
        modalBody.innerHTML += `
            <div class="d-flex justify-content-center mt-4 flex-wrap">
                ${actionButtons}
            </div>
        `;
    }

    loadAssignees();

    const assignTab = document.getElementById('assign-tab');
    const assignTabLabel = document.getElementById('assign-tab-label');


    if (assignTab) {
        if (ticket.assigneeUsername && ticket.assigneeUsername.trim() !== '' || window.currentUsername === ticket.creatorUsername) {
            assignTab.classList.add('disabled-tab');
            assignTab.setAttribute('title', 'This ticket is already assigned or you cannot assign your own ticket!');
        } else {
            assignTab.classList.remove('disabled-tab');
            assignTab.removeAttribute('title');
        }
    }


    if (assignTab) {
        const isAssigned = ticket.assigneeUsername && ticket.assigneeUsername.trim() !== '';
        const isCreator = window.currentUsername === ticket.creatorUsername;
        const isClosed = (ticket.status || '').toLowerCase() === 'closed';

        if (isCreator || isClosed) {
            assignTab.classList.add('disabled-tab');
            assignTab.setAttribute('title', isClosed ? 'Ticket is closed' : 'Cannot assign your own ticket');
            assignTabLabel.innerText = 'Assign Ticket';
            assignFormMode = null;
        } else if (isAssigned) {
            assignTab.classList.remove('disabled-tab');
            assignTab.removeAttribute('title');
            assignTabLabel.innerText = 'Re-assign Ticket';
            assignFormMode = 'reassign';
        } else {
            assignTab.classList.remove('disabled-tab');
            assignTab.removeAttribute('title');
            assignTabLabel.innerText = 'Assign Ticket';
            assignFormMode = 'assign';
        }
    }
}

/**
 * Load and filter assignees
 */
async function loadAssignees() {
    allUsers = await fetchAssignees();
    allUsers = allUsers.filter(user => user.username !== currentTicketCreator);

    const assigneeInput = document.getElementById('assigneeInput');
    const userSearchResults = document.getElementById('userSearchResults');
    if (assigneeInput && userSearchResults) {
        assigneeInput.value = '';
        userSearchResults.innerHTML = '';
        selectedAssignee = null;
    }
}

/**
 * Filter users based on search query
 * @param {string} query - Search query
 * @returns {Array} Filtered users
 */
function filterUsers(query) {
    return allUsers.filter(user => {
        const searchStr = `${user.name} ${user.username}`.toLowerCase();
        return searchStr.includes(query.toLowerCase());
    });
}

/**
 * Render search results for assignees
 * @param {Array} users - Filtered users
 */
function renderSearchResults(users) {
    const resultsDiv = document.getElementById('userSearchResults');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '';
    resultsDiv.classList.remove('visible');

    if (users.length === 0) {
        resultsDiv.innerHTML = '<p class="text-muted p-2">No users found.</p>';
        resultsDiv.classList.add('visible');
        return;
    }



    users.forEach((user, index) => {
        const item = document.createElement('button');
        item.className = 'assignee-result-item';
        item.setAttribute('type', 'button');
        item.setAttribute('aria-label', `Select ${user.name} (${user.username})`);
        item.innerHTML = `
            <span class="assignee-name">${user.name}</span>
            <span class="assignee-username">(${user.username})</span>
        `;
        item.addEventListener('click', () => {
            const assigneeInput = document.getElementById('assigneeInput');
            if (assigneeInput) {
                assigneeInput.value = `${user.username}`;
                selectedAssignee = user.username;
                resultsDiv.innerHTML = '';
                resultsDiv.classList.remove('visible');
            }
        });
        resultsDiv.appendChild(item);
    });

    resultsDiv.classList.add('visible');
}

/**
 * Assign a ticket to a user
 */
function confirmAssignment() {
    const prioritySelect = document.getElementById('prioritySelect');
    const csrfToken = document.getElementById('csrfToken').value;

    if (!selectedAssignee) {
        Swal.fire('Error', 'Please select a valid assignee from the search results.', 'error');
        return;
    }

    if (!prioritySelect.value) {
        Swal.fire('Error', 'Please select a priority.', 'error');
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: `Assign ticket to ${selectedAssignee} with priority ${prioritySelect.value}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, assign it!'
    }).then((result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('ticketId', currentTicketId);
            formData.append('assigneeUsername', selectedAssignee);
            formData.append('priority', prioritySelect.value);
            formData.append('_csrf', csrfToken);

            const endpoint = assignFormMode === 'reassign' ? '/tickets/reassign' : '/tickets/assign';
            submitForm({
                form: null,
                url: endpoint,
                loadingTitle: assignFormMode === 'reassign' ? 'Re-assigning ticket...' : 'Assigning ticket...',
                successTitle: assignFormMode === 'reassign' ? 'Ticket re-assigned!' : 'Ticket assigned!',
                errorTitle: assignFormMode === 'reassign' ? 'Re-assignment Failed' : 'Assignment Failed',
                body: formData,
                headers: { 'CSRF-Token': csrfToken }
            });
        }
    });
}

/**
 * Initialize ticket modal and filters
 */
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener("click", function (e) {
        const row = e.target.closest(".ticket-row");
        if (!row) return; // not clicking a ticket row
        if (e.target.closest(".message-icon-cell")) return; // skip message icon

        const ticketData = JSON.parse(decodeURIComponent(row.getAttribute("data-ticket")));

        if (window.userRole && window.userRole.includes("ADMIN")) {
            populateModal(ticketData);
            const modal = new bootstrap.Modal(document.getElementById("ticketModal"));
            modal.show();
        } else {
            populateUserModal(ticketData);
            const modal = new bootstrap.Modal(document.getElementById("userTicketModal"));
            modal.show();
        }
    });

    const assignTab = document.getElementById('assign-tab');
    if (assignTab) {
        assignTab.addEventListener('click', function (e) {
            if (this.classList.contains('disabled-tab')) {
                e.preventDefault();
            }
        });
    }

    const ticketModal = document.getElementById('ticketModal');
    if (ticketModal) {
        ticketModal.addEventListener('show.bs.modal', function () {
            const firstTab = new bootstrap.Tab(document.querySelector('#ticketModal .nav-link'));
            if (firstTab) firstTab.show();
        });
    }

    const assigneeInput = document.getElementById('assigneeInput');
    if (assigneeInput) {
        assigneeInput.addEventListener('input', () => {
            const query = assigneeInput.value.trim();
            if (query.length > 0) {
                const filtered = filterUsers(query);
                renderSearchResults(filtered);
            } else {
                const userSearchResults = document.getElementById('userSearchResults');
                if (userSearchResults) userSearchResults.innerHTML = '';
            }
        });
    } 
});