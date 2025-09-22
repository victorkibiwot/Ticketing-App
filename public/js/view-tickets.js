document.addEventListener("DOMContentLoaded", function () {
  const rows = document.querySelectorAll(".ticket-row");
  const tableBody = document.querySelector("table tbody");

  

  // --- Sorting ---
  const headers = document.querySelectorAll("th.sortable");
  let sortState = {}; // track direction per column

  headers.forEach(header => {
    header.addEventListener("click", () => {
      const column = header.dataset.column;
      const ascending = !(sortState[column] === "asc");
      sortState = {}; // reset
      sortState[column] = ascending ? "asc" : "desc";

      // reset icons
      document.querySelectorAll(".sort-icon").forEach(icon => {
        icon.className = "bi bi-chevron-expand sort-icon";
      });
      // set active icon
      const icon = header.querySelector(".sort-icon");
      icon.className = ascending ? "bi bi-chevron-up sort-icon active-sort" : "bi bi-chevron-down sort-icon active-sort";

      // sort rows
      const sorted = Array.from(rows).sort((a, b) => {
        const aVal = a.querySelector(`td:nth-child(${header.cellIndex + 1})`)?.innerText.trim();
        const bVal = b.querySelector(`td:nth-child(${header.cellIndex + 1})`)?.innerText.trim();

        if (!isNaN(Date.parse(aVal)) && !isNaN(Date.parse(bVal))) {
          // date compare
          return ascending ? new Date(aVal) - new Date(bVal) : new Date(bVal) - new Date(aVal);
        } else if (!isNaN(aVal) && !isNaN(bVal)) {
          // numeric compare
          return ascending ? aVal - bVal : bVal - aVal;
        } else {
          // string compare
          return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
      });

      // reattach rows in sorted order
      sorted.forEach(row => tableBody.appendChild(row));
    });
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector("table tbody");
  const paginationContainer = document.getElementById("pagination");
  const rowsPerPageSelect = document.getElementById("rowsPerPage");
  const noTicketsMessage = document.getElementById("noTicketsMessage");
  const sortColumnSelect = document.getElementById("sortColumn");
  const sortOrderBtn = document.getElementById("sortOrderBtn");
  const dateTypeSelect = document.getElementById("dateType");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const applyFiltersBtn = document.getElementById("applyFilters");
  const searchInput = document.getElementById("searchTickets");
  const loadingIndicator = document.getElementById("loadingIndicator");

  let currentPage = 1;
  let pageSize = 10;
  let selectedOwnerFilter = "AllTickets";
  let selectedStatusFilter = "All";
  let sortState = {}; 
  let selectedSortColumn = "createdAt"; 
  let selectedSortOrder = true;
  let selectedDateType = null;
  let selectedStartDate = null;
  let selectedEndDate = null;
  let currentTickets = [];

  async function fetchTickets(page = 1, size = pageSize) {
    try {
      loadingIndicator.style.display = "block";
      tableBody.innerHTML = ""; // Clear table during fetch
      noTicketsMessage.style.display = "none"; 

      // Build query parameters dynamically, only including specified values
      const params = new URLSearchParams({ page: page - 1, pageSize: size });
      if (selectedStatusFilter !== "All") {
        params.append("status", selectedStatusFilter);
      }
      if (selectedOwnerFilter !== "All") {
        if (selectedOwnerFilter === "MyTickets") {
          params.append("creatorUsername", window.currentUsername);
        } else if (selectedOwnerFilter === "AssignedTickets") {
          params.append("assigneeUsername", window.currentUsername);
        }
      }

      if (selectedSortColumn) {
        params.append("sortBy", selectedSortColumn);
        params.append("ascending", selectedSortOrder);
      }
      if (selectedDateType && selectedStartDate && selectedEndDate) {
        params.append(`${selectedDateType}StartDate`, selectedStartDate);
        params.append(`${selectedDateType}EndDate`, selectedEndDate);
      }

      const res = await fetch(`/data?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      currentTickets = data.tickets.content; // Store fetched tickets
      searchInput.value = "";
      renderTickets(data.tickets.content);
      renderPagination(data.tickets.totalPages, page);
      currentPage = page;

    } catch (err) {
      loadingIndicator.style.display = "none";
      console.error("Error loading tickets:", err);
      noTicketsMessage.innerHTML = "Error loading tickets. Please try again.";
      noTicketsMessage.style.display = "block";
    }
  }

  // Filter tickets based on search input
  function filterTickets(searchTerm) {
    if (!searchTerm) return currentTickets; // Return all tickets if search is empty
    const searchLower = searchTerm.toLowerCase();
    const headers = ["ticketId", "title", "priority", "status", "creatorUsername", "assigneeUsername"];
    return currentTickets.filter(ticket =>
      headers.some(header => {
        const value = ticket[header];
        if (value === null || value === undefined) return false;
        // Convert dates to locale string for searching
        if (["createdAt", "updatedAt", "resolvedAt", "assignedAt", "closedAt"].includes(header) && value && !isNaN(new Date(value).getTime())) {
          return new Date(value).toLocaleString().toLowerCase().includes(searchLower);
        }
        return value.toString().toLowerCase().includes(searchLower);
      })
    );
  }


  function renderTickets(tickets) {
    const role = window.userRole;
    tableBody.innerHTML = "";
    loadingIndicator.style.display = "none";

    const headers = ["ticketId", "title", "priority", "status", "creatorUsername", "assigneeUsername"];

    tickets.forEach(ticket => {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.dataset.ticket = encodeURIComponent(JSON.stringify(ticket)); // ✅ restore encoded data
        tr.classList.add("ticket-row", `status-${ticket.status.replace(/\s+/g, '-').toLowerCase()}`);

        // Status indicator cell
        const statusCell = document.createElement("td");
        statusCell.classList.add("status-indicator", `status-${ticket.status.replace(/\s+/g, '-').toLowerCase()}`);
        tr.appendChild(statusCell);

        // Render headers/columns
        headers.forEach(header => {
        const td = document.createElement("td");
        const value = ticket[header];

        if (["createdAt", "updatedAt", "resolvedAt", "closedAt"].includes(header) &&
            value !== null &&
            !isNaN(new Date(value).getTime())) {
            td.textContent = new Date(value).toLocaleString();
        } else if (header === "title" && value) {
            td.innerHTML = `<span class="text-muted">${
            value.split(" ").slice(0, 5).join(" ")
            }${value.split(" ").length > 4 ? "..." : ""}</span>`;
        } else {
            td.innerHTML = `<span class="text-muted">${value === null ? "—" : value}</span>`;
        }

        tr.appendChild(td);
        });

        // Message Icon cell
        const msgTd = document.createElement("td");
        msgTd.classList.add("message-icon-cell");

        // ✅ Same logic as old table
        if (!(role.includes("ADMIN")) || (role.includes("ADMIN"))) {
        const wrapper = document.createElement("span");
        wrapper.classList.add("message-icon-wrapper");
        wrapper.innerHTML = `
            <i class="bi bi-envelope message-icon"
            data-ticket-id="${ticket.ticketId}"
            title="Open Messages"
            aria-label="Open messages for ticket ${ticket.ticketId}"></i>
        `;
        msgTd.appendChild(wrapper);
        }

        tr.appendChild(msgTd);

        tableBody.appendChild(tr);
    });

    noTicketsMessage.style.display = tickets.length === 0 ? "block" : "none";
  }


  function renderPagination(totalPages, currentPage) {
    paginationContainer.innerHTML = "";

    if (totalPages <= 1) return; // no need for pagination

    const ul = document.createElement("ul");
    ul.className = "pagination pagination-sm justify-content-center";

    // Prev button
    const prevLi = document.createElement("li");
    prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
    prevLi.innerHTML = `
        <button class="page-link" aria-label="Previous">
        <i class="bi bi-chevron-left"></i>
        </button>`;
    prevLi.addEventListener("click", () => {
        if (currentPage > 1) fetchTickets(currentPage - 1, pageSize);
    });
    ul.appendChild(prevLi);

    const maxVisible = 5; // how many page numbers to show
    let pages = [];

    if (totalPages <= maxVisible + 2) {
        // show all if few pages
        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
        // always show first and last
        pages.push(1);

        let start = Math.max(2, currentPage - 2);
        let end = Math.min(totalPages - 1, currentPage + 2);

        if (start > 2) pages.push("…");
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push("…");

        pages.push(totalPages);
    }

    // Create number buttons (with ellipsis)
    pages.forEach(p => {
        const li = document.createElement("li");
        if (p === "…") {
        li.className = "page-item disabled ellipsis";
        li.innerHTML = `<span class="page-link">…</span>`;
        } else {
        li.className = `page-item ${p === currentPage ? "active" : ""}`;
        li.innerHTML = `<button class="page-link">${p}</button>`;
        li.addEventListener("click", () => fetchTickets(p, pageSize));
        }
        ul.appendChild(li);
    });

    // Next button
    const nextLi = document.createElement("li");
    nextLi.className = `page-item ${currentPage === totalPages ? "disabled" : ""}`;
    nextLi.innerHTML = `
        <button class="page-link" aria-label="Next">
        <i class="bi bi-chevron-right"></i>
        </button>`;
    nextLi.addEventListener("click", () => {
        if (currentPage < totalPages) fetchTickets(currentPage + 1, pageSize);
    });
    ul.appendChild(nextLi);

    paginationContainer.appendChild(ul);
  }


  // Client-side sorting for column headers
  document.querySelectorAll("th.sortable").forEach(header => {
    header.addEventListener("click", () => {
      const column = header.dataset.column;
      const ascending = !(sortState[column] === "asc");
      sortState = {};
      sortState[column] = ascending ? "asc" : "desc";

      // Update sort icons
      document.querySelectorAll(".sort-icon").forEach(icon => {
        icon.className = "bi bi-chevron-expand sort-icon";
      });
      const icon = header.querySelector(".sort-icon");
      icon.className = ascending ? "bi bi-chevron-up sort-icon active-sort" : "bi bi-chevron-down sort-icon active-sort";

      // Sort current rows
      const rows = Array.from(tableBody.querySelectorAll(".ticket-row"));
      const sorted = rows.sort((a, b) => {
        const aVal = a.querySelector(`td:nth-child(${header.cellIndex + 1})`)?.innerText.trim();
        const bVal = b.querySelector(`td:nth-child(${header.cellIndex + 1})`)?.innerText.trim();

        if (!isNaN(Date.parse(aVal)) && !isNaN(Date.parse(bVal))) {
          return ascending ? new Date(aVal) - new Date(bVal) : new Date(bVal) - new Date(aVal);
        } else if (!isNaN(aVal) && !isNaN(bVal)) {
          return ascending ? aVal - bVal : bVal - aVal;
        } else {
          return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
      });

      tableBody.innerHTML = "";
      sorted.forEach(row => tableBody.appendChild(row));
    });
  });

  // Update pageSize when n changes
  rowsPerPageSelect.addEventListener("change", e => {
    pageSize = parseInt(e.target.value, 10);
    fetchTickets(1, pageSize); // reset to page 1 with new size
  });

  // Search input handler
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.trim();
    const filteredTickets = filterTickets(searchTerm);
    renderTickets(filteredTickets);
  });


  // Filter by status and ownership
  // Status filter
  document.querySelectorAll(".filter-option").forEach(option => {
    option.addEventListener("click", function (e) {
      e.preventDefault();
      selectedStatusFilter = this.getAttribute("data-status");
      document.getElementById("statusFilterButton").innerText = selectedStatusFilter;
      fetchTickets(1, pageSize);
    });
  });

  // Owner filter
  document.querySelectorAll(".owner-filter-option").forEach(option => {
    option.addEventListener("click", function (e) {
      e.preventDefault();
      selectedOwnerFilter = this.getAttribute("data-owner");
      document.getElementById("ownerFilterButton").innerText = this.innerText;
      fetchTickets(1, pageSize);
    });
  });

  // Advanced filters modal
  sortOrderBtn.addEventListener("click", () => {
    selectedSortOrder = !selectedSortOrder;
    sortOrderBtn.innerHTML = `<i class="bi bi-arrow-${selectedSortOrder ? "up" : "down"}"></i>`;
  });

  applyFiltersBtn.addEventListener("click", () => {
    selectedSortColumn = sortColumnSelect.value;
    selectedDateType = dateTypeSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    // Format dates to ISO 8601 with EAT timezone (+03:00)
    selectedStartDate = startDate ? `${startDate}T00:00:00.00000+03:00` : null;
    selectedEndDate = endDate ? `${endDate}T23:59:59.99999+03:00` : null;

    // Validate dates
    if (selectedStartDate && !selectedEndDate || !selectedStartDate && selectedEndDate) {
      noTicketsMessage.innerHTML = "Please provide both start and end dates.";
      noTicketsMessage.style.display = "block";
      loadingIndicator.style.display = "none";
      return;
    }

    // Reset to page 1 and fetch with new filters
    fetchTickets(1, pageSize);
    bootstrap.Modal.getInstance(document.getElementById("filterModal")).hide();
  });


  // Initial load with default 10
  fetchTickets(currentPage, pageSize);
});

