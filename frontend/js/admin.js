/**
 * js/admin.js — Admin dashboard logic.
 */

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  checkAdmin(); // Redirects if not admin
  setupUserUI();
  
  loadStats();
  loadUsers();
});

async function loadStats() {
  try {
    const res = await apiFetch('/admin/stats');
    const stats = res.data;

    document.getElementById('admin-users').textContent = stats.totalUsers;
    document.getElementById('admin-inspections').textContent = stats.totalInspections;
    document.getElementById('admin-defective').textContent = stats.totalDefective;
    document.getElementById('admin-reports').textContent = stats.totalReports;

    // Render defect trends
    const trendsDiv = document.getElementById('defect-trends-container');
    trendsDiv.innerHTML = '';
    
    if (!stats.defectTrends || stats.defectTrends.length === 0) {
      trendsDiv.innerHTML = `<div class="text-muted">No defects recorded yet.</div>`;
    } else {
      // Find max for progress bar
      const maxCount = Math.max(...stats.defectTrends.map(t => t.count));
      
      stats.defectTrends.forEach(trend => {
        const pct = (trend.count / maxCount) * 100;
        const item = document.createElement('div');
        item.style.marginBottom = '12px';
        item.innerHTML = `
          <div class="d-flex justify-between" style="font-size:13px; font-weight:600; margin-bottom:4px;">
            <span>${trend.defectType}</span>
            <span>${trend.count}</span>
          </div>
          <div class="confidence-bar" style="height:6px;">
            <div class="confidence-fill danger" style="width:${pct}%"></div>
          </div>
        `;
        trendsDiv.appendChild(item);
      });
    }

  } catch (err) {
    showAlert('Failed to load admin stats: ' + err.message, 'error', 'admin-alert');
  }
}

async function loadUsers() {
  const tbody = document.getElementById('users-table-body');
  
  try {
    const res = await apiFetch('/admin/users');
    const users = res.data;
    
    tbody.innerHTML = '';
    
    users.forEach(user => {
      const row = document.createElement('tr');
      
      const roleBadge = user.role === 'ADMIN' 
        ? `<span class="badge badge-admin">ADMIN</span>`
        : `<span class="badge badge-info">OPERATOR</span>`;
        
      const statusBadge = user.isActive
        ? `<span class="badge badge-success">ACTIVE</span>`
        : `<span class="badge badge-danger">INACTIVE</span>`;

      // Disable toggle/delete for the current logged-in user
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const isSelf = currentUser.username === user.username;
      
      const toggleBtn = `<button class="btn ${user.isActive ? 'btn-outline' : 'btn-primary'} btn-sm" onclick="toggleUser(${user.id})" ${isSelf ? 'disabled' : ''}>
                          ${user.isActive ? 'Disable' : 'Enable'}
                        </button>`;
      
      row.innerHTML = `
        <td class="fw-medium">${user.username}<br><span class="text-muted" style="font-size:11px">${user.email}</span></td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td>${user.totalInspections}</td>
        <td class="d-flex gap-2">
          ${toggleBtn}
        </td>
      `;
      tbody.appendChild(row);
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load users: ${err.message}</td></tr>`;
  }
}

window.toggleUser = async function(userId) {
  try {
    await apiFetch(`/admin/users/${userId}/toggle`, { method: 'PUT' });
    loadUsers(); // Refresh
  } catch (err) {
    alert('Failed to toggle user: ' + err.message);
  }
};
