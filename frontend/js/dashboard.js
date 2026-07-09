/**
 * js/dashboard.js — Fetch and render dashboard statistics.
 */

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupUserUI();
  loadDashboardStats();
});

async function loadDashboardStats() {
  try {
    const res = await apiFetch('/dashboard/stats');
    const stats = res.data;

    // Update stat cards
    document.getElementById('stat-total').textContent = stats.totalInspected;
    document.getElementById('stat-good').textContent = stats.goodProducts;
    document.getElementById('stat-defective').textContent = stats.defectiveProducts;
    document.getElementById('stat-accuracy').textContent = stats.detectionAccuracy + '%';

    // Update table
    const tbody = document.getElementById('recent-table-body');
    tbody.innerHTML = '';

    if (!stats.recentInspections || stats.recentInspections.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No inspections found.</td></tr>`;
      return;
    }

    stats.recentInspections.forEach(ins => {
      const row = document.createElement('tr');
      
      let statusBadge = '';
      if (ins.status === 'GOOD') statusBadge = '<span class="badge badge-good">GOOD</span>';
      else if (ins.status === 'DEFECTIVE') statusBadge = '<span class="badge badge-defective">DEFECTIVE</span>';
      else statusBadge = `<span class="badge badge-warning">${ins.status}</span>`;

      // Format date nicely
      const dateStr = ins.inspectedAt ? new Date(ins.inspectedAt).toLocaleString() : 'N/A';

      row.innerHTML = `
        <td class="fw-medium">${ins.inspectionCode}</td>
        <td>${ins.productName} <span class="text-muted" style="font-size:11px;">(${ins.productCode})</span></td>
        <td>${statusBadge}</td>
        <td>${ins.defectCount}</td>
        <td>${ins.confidence}%</td>
        <td>${ins.inspectedBy}</td>
        <td class="text-muted" style="font-size:12px;">${dateStr}</td>
      `;
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error('Failed to load dashboard stats', err);
    document.getElementById('recent-table-body').innerHTML = 
      `<tr><td colspan="7" class="text-center text-danger">Failed to load data: ${err.message}</td></tr>`;
  }
}
