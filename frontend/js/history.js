/**
 * js/history.js — Handles paginated/filtered inspection history.
 */

let currentPage = 0;
let totalPages  = 1;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupUserUI();
  
  loadHistory();

  // Filters
  document.getElementById('btn-filter').addEventListener('click', () => {
    currentPage = 0;
    loadHistory();
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-from').value   = '';
    document.getElementById('filter-to').value     = '';
    currentPage = 0;
    loadHistory();
  });

  // Pagination
  document.getElementById('page-prev').addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      loadHistory();
    }
  });

  document.getElementById('page-next').addEventListener('click', () => {
    if (currentPage < totalPages - 1) {
      currentPage++;
      loadHistory();
    }
  });

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeDetailModal);
});

async function loadHistory() {
  const search = document.getElementById('filter-search').value;
  const status = document.getElementById('filter-status').value;
  const from   = document.getElementById('filter-from').value;
  const to     = document.getElementById('filter-to').value;

  const tbody = document.getElementById('history-table-body');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Loading data...</td></tr>`;

  try {
    const params = new URLSearchParams({ page: currentPage, size: 10 });
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (from)   params.append('from', from);
    if (to)     params.append('to', to);

    const res = await apiFetch(`/inspections/history?${params.toString()}`);
    const pageData = res.data;
    
    totalPages = pageData.totalPages || 1;
    updatePaginationUI();

    tbody.innerHTML = '';
    
    if (!pageData.content || pageData.content.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No inspections found matching criteria.</td></tr>`;
      return;
    }

    pageData.content.forEach(ins => {
      const row = document.createElement('tr');
      
      let statusBadge = '';
      if (ins.status === 'GOOD') statusBadge = '<span class="badge badge-good">GOOD</span>';
      else if (ins.status === 'DEFECTIVE') statusBadge = '<span class="badge badge-defective">DEFECTIVE</span>';
      else statusBadge = `<span class="badge badge-warning">${ins.status}</span>`;

      const dateStr = ins.inspectedAt ? new Date(ins.inspectedAt).toLocaleString() : 'N/A';

      row.innerHTML = `
        <td class="fw-medium">${ins.inspectionCode}</td>
        <td>${ins.productName} <span class="text-muted" style="font-size:11px;">(${ins.productCode})</span></td>
        <td>${statusBadge}</td>
        <td>${ins.defectCount}</td>
        <td>${ins.confidence}%</td>
        <td>${ins.inspectedBy}</td>
        <td class="text-muted" style="font-size:12px;">${dateStr}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="openDetailModal(${ins.id}, '${ins.inspectionCode}')">View</button>
          <button class="btn btn-ghost btn-sm text-danger" onclick="deleteInspection(${ins.id})">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error('Failed to load history', err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load data: ${err.message}</td></tr>`;
  }
}

function updatePaginationUI() {
  document.getElementById('page-prev').disabled = (currentPage === 0);
  document.getElementById('page-next').disabled = (currentPage >= totalPages - 1);
  
  const numbersDiv = document.getElementById('page-numbers');
  numbersDiv.innerHTML = '';
  
  for (let i = 0; i < totalPages; i++) {
    // Only show window around current page for large numbers
    if (i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1) {
      const btn = document.createElement('button');
      btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
      btn.textContent = i + 1;
      btn.onclick = () => { currentPage = i; loadHistory(); };
      numbersDiv.appendChild(btn);
    } else if (Math.abs(i - currentPage) === 2) {
      const span = document.createElement('span');
      span.textContent = '...';
      span.style.color = 'var(--text-muted)';
      numbersDiv.appendChild(span);
    }
  }
}

async function openDetailModal(id, code) {
  const modal = document.getElementById('detail-modal');
  const title = document.getElementById('modal-title');
  const body  = document.getElementById('modal-body');
  
  title.textContent = `Inspection: ${code}`;
  body.innerHTML = `<div class="text-center"><div class="spinner-sm" style="display:inline-block; vertical-align:middle; margin-right:8px;"></div> Loading...</div>`;
  modal.classList.add('open');

  try {
    const res = await apiFetch(`/inspections/${id}`);
    const data = res.data;
    
    let html = `
      <div class="grid-2 mb-4">
        <div>
          <div class="text-muted" style="font-size:12px">Product</div>
          <div class="fw-bold">${data.productName} (${data.productCode})</div>
        </div>
        <div>
          <div class="text-muted" style="font-size:12px">Status</div>
          <div class="fw-bold ${data.status === 'GOOD' ? 'text-success' : 'text-danger'}">${data.status}</div>
        </div>
        <div>
          <div class="text-muted" style="font-size:12px">Confidence</div>
          <div class="fw-bold">${data.confidence}%</div>
        </div>
        <div>
          <div class="text-muted" style="font-size:12px">Recommendation</div>
          <div class="fw-bold">${data.recommendation || 'N/A'}</div>
        </div>
      </div>
      
      <div class="mb-4">
        <div class="text-muted" style="font-size:12px; margin-bottom:4px;">Notes</div>
        <div style="font-size:13px; background:var(--bg); padding:12px; border-radius:6px;">${data.notes || 'None'}</div>
      </div>
      
      <div class="mb-2 fw-bold">Detected Defects</div>
    `;

    if (!data.defects || data.defects.length === 0) {
      html += `<div class="text-muted" style="font-size:13px; font-style:italic;">No defects detected.</div>`;
    } else {
      data.defects.forEach(d => {
        html += `
          <div style="padding:10px; border:1px solid var(--border); border-radius:6px; margin-bottom:8px; font-size:13px;">
            <div class="d-flex justify-between fw-bold mb-1">
              <span>${d.defectType}</span>
              <span class="text-danger">${d.severity}</span>
            </div>
            <div class="text-muted">${d.description}</div>
          </div>
        `;
      });
    }

    body.innerHTML = html;
  } catch (err) {
    body.innerHTML = `<div class="text-danger">Failed to load details: ${err.message}</div>`;
  }
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.remove('open');
}

async function deleteInspection(id) {
  if (!confirm('Are you sure you want to delete this inspection? This will also delete its defects and reports.')) {
    return;
  }

  try {
    await apiFetch(`/inspections/${id}`, { method: 'DELETE' });
    loadHistory(); // reload
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}
