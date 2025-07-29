/* Reopen Ticket Modal Logic */

/**
 * Open the reopen ticket modal
 * @param {string} ticketId - The ticket ID
 */
function reopenTicket(ticketId) {
    currentTicketId = ticketId || currentTicketId;
    const primaryModal = document.querySelector('.modal.show[id="ticketModal"], .modal.show[id="userTicketModal"]');
    const reopenModal = new bootstrap.Modal(document.getElementById('reopenReasonModal'), {
        backdrop: 'static'
    });

    const reopenReason = document.getElementById('reopenReason');
    if (reopenReason) reopenReason.value = '';

    if (primaryModal) {
        primaryModal.classList.add('modal-blur');
        const primaryBackdrop = document.querySelector('.modal-backdrop.show');
        if (primaryBackdrop) primaryBackdrop.classList.add('modal-blur');
    } else {
        document.body.classList.add('modal-blur');
    }

    reopenModal.show();

    const reopenModalElement = document.getElementById('reopenReasonModal');
    if (reopenModalElement) {
        reopenModalElement.addEventListener('hidden.bs.modal', function handler() {
            if (primaryModal) {
                primaryModal.classList.remove('modal-blur');
                const primaryBackdrop = document.querySelector('.modal-backdrop.show');
                if (primaryBackdrop) primaryBackdrop.classList.remove('modal-blur');
            }
            document.body.classList.remove('modal-blur');
            this.removeEventListener('hidden.bs.modal', handler);
        }, { once: true });
    }
}

/**
 * Initialize message icon clicks and reopen form
 */
document.addEventListener('DOMContentLoaded', () => {

    const reopenTicketForm = document.getElementById('reopenTicketForm');
    if (reopenTicketForm) {
        const selectedFiles = initFileUpload('reopenAttachmentsInput', 'reopenCustomFileButton', 'reopenFileList');

        reopenTicketForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const formData = new FormData();
            formData.append('message', reopenTicketForm.reason.value);
            selectedFiles.forEach(file => formData.append('attachments', file));
            formData.append('ticketId', currentTicketId || '');
            const csrfToken = document.getElementById('csrfToken').value;
            formData.append('_csrf', csrfToken);

            submitForm({
                form: reopenTicketForm,
                url: '/tickets/reopen',
                loadingTitle: 'Reopening Ticket...',
                successTitle: 'Ticket Reopened!',
                errorTitle: 'Reopening Failed!',
                body: formData,
                headers: { 'CSRF-Token': csrfToken }
            });
        });
    }
});