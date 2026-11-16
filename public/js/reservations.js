// ── Sorting Functionality ────────────────────────────────────────────────────
function sortTable(sortBy) {
  // Get current URL params
  const params = new URLSearchParams(window.location.search);
  
  // Get current sort order, default to 'DESC'
  let currentSortOrder = params.get('sortOrder') || 'DESC';
  
  // If clicking same column, toggle sort order; otherwise start with ASC
  if (params.get('sortBy') === sortBy) {
    currentSortOrder = currentSortOrder === 'ASC' ? 'DESC' : 'ASC';
  } else {
    currentSortOrder = 'ASC';
  }
  
  // Set new params
  params.set('sortBy', sortBy);
  params.set('sortOrder', currentSortOrder);
  
  // Reload page with new params
  window.location.search = params.toString();
}

// ── Filtering Functionality ──────────────────────────────────────────────────
function filterRows(status) {
  const rows = document.querySelectorAll('.booking-row');
  
  rows.forEach(row => {
    const rowStatus = row.getAttribute('data-status');
    
    if (status === 'all' || rowStatus === status) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
  
  // Update active filter button
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.classList.remove('active-filter');
    if (btn.getAttribute('data-filter') === status) {
      btn.classList.add('active-filter');
    }
  });
}

// ── Status Update Functions ──────────────────────────────────────────────────
async function updateStatus(bookingId, newStatus) {
  try {
    const response = await fetch(`/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (response.ok) {
      location.reload();
    } else {
      alert('Failed to update booking status');
    }
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Error updating booking status');
  }
}

// earlyCheckout is defined inline in each view (admin/reservations.xian, staff/reservations.xian)
// to use the page's styled confirmation modal — do not define a global fallback here.

function openCancelModal(bookingId) {
  const modal = document.getElementById('cancellationModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.setAttribute('data-booking-id', bookingId);
    document.getElementById('cancellationReason').value = '';
    document.getElementById('cancellationReason').focus();
  }
}

function closeCancelModal() {
  const modal = document.getElementById('cancellationModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function submitCancellation() {
  const modal = document.getElementById('cancellationModal');
  const bookingId = modal.getAttribute('data-booking-id');
  const reason = document.getElementById('cancellationReason').value.trim();
  
  if (!reason) {
    alert('Please provide a cancellation reason');
    return;
  }
  
  try {
    const response = await fetch(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    
    if (response.ok) {
      location.reload();
    } else {
      alert('Failed to cancel booking');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error cancelling booking');
  }
}

// ── Modal Close Handlers ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Close modal when clicking outside
  const modal = document.getElementById('cancellationModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeCancelModal();
      }
    });
  }
  
  // Handle logout button — use the confirmation modal defined in the page's inline script
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      if (typeof window.confirmAdminLogout === 'function') {
        window.confirmAdminLogout();
      } else {
        window.location.href = '/logout';
      }
    });
  }
  
  // Handle sidebar toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('admin-sidebar') || document.getElementById('staff-sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('hidden');
    });
  }
});
