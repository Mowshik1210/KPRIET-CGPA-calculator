/* ═══════════════════════════════════════════════════════
   KPRIET-CGPA CALCULATOR — script.js
   Three.js Background + Full App Logic + PDF Export
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────
   1. THREE.JS ANIMATED BACKGROUND
   Optimised: low particle count, no heavy textures
   ────────────────────────────────────────────── */
(function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  /* Renderer */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 800);
  camera.position.z = 55;

  /* ── Particle field ── */
  const COUNT = 220;
  const pos   = new Float32Array(COUNT * 3);
  const cols  = new Float32Array(COUNT * 3);
  const vel   = [];

  for (let i = 0; i < COUNT * 3; i += 3) {
    pos[i]     = (Math.random() - 0.5) * 130;
    pos[i + 1] = (Math.random() - 0.5) * 130;
    pos[i + 2] = (Math.random() - 0.5) * 100;

    cols[i]     = 0.176; // #2d8b4e green
    cols[i + 1] = 0.545;
    cols[i + 2] = 0.306;
    
    vel.push({
      x: (Math.random() - 0.5) * 0.08,
      y: (Math.random() - 0.5) * 0.08,
      z: (Math.random() - 0.5) * 0.05
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

  // Round soft particle representation
  const pMat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const pSystem = new THREE.Points(geo, pMat);
  scene.add(pSystem);

  /* Interaction points */
  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.015;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.015;
  });

  /* Animation tick loop */
  function tick() {
    requestAnimationFrame(tick);
    
    const pArr = geo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      const idx = i * 3;
      pArr[idx]     += vel[i].x;
      pArr[idx + 1] += vel[i].y;
      pArr[idx + 2] += vel[i].z;

      // Boundaries wrap around
      if (Math.abs(pArr[idx]) > 75)  pArr[idx] *= -0.95;
      if (Math.abs(pArr[idx + 1]) > 75) pArr[idx + 1] *= -0.95;
      if (Math.abs(pArr[idx + 2]) > 60) pArr[idx + 2] *= -0.95;
    }
    geo.attributes.position.needsUpdate = true;

    // Camera follow ease
    camera.position.x += (mouseX - camera.position.x) * 0.05;
    camera.position.y += (-mouseY - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }
  tick();

  /* Window resize scaling handler */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();

/* ──────────────────────────────────────────────
   2. DOM ELEMENT SELECTORS
   ────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const els = {
  themeToggle: $('theme-toggle'),
  themeIcon: $('theme-icon'),
  
  studentInput: $('student-name'),
  subjectInput: $('subject-name'),
  gradeSelect: $('grade-select'),
  creditInput: $('course-credit'),
  
  btnAdd: $('btn-add'),
  btnSubmit: $('btn-submit'),
  btnClear: $('btn-clear'),
  btnDownload: $('btn-download'),
  
  tableBody: $('table-body'),
  emptyRow: $('empty-row-msg'),
  
  resCgpa: $('res-cgpa'),
  resCgpaTag: $('res-cgpa-tag'),
  resCredits: $('res-credits'),
  resCourses: $('res-courses'),
  ringProgress: $('ring-progress'),
  downloadSec: $('download-section'),
  
  openCreator: $('open-creator-modal'),
  closeCreator: $('close-creator-modal'),
  creatorModal: $('creator-modal'),
  toastContainer: $('toast-container'),

  // Option 2 Selectors
  // ══ CHANGED: fixed sgpaSem1/sgpaSem2 refs replaced with the semester-count
  // input and the container that holds the dynamically generated SGPA fields.
  numSemesters: $('num-semesters'),
  sgpaFieldsContainer: $('sgpa-fields-container'),
  btnCalcSgpaCgpa: $('btn-calc-sgpa-cgpa'),
  btnClearSgpaCgpa: $('btn-clear-sgpa-cgpa'),
  resSgpaCgpaVal: $('res-sgpa-cgpa-val'),
  resSgpaCgpaTag: $('res-sgpa-cgpa-tag'),
  ringProgressSgpaCgpa: $('ring-progress-sgpa-cgpa'),

  // Option 3 Selectors
  cgpaPctInput: $('cgpa-pct-input'),
  btnCalcCgpaPct: $('btn-calc-cgpa-pct'),
  btnClearCgpaPct: $('btn-clear-cgpa-pct'),
  resCgpaPctVal: $('res-cgpa-pct-val'),
  resCgpaPctTag: $('res-cgpa-pct-tag'),
  ringProgressCgpaPct: $('ring-progress-cgpa-pct')
};

/* ──────────────────────────────────────────────
   3. APP STATE STATEFUL LAYER
   ────────────────────────────────────────────── */
let courses = [];

/* ──────────────────────────────────────────────
   4. NAVIGATION SECTION ROUTER ENGINE
   ────────────────────────────────────────────── */
function showView(viewId) {
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(sec => sec.classList.remove('active-view'));

  const targetSec = $('view-' + viewId);
  if (targetSec) {
    targetSec.classList.add('active-view');
  }

  // Update headers context subtext dynamically for specific visual continuity
  const mainTitle = $('app-main-title');
  const subTitle = $('app-subtitle');
  if (viewId === 'landing') {
    mainTitle.textContent = "CGPA Calculator";
    subTitle.textContent = "An advanced, interactive 3D grade management system tailored for KPRIET students.";
  } else if (viewId === 'sgpa') {
    mainTitle.textContent = "SGPA Calculator";
    subTitle.textContent = "Enter your semester structural details course by course to generate performance analytics.";
  } else if (viewId === 'sgpa-cgpa') {
    mainTitle.textContent = "SGPA to CGPA Converter";
    subTitle.textContent = "Average out separate modular terms into a cumulative aggregated performance metric.";
  } else if (viewId === 'cgpa-pct') {
    mainTitle.textContent = "CGPA to Percentage";
    subTitle.textContent = "Transform cumulative indices to universal linear percentage values accurately.";
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Attach Event Listeners to Landing Menu Option items
$('card-to-sgpa').addEventListener('click', () => showView('sgpa'));
$('card-to-sgpa-cgpa').addEventListener('click', () => showView('sgpa-cgpa'));
$('card-to-cgpa-pct').addEventListener('click', () => showView('cgpa-pct'));

/* ──────────────────────────────────────────────
   5. THEME MANAGEMENT SYSTEM (PERSISTENT)
   ────────────────────────────────────────────── */
function initTheme() {
  const savedTheme = localStorage.getItem('kpriet-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('kpriet-theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  if (!els.themeIcon) return;
  els.themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
}

els.themeToggle.addEventListener('click', toggleTheme);
document.addEventListener('DOMContentLoaded', initTheme);

/* ──────────────────────────────────────────────
   6. TOAST NOTIFICATIONS CORE LOGIC
   ────────────────────────────────────────────── */
function showToast(message, type = 'success') {
  if (!els.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  els.toastContainer.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ──────────────────────────────────────────────
   7. CREATOR INFO OVERLAY MODAL TOGGLERS
   ────────────────────────────────────────────── */
if (els.openCreator && els.creatorModal && els.closeCreator) {
  els.openCreator.addEventListener('click', () => els.creatorModal.classList.add('active'));
  els.closeCreator.addEventListener('click', () => els.creatorModal.classList.remove('active'));
  els.creatorModal.addEventListener('click', (e) => {
    if (e.target === els.creatorModal) els.creatorModal.classList.remove('active');
  });
}

/* ──────────────────────────────────────────────
   8. ADD COURSE HANDLER & VALIDATOR
   ────────────────────────────────────────────── */
function addCourse() {
  const student = els.studentInput.value.trim();
  const subject = els.subjectInput.value.trim();
  const gradeVal = els.gradeSelect.value;
  const creditVal = els.creditInput.value.trim();
  const gradeText   = els.gradeSelect.selectedOptions[0].text;  // Reads "B", "C+", "A+" etc. DIRECTLY
  const gradePoints = parseFloat(gradeVal);                     // Gives 6.5, 6, 5 etc. for CGPA math
  
  let valid = true;
  
  if (!student) {
    $('fg-student').classList.add('has-error');
    els.studentInput.classList.add('error');
    valid = false;
  }
  if (!subject) {
    $('fg-subject').classList.add('has-error');
    els.subjectInput.classList.add('error');
    valid = false;
  }
  if (!gradeVal) {
    $('fg-grade').classList.add('has-error');
    els.gradeSelect.classList.add('error');
    valid = false;
  }
  if (!creditVal || isNaN(creditVal) || parseInt(creditVal) <= 0) {
    $('fg-credit').classList.add('has-error');
    els.creditInput.classList.add('error');
    valid = false;
  }
  
  if (!valid) {
    showToast('Please correct the highlighted errors.', 'error');
    return;
  }

const course = {
  id: Date.now() + Math.random().toString(36).substr(2, 5),
  student: student,
  subject: subject,
  grade: parseFloat(gradeVal),
  gradeText: gradeText,
  credits: parseInt(creditVal)
};
  
  courses.push(course);
  renderCourseRow(course);
  updatePreCalculationsCount();
  
  els.subjectInput.value = '';
  els.gradeSelect.selectedIndex = 0;
  els.creditInput.value = '';
  els.subjectInput.focus();
  
  showToast(`Course "${subject}" added successfully.`);
}

/* ──────────────────────────────────────────────
   9. DYNAMIC ROW TRANSITION ENGINE
   ────────────────────────────────────────────── */
function renderCourseRow(course) {
  if (els.emptyRow) els.emptyRow.style.display = 'none';
  
  const tr = document.createElement('tr');
  tr.id = `row-${course.id}`;
  tr.className = 'row-anim';
  
  tr.innerHTML = `
    <td style="word-break: break-word; font-weight:500; color:var(--text-normal);">${escapeHtml(course.subject)}</td>
    <td style="text-align:center;"><span class="grade-pill">${course.gradeText}</span></td>
    <td style="text-align:center; font-weight:600; color:var(--text-normal);">${course.credits}</td>
    <td style="text-align:center;">
      <button class="btn-delete" title="Delete Course" data-id="${course.id}">&#128465;</button>
    </td>
  `;
  
  els.tableBody.appendChild(tr);
  
  tr.querySelector('.btn-delete').addEventListener('click', function() {
    deleteCourse(this.getAttribute('data-id'));
  });
}

function deleteCourse(id) {
  courses = courses.filter(c => c.id !== id);
  const row = $(`row-${id}`);
  if (row) {
    row.style.opacity = '0';
    row.style.transform = 'translateX(30px)';
    setTimeout(() => {
      row.remove();
      if (courses.length === 0 && els.emptyRow) {
        els.emptyRow.style.display = 'table-row';
      }
    }, 300);
  }
  updatePreCalculationsCount();
  resetCgpaDisplay();
  showToast('Course removed from list.', 'info');
}

function updatePreCalculationsCount() {
  if (els.resCourses) els.resCourses.textContent = courses.length;
  const totCreds = courses.reduce((sum, c) => sum + c.credits, 0);
  if (els.resCredits) els.resCredits.textContent = totCreds;
}

function resetCgpaDisplay() {
  if (els.resCgpa) els.resCgpa.innerHTML = '&#8212;';
  if (els.resCgpaTag) els.resCgpaTag.textContent = 'Submit to calculate';
  if (els.ringProgress) els.ringProgress.style.strokeDashoffset = '314.16';
  if (els.downloadSec) els.downloadSec.style.display = 'none';
}

/* ──────────────────────────────────────────────
   10. CORE MATHEMATICAL CGPA CALCULATION FORMULA
   ────────────────────────────────────────────── */
function calculateAndShow() {
  if (courses.length === 0) {
    showToast('Add at least one course before calculation.', 'error');
    return;
  }
  
  let totalPoints = 0;
  let totalCredits = 0;
  
  courses.forEach(c => {
    totalPoints += (c.grade * c.credits);
    totalCredits += c.credits;
  });
  
  const cgpa = totalPoints / totalCredits;
  const cgpaFixed = cgpa.toFixed(2);
  
  animateCgpaDial(parseFloat(cgpaFixed), els.resCgpa, els.ringProgress, els.resCgpaTag, 10);
  
  if (els.downloadSec) els.downloadSec.style.display = 'block';
  showToast('CGPA calculated successfully!', 'success');
}

function animateCgpaDial(targetVal, valueEl, ringEl, tagEl, maxScale) {
  let curr = 0;
  const duration = 750;
  const stepTime = 15;
  const steps = duration / stepTime;
  const increment = targetVal / steps;
  
  const timer = setInterval(() => {
    curr += increment;
    if (curr >= targetVal) {
      curr = targetVal;
      clearInterval(timer);
    }
    
    if (valueEl) valueEl.textContent = curr.toFixed(2);
    if (maxScale === 100 && valueEl) valueEl.textContent = curr.toFixed(2) + '%';
    
    const percentageOfMax = curr / maxScale;
    const offset = 314.16 - (314.16 * percentageOfMax);
    if (ringEl) ringEl.style.strokeDashoffset = offset;
  }, stepTime);
} 
  


function clearAll() {
  courses = [];
  els.tableBody.innerHTML = '';
  if (els.emptyRow) els.tableBody.appendChild(els.emptyRow);
  if (els.emptyRow) els.emptyRow.style.display = 'table-row';
  
  els.studentInput.value = '';
  els.subjectInput.value = '';
  els.gradeSelect.selectedIndex = 0;
  els.creditInput.value = '';
  
  ['fg-student', 'fg-subject', 'fg-grade', 'fg-credit'].forEach(id => {
    $(id).classList.remove('has-error');
  });
  [els.studentInput, els.subjectInput, els.gradeSelect, els.creditInput].forEach(el => {
    el.classList.remove('error');
  });
  
  updatePreCalculationsCount();
  resetCgpaDisplay();
  showToast('All fields and logs cleared.', 'info');
}

/* ──────────────────────────────────────────────
   11. NEW CONVERTER LOGIC SCRIPT (INPUT REGEX FILTER)
   ────────────────────────────────────────────── */
function filterDecimalInput(el) {
  let val = el.value;
  // Strip all non-numeric and non-decimal characters
  val = val.replace(/[^0-9.]/g, '');
  // Disallow multiple trailing decimals
  const splitVal = val.split('.');
  if (splitVal.length > 2) {
    val = splitVal[0] + '.' + splitVal.slice(1).join('');
  }
  el.value = val;
}

[els.cgpaPctInput].forEach(el => {
  if (el) {
    el.addEventListener('input', (e) => {
      filterDecimalInput(e.target);
      // Clean parent validation handles
      const pGroup = e.target.closest('.form-group');
      if (pGroup) pGroup.classList.remove('has-error');
      e.target.classList.remove('error');
    });
  }
});

/* ──────────────────────────────────────────────
   NEW: DYNAMIC SEMESTER FIELD GENERATOR
   Reads "Number of Semesters" and builds that many
   SGPA input fields inside #sgpa-fields-container.
   ────────────────────────────────────────────── */
function generateSemesterFields(count) {
  els.sgpaFieldsContainer.innerHTML = '';

  for (let i = 1; i <= count; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'form-group sgpa-dyn-field';
    wrap.id = `fg-sgpa-${i}`;

    wrap.innerHTML = `
      <label for="sgpa-sem-${i}">SGPA Semester ${i} <span class="req">*</span></label>
      <div class="input-wrapper">
        <span class="input-icon">&#128200;</span>
        <input type="text" id="sgpa-sem-${i}" placeholder="Eg: 8.50" autocomplete="off"/>
      </div>
      <div class="error-msg" id="err-sgpa-${i}">Enter a valid decimal index between 0.00 and 10.00</div>
    `;

    els.sgpaFieldsContainer.appendChild(wrap);

    // Attach the same decimal-filter + error-clear behaviour as before
    const inputEl = wrap.querySelector('input');
    inputEl.addEventListener('input', (e) => {
      filterDecimalInput(e.target);
      wrap.classList.remove('has-error');
      e.target.classList.remove('error');
    });
  }
}

// Rebuild the semester fields whenever the count changes
if (els.numSemesters) {
  els.numSemesters.addEventListener('input', () => {
    const raw = els.numSemesters.value.trim();
    const n = parseInt(raw, 10);

    $('fg-num-sem').classList.remove('has-error');
    els.numSemesters.classList.remove('error');

    if (raw && !isNaN(n) && n >= 1 && n <= 10) {
      generateSemesterFields(n);
    } else {
      // Invalid or empty count — clear any previously generated fields
      els.sgpaFieldsContainer.innerHTML = '';
    }
  });
}

/* ──────────────────────────────────────────────
   12. OPTION 2: SGPA TO CGPA CALCULATION LAYER
   ────────────────────────────────────────────── */
// ══ CHANGED: now reads N dynamically-generated SGPA fields instead of two fixed ones ══
function processSgpaToCgpa() {
  const raw = els.numSemesters.value.trim();
  const n = parseInt(raw, 10);

  // Validate the semester-count field first
  if (!raw || isNaN(n) || n < 1 || n > 10) {
    $('fg-num-sem').classList.add('has-error');
    els.numSemesters.classList.add('error');
    showToast('Enter a valid number of semesters between 1 and 10', 'error');
    return;
  }

  // Make sure the fields actually exist (covers paste/autofill edge cases)
  if (els.sgpaFieldsContainer.children.length !== n) {
    generateSemesterFields(n);
  }

  const sgpaInputs = els.sgpaFieldsContainer.querySelectorAll('input');
  let isValid = true;
  let total = 0;

  sgpaInputs.forEach((inputEl, idx) => {
    const raw = inputEl.value.trim();
    const val = parseFloat(raw);
    const fg  = $(`fg-sgpa-${idx + 1}`);

    if (!raw || isNaN(val) || val < 0 || val > 10) {
      if (fg) fg.classList.add('has-error');
      inputEl.classList.add('error');
      isValid = false;
    } else {
      total += val;
    }
  });

  if (!isValid) {
    showToast('Please insert logical decimal points between 0.00 and 10.00', 'error');
    return;
  }

  const resultCgpa = total / n;
  animateCgpaDial(resultCgpa, els.resSgpaCgpaVal, els.ringProgressSgpaCgpa, els.resSgpaCgpaTag, 10);
  showToast('Aggregated CGPA index derived successfully!');
}

// ══ CHANGED: clears the semester-count field and removes all dynamic SGPA fields ══
function clearSgpaToCgpa() {
  els.numSemesters.value = '';
  $('fg-num-sem').classList.remove('has-error');
  els.numSemesters.classList.remove('error');

  els.sgpaFieldsContainer.innerHTML = '';

  els.resSgpaCgpaVal.innerHTML = '&#8212;';
  els.ringProgressSgpaCgpa.style.strokeDashoffset = '314.16';
  els.resSgpaCgpaTag.textContent = 'Fill inputs and press Calculate';
  showToast('Converter parameters cleared.', 'info');
}

if (els.btnCalcSgpaCgpa) els.btnCalcSgpaCgpa.addEventListener('click', processSgpaToCgpa);
if (els.btnClearSgpaCgpa) els.btnClearSgpaCgpa.addEventListener('click', clearSgpaToCgpa);

/* ──────────────────────────────────────────────
   13. OPTION 3: CGPA TO PERCENTAGE CONVERSION
   ────────────────────────────────────────────── */
function processCgpaToPercentage() {
  const rawPct = els.cgpaPctInput.value.trim();
  let isValid = true;
  const valPct = parseFloat(rawPct);

  if (!rawPct || isNaN(valPct) || valPct < 0 || valPct > 10) {
    $('fg-cgpa-pct').classList.add('has-error');
    els.cgpaPctInput.classList.add('error');
    isValid = false;
  }

  if (!isValid) {
    showToast('Please enter a valid base CGPA index from 0.00 to 10.00', 'error');
    return;
  }

  const finalPercentage = (valPct / 10) * 100;
  animateCgpaDial(finalPercentage, els.resCgpaPctVal, els.ringProgressCgpaPct, els.resCgpaPctTag, 100);
  showToast('Linear percentage derived successfully!');
}

function clearCgpaToPercentage() {
  els.cgpaPctInput.value = '';
  $('fg-cgpa-pct').classList.remove('has-error');
  els.cgpaPctInput.classList.remove('error');
  
  els.resCgpaPctVal.innerHTML = '&#8212;';
  els.ringProgressCgpaPct.style.strokeDashoffset = '314.16';
  els.resCgpaPctTag.textContent = 'Fill input and press Convert';
  showToast('Conversion metric cleared.', 'info');
}

if (els.btnCalcCgpaPct) els.btnCalcCgpaPct.addEventListener('click', processCgpaToPercentage);
if (els.btnClearCgpaPct) els.btnClearCgpaPct.addEventListener('click', clearCgpaToPercentage);

/* ──────────────────────────────────────────────
   14. PDF GENERATOR CORE LAYER
   ────────────────────────────────────────────── */
function downloadPDF() {
  if (courses.length === 0) {
    showToast('Add at least one course to generate a report.', 'error');
    return;
  }
  
  const studentName = els.studentInput.value.trim() || 'KPRIET Student';
  const finalCgpa = els.resCgpa.textContent || '0.00';
  const totalCredits = els.resCredits.textContent || '0';
  
  let tableRowsHtml = '';
  courses.forEach((c, idx) => {
    tableRowsHtml += `
      <tr style="background-color: ${idx % 2 === 0 ? '#fdfdfd' : '#f7f9f8'}; border-bottom: 1px solid #e2ebd5;">
        <td style="padding: 10px 12px; font-size: 13px; color: #333;">${escapeHtml(c.subject)}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #333; text-align: center; font-weight: bold;">${c.gradeText}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #333; text-align: center;">${c.credits}</td>
      </tr>
    `;
  });
  
  const pdfContainer = document.createElement('div');
  pdfContainer.style.position = 'fixed';
  pdfContainer.style.top = '0';
  pdfContainer.style.left = '0';
  pdfContainer.style.width = '100vw';
  pdfContainer.style.height = '100vh';
  pdfContainer.style.overflow = 'hidden';
  pdfContainer.style.zIndex = '-9999';
  pdfContainer.style.opacity = '0.01';

  const pdfTemplate = document.createElement('div');
  pdfTemplate.style.width = '600px';
  pdfTemplate.style.display = 'block';
  pdfTemplate.style.background = '#ffffff';
  pdfTemplate.style.padding = '20px';
  pdfTemplate.style.boxSizing = 'border-box';
  pdfTemplate.style.fontFamily = "'Helvetica Neue', Arial, sans-serif";
  pdfTemplate.style.color = '#222';
  pdfTemplate.style.margin = '10px auto';
  
  pdfTemplate.innerHTML = `
    <div style="border: 2px solid #2d8b4e; padding: 15px; border-radius: 12px; position: relative; overflow: hidden;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #2d8b4e; padding-bottom: 15px; margin-bottom: 15px;">
        <div>
          <h1 style="margin: 0; font-size: 24px; color: #2d8b4e; letter-spacing: 0.5px;">KPR Institute of Engineering and Technology</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 0.5px;">Official Academic Performance Report</p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #777; line-height: 1.4;">
          Date: ${new Date().toLocaleDateString()}<br/>
          System: Autonomous
        </div>
      </div>
      
      <div style="background-color: #f3f9f5; border-left: 4px solid #2d8b4e; padding: 15px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 18%; font-size: 13px; color: #555; padding: 3px 0;">Student Name:</td>
            <td style="width: 52%; font-size: 14px; font-weight: bold; color: #111; padding: 3px 0;">${escapeHtml(studentName)}</td>
            <td style="width: 18%; font-size: 13px; color: #555; padding: 3px 0; text-align: right;">Total Credits:</td>
            <td style="width: 12%; font-size: 14px; font-weight: bold; color: #111; padding: 3px 0; text-align: right;">${totalCredits}</td>
          </tr>
        </table>
      </div>
      
      <h3 style="color: #2d8b4e; font-size: 14px; margin-bottom: 12px; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-weight: 700;">Registered Courses Registry</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px;">
        <thead>
          <tr style="background-color: #2d8b4e; color: white;">
            <th style="padding: 10px 12px; font-size: 13px; text-align: left; border-radius: 4px 0 0 4px;">Subject Course Description</th>
            <th style="padding: 10px 12px; font-size: 13px; text-align: center; width: 100px;">Grade Code</th>
            <th style="padding: 10px 12px; font-size: 13px; text-align: center; width: 100px; border-radius: 0 4px 4px 0;">Credits Value</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
      
      <div style="display: flex; justify-content: center; margin-top: 20px;">
        <div style="border: 2px dashed #2d8b4e; background-color: #fdfdfd; padding: 15px 20px; border-radius: 8px; text-align: center; min-width: 180px;box-sizing: border-box;">
          <div style="font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 4px;">Cumulative Score Result</div>
          <div style="font-size: 34px; font-weight: 800; color: #2d8b4e;">${finalCgpa} <span style="font-size:15px; font-weight:400; color:#555;">/ 10</span></div>
          <div style="font-size: 11px; color: #2a5fac; font-weight: 600; margin-top: 4px;">KPRIET Grading Evaluation Matrix</div>
        </div>
      </div>
      
      <div style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 10px; text-align: center; font-size: 11px; color: #888;">
        This statement is computer generated from the user portal logs and serves as an academic evaluation reference utility.
      </div>
    </div>
  `;
  
  pdfContainer.appendChild(pdfTemplate);
  document.body.appendChild(pdfContainer);
  
  const opt = {
    margin: 10,
    filename: `KPRIET_CGPA_Report_${studentName.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 800,
      scrollX: 0,
      scrollY: 0,
      x: 0
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  showToast('Generating document report...', 'info');
  
  setTimeout(() => {
    html2pdf()
      .set(opt)
      .from(pdfTemplate)
      .save()
      .then(() => {
        if (document.body.contains(pdfContainer)) {
          document.body.removeChild(pdfContainer);
        }
        showToast('PDF Report downloaded successfully!', 'success');
      })
      .catch(err => {
        console.error('PDF Generation Error:', err);
        if (document.body.contains(pdfContainer)) {
          document.body.removeChild(pdfContainer);
        }
        showToast('Could not compile PDF report.', 'error');
      });
  }, 100);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* ──────────────────────────────────────────────
   15. ACTION EVENT BINDINGS
   ────────────────────────────────────────────── */
els.btnAdd.addEventListener('click', addCourse);
els.btnSubmit.addEventListener('click', calculateAndShow);
els.btnClear.addEventListener('click', clearAll);
els.btnDownload.addEventListener('click', downloadPDF);

[els.subjectInput, els.creditInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') els.btnAdd.click(); });
});

els.studentInput.addEventListener('input', () => {
  $('fg-student').classList.remove('has-error');
  els.studentInput.classList.remove('error');
});
els.subjectInput.addEventListener('input', () => {
  $('fg-subject').classList.remove('has-error');
  els.subjectInput.classList.remove('error');
});
els.gradeSelect.addEventListener('change', () => {
  $('fg-grade').classList.remove('has-error');
  els.gradeSelect.classList.remove('error');
});
els.creditInput.addEventListener('input', () => {
  els.creditInput.value = els.creditInput.value.replace(/[^0-9]/g, '');
  $('fg-credit').classList.remove('has-error');
  els.creditInput.classList.remove('error');
});