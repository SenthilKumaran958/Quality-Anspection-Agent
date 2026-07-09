/**
 * js/reports.js — Fetch and render list of generated PDF reports.
 */

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupUserUI();
  loadReports();
});

async function loadReports() {
  const tbody = document.getElementById('reports-table-body');
  
  try {
    const res = await apiFetch('/reports');
    const reports = res.data;
    
    tbody.innerHTML = '';
    
    if (!reports || reports.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No reports generated yet.</td></tr>`;
      return;
    }

    reports.forEach(r => {
      const row = document.createElement('tr');
      
      const dateStr = r.generatedAt ? new Date(r.generatedAt).toLocaleString() : 'N/A';

      row.innerHTML = `
        <td class="fw-medium">${r.reportCode}</td>
        <td>${r.inspectionCode}</td>
        <td>${r.productName}</td>
        <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${r.summary}">${r.summary}</td>
        <td>${r.fileSizeKb} KB</td>
        <td>${r.generatedBy}</td>
        <td class="text-muted" style="font-size:12px;">${dateStr}</td>
        <td>
          <a href="/api/reports/download/${r.reportCode}" class="btn btn-ghost btn-sm" download>⬇️ Download</a>
        </td>
      `;
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error('Failed to load reports', err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load data: ${err.message}</td></tr>`;
  }
}
