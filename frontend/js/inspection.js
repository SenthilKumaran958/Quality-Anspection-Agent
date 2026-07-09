/**
 * js/inspection.js — Image upload, preview, AI analysis, review and save.
 */

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupUserUI();

  const form          = document.getElementById('inspection-form');
  const imageInput    = document.getElementById('image-input');
  const dropzone      = document.getElementById('dropzone');
  const previewWrap   = document.getElementById('preview-wrap');
  const previewImg    = document.getElementById('preview-img');
  const filenameTxt   = document.getElementById('preview-filename');
  const sizeTxt       = document.getElementById('preview-size');
  const btnAnalyze    = document.getElementById('btn-analyze');
  const bboxLayer     = document.getElementById('bbox-layer');

  // Review Section & Buttons
  const reviewBox     = document.getElementById('review-box');
  const btnSave       = document.getElementById('btn-save');
  const btnReset      = document.getElementById('btn-reset');
  const alertBar      = document.getElementById('alert-bar');

  // Result panels
  const resultEmpty      = document.getElementById('result-empty');
  const resultProcessing = document.getElementById('result-processing');
  const resultPanel      = document.getElementById('result-panel');
  const analysisBadge    = document.getElementById('analysis-badge');

  let currentFile = null;
  let analysisData = null; // store the AI analysis response

  // ── File Drag & Drop ─────────────────────────────────────────
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  imageInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showAlert('Please upload a valid image file.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showAlert('File exceeds 10MB limit.', 'error');
      return;
    }

    currentFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      filenameTxt.textContent = file.name;
      sizeTxt.textContent = (file.size / 1024).toFixed(0) + ' KB';
      
      dropzone.style.display = 'none';
      previewWrap.classList.add('show');
      btnAnalyze.disabled = false;
      bboxLayer.innerHTML = '';
      resetResult();
      hideAlert();
    };
    reader.readAsDataURL(file);
  }

  // ── Trigger AI Analysis (Form Submit) ────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentFile) return;

    // UI State: Processing
    btnAnalyze.disabled = true;
    btnAnalyze.textContent = '⏳ Analyzing...';
    resultEmpty.style.display = 'none';
    resultPanel.style.display = 'none';
    resultProcessing.classList.add('show');
    bboxLayer.innerHTML = '';
    reviewBox.classList.remove('show');
    hideAlert();

    console.log('[Upload DEBUG] Selected file:', currentFile.name, '| Size:', currentFile.size, '| Type:', currentFile.type);

    try {
      const formData = new FormData();
      formData.append('image', currentFile);
      
      console.log('[Upload DEBUG] FormData prepared. Calling API...');

      // 1. Send the image to the backend vision endpoint
      const res = await apiFetch('/inspections/analyze', {
        method: 'POST',
        body: formData
      });

      console.log('[Upload DEBUG] Success response:', res);
      analysisData = res.data;

      // 2. Populate the review fields with AI suggested results
      fillReview(analysisData);

      // 3. Show AI prediction on the result panel
      showResult(analysisData);

      // 4. Reveal the inspector review form section
      reviewBox.classList.add('show');
      btnAnalyze.textContent = '🔬 Re-Analyze Image';
      btnAnalyze.disabled = false;

      // 5. Unconditionally trigger auto-save for seamless workflow
      await autoSaveInspection(analysisData);

    } catch (err) {
      console.error('[Upload DEBUG] Fetch failed:', err);
      // Temporarily show full error details in UI
      const debugMsg = `UPLOAD ERROR: ${err.message}. Check console for details.`;
      showAlert(debugMsg, 'error');
      resetResult();
      btnAnalyze.textContent = '🔬 Run AI Analysis';
      btnAnalyze.disabled = false;
    }
  });

  // ── Show Result ──────────────────────────────────────────
  function showResult(data) {
    resultProcessing.classList.remove('show');
    resultPanel.style.display = 'block';

    const ai = data.aiAnalysis;
    const card = document.getElementById('rs-card');
    const icon = document.getElementById('rs-icon');
    const statusEl = document.getElementById('rs-status');
    const recEl    = document.getElementById('rs-rec');
    const confBar  = document.getElementById('conf-bar');
    const confVal  = document.getElementById('conf-val');
    const defectsList = document.getElementById('defects-list');

    document.getElementById('rs-detected-product').textContent = ai.identifiedProduct || 'Unknown Product';
    document.getElementById('rs-product-category').textContent = ai.productCategory || 'Unknown Category';

    card.className = 'ai-status-card';
    confBar.className = 'conf-bar';

    if (ai.suggestedStatus === 'Fail') {
      card.classList.add('fail');
      icon.textContent = '❌';
      statusEl.textContent = 'DEFECTIVE';
      statusEl.style.color = '#b91c1c';
      recEl.textContent = 'Recommendation: REJECT';
      confBar.classList.add('red');
      analysisBadge.className = 'badge badge-defective';
      analysisBadge.textContent = 'Defective';
      analysisBadge.style.backgroundColor = '#fef2f2';
      analysisBadge.style.color = '#991b1b';
    } else if (ai.suggestedStatus === 'Needs Manual Review') {
      card.classList.add('review');
      icon.textContent = '🔍';
      statusEl.textContent = 'NEEDS REVIEW';
      statusEl.style.color = '#92400e';
      recEl.textContent = 'Recommendation: MANUAL INSPECTION';
      confBar.classList.add('yellow');
      analysisBadge.className = 'badge badge-warning';
      analysisBadge.textContent = 'Needs Review';
      analysisBadge.style.backgroundColor = '#fffbeb';
      analysisBadge.style.color = '#92400e';
    } else {
      card.classList.add('pass');
      icon.textContent = '✅';
      statusEl.textContent = 'GOOD';
      statusEl.style.color = '#15803d';
      recEl.textContent = 'Recommendation: ACCEPT';
      confBar.classList.add('green');
      analysisBadge.className = 'badge badge-good';
      analysisBadge.textContent = 'Pass';
      analysisBadge.style.backgroundColor = '#f0fdf4';
      analysisBadge.style.color = '#166534';
    }

    analysisBadge.style.display = 'inline-flex';
    confVal.textContent = ai.confidence + '%';
    setTimeout(() => { confBar.style.width = ai.confidence + '%'; }, 100);

    // Defects list
    defectsList.innerHTML = '';
    if (!ai.defectDetected) {
      defectsList.innerHTML = '<div style="font-size:13px;color:#94a3b8;padding:10px 0;">No defects detected on this product.</div>';
    } else {
      const row = document.createElement('div');
      row.className = 'defect-row';
      const sevBadge = `<span class="badge severity-${(ai.severity||'none').toLowerCase()}">${ai.severity}</span>`;
      row.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="dt">${ai.defectType}</div>
          ${sevBadge}
        </div>
        <div class="dd">${ai.description}</div>
      `;
      defectsList.appendChild(row);

      // Draw bounding box on image
      const box = document.createElement('div');
      box.style.cssText = `position:absolute;left:20%;top:25%;width:50%;height:45%;
        border:3px solid #ef4444;border-radius:4px;
        background:rgba(239,68,68,0.12);
        box-shadow:0 0 14px rgba(239,68,68,0.5);`;
      const label = document.createElement('div');
      label.style.cssText = `position:absolute;top:-26px;left:-3px;
        background:#ef4444;color:#fff;font-size:11px;font-weight:700;
        padding:2px 8px;border-radius:4px;white-space:nowrap;`;
      label.textContent = `${ai.defectType} (${ai.confidence}%)`;
      box.appendChild(label);
      bboxLayer.appendChild(box);
    }
  }

  // ── Fill Review Form ─────────────────────────────────────
  function fillReview(data) {
    const ai = data.aiAnalysis;
    const st = ai.suggestedStatus;
    
    const prodInput = document.getElementById('review-detected-product');
    if (prodInput) prodInput.value = ai.identifiedProduct || 'Unknown Product';
    
    document.getElementById('review-status').value = 
      st === 'Needs Manual Review' ? 'Needs Manual Review' :
      st === 'Fail' ? 'DEFECTIVE' : 'GOOD';
    document.getElementById('review-defect-type').value = ai.defectType || 'None';
    document.getElementById('review-severity').value    = ai.severity    || 'None';
    document.getElementById('review-description').value = ai.description || '';
  }

  // ── Save Inspector Reviewed Record ──────────────────────────
  btnSave.addEventListener('click', async () => {
    if (!analysisData) return;

    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    loaderText.textContent = 'Saving inspection record...';
    loader.classList.add('visible');

    const prodInput = document.getElementById('review-detected-product');
    const identifiedProduct = (prodInput ? prodInput.value : '') || analysisData.aiAnalysis.identifiedProduct;
    const productCategory = analysisData.aiAnalysis.productCategory || 'General';
    const productCode = 'AUTO';
    const productName = identifiedProduct;
    const status      = document.getElementById('review-status').value;
    const defectType  = document.getElementById('review-defect-type').value;
    const severity    = document.getElementById('review-severity').value;
    const description = document.getElementById('review-description').value;
    const notes       = document.getElementById('review-notes').value;

    try {
      await apiFetch('/inspections/save', {
        method: 'POST',
        body: JSON.stringify({
          productCode, productName, status,
          identifiedProduct, productCategory,
          imageUrl: analysisData.imageUrl,
          notes, confidence: analysisData.aiAnalysis.confidence,
          aiAnalysis: { 
            identifiedProduct, productCategory,
            defectDetected: status !== 'GOOD', 
            defectType, severity, description, 
            confidence: analysisData.aiAnalysis.confidence 
          },
          defects: status !== 'GOOD' ? [{ defectType, severity, description, bboxX:120,bboxY:150,bboxWidth:160,bboxHeight:120 }] : []
        })
      });

      showAlert('✅ Inspection saved! Redirecting to history...', 'success');
      setTimeout(() => { window.location.href = 'history.html'; }, 1400);

    } catch (err) {
      console.error('[Upload DEBUG] Save failed:', err);
      showAlert(`Save failed: ${err.message}`, 'error');
    } finally {
      loader.classList.remove('visible');
    }
  });

  // ── Reset Form ──────────────────────────────────────────────
  btnReset.addEventListener('click', () => {
    currentFile = null;
    analysisData = null;
    imageInput.value = '';
    previewWrap.classList.remove('show');
    dropzone.style.display = '';
    btnAnalyze.disabled = true;
    btnAnalyze.textContent = '🔬 Run AI Analysis';
    bboxLayer.innerHTML = '';
    reviewBox.classList.remove('show');
    resetResult();
    hideAlert();
  });

  // ── Auto Save Inspection ──────────────────────────────────
  async function autoSaveInspection(data) {
    const ai = data.aiAnalysis;
    const productCategory = ai.productCategory || 'General';
    const productCode = 'AUTO';
    const productName = ai.identifiedProduct || 'Metal Component';
    
    // Status mapping: 'Pass'/'Fail' -> 'GOOD'/'DEFECTIVE'
    const status = ai.suggestedStatus === 'Needs Manual Review' ? 'Needs Manual Review' :
                   ai.suggestedStatus === 'Fail' ? 'DEFECTIVE' : 'GOOD';
                   
    const defectType  = ai.defectType || 'None';
    const severity    = ai.severity || 'None';
    const description = ai.description || '';
    const notes       = 'Automatically saved by system';

    try {
      await apiFetch('/inspections/save', {
        method: 'POST',
        body: JSON.stringify({
          productCode, productName, status,
          identifiedProduct: productName, productCategory,
          imageUrl: data.imageUrl,
          notes, confidence: ai.confidence,
          aiAnalysis: { 
            identifiedProduct: productName, productCategory,
            defectDetected: status !== 'GOOD', 
            defectType, severity, description, 
            confidence: ai.confidence 
          },
          defects: status !== 'GOOD' ? [{ defectType, severity, description, bboxX:120,bboxY:150,bboxWidth:160,bboxHeight:120 }] : []
        })
      });

      showAlert('✅ Inspection complete & automatically saved to history!', 'success');
      setTimeout(() => { window.location.href = 'history.html'; }, 1600);

    } catch (err) {
      console.error('[Upload DEBUG] Auto-save failed:', err);
      showAlert(`Auto-save failed: ${err.message}`, 'error');
    }
  }

  // ── Helpers ─────────────────────────────────────────────────
  function resetResult() {
    resultEmpty.style.display = 'flex';
    resultPanel.style.display = 'none';
    resultProcessing.classList.remove('show');
    analysisBadge.style.display = 'none';
    document.getElementById('conf-bar').style.width = '0%';
  }

  function showAlert(msg, type) {
    alertBar.textContent = msg;
    alertBar.className = `alert-bar show ${type}`;
  }
  
  function hideAlert() { 
    alertBar.className = 'alert-bar'; 
  }

});
