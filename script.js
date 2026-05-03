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

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    pos[i3]   = (Math.random() - 0.5) * 180;
    pos[i3+1] = (Math.random() - 0.5) * 110;
    pos[i3+2] = (Math.random() - 0.5) * 50;
    vel.push({ x: (Math.random()-0.5)*0.03, y: (Math.random()-0.5)*0.022 });

    // KPRIET brand colours: green / blue / mid
    const t = Math.random();
    if (t < 0.45) { cols[i3]=0.18; cols[i3+1]=0.55; cols[i3+2]=0.30; }       // green
    else if (t < 0.78) { cols[i3]=0.16; cols[i3+1]=0.37; cols[i3+2]=0.67; }  // blue
    else { cols[i3]=0.22; cols[i3+1]=0.70; cols[i3+2]=0.55; }                 // teal
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(cols, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.85, vertexColors: true, transparent: true, opacity: 0.5,
    sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });

  const particles = new THREE.Points(geo, mat);
  scene.add(particles);

  /* ── Floating wireframe octahedra (brand colours) ── */
  const shapes = [];
  const octGeo  = new THREE.OctahedronGeometry(3.5, 0);
  const shapeColors = [0x2d8b4e, 0x2a5fac, 0x27a04e, 0x1e4f9a, 0x3db366];

  for (let i = 0; i < 5; i++) {
    const m = new THREE.MeshBasicMaterial({
      color: shapeColors[i % shapeColors.length],
      wireframe: true, transparent: true,
      opacity: 0.06 + Math.random() * 0.06,
    });
    const mesh = new THREE.Mesh(octGeo, m);
    const s = 1.4 + Math.random() * 2.8;
    mesh.scale.set(s, s, s);
    mesh.position.set(
      (Math.random()-0.5)*110, (Math.random()-0.5)*65, (Math.random()-0.5)*28 - 15
    );
    mesh.userData = {
      rx: (Math.random()-0.5)*0.007, ry: (Math.random()-0.5)*0.005,
      fSpeed: 0.35 + Math.random()*0.35, fAmp: 2.5 + Math.random()*3,
      fOff: Math.random()*Math.PI*2, baseY: mesh.position.y,
    };
    scene.add(mesh);
    shapes.push(mesh);
  }

  /* ── Subtle grid ── */
  const grid = new THREE.GridHelper(180, 22, 0x2d8b4e, 0x0a1a10);
  grid.position.y = -42;
  grid.material.transparent = true;
  grid.material.opacity = 0.1;
  scene.add(grid);

  /* ── Mouse parallax ── */
  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = (e.clientX/window.innerWidth  - 0.5) * 0.45;
    my = (e.clientY/window.innerHeight - 0.5) * 0.3;
  }, { passive: true });

  /* ── Resize ── */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, { passive: true });

  /* ── Animation loop ── */
  let raf;
  const clock = new THREE.Clock();

  function animate() {
    raf = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Drift particles
    const arr = geo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      arr[i3]   += vel[i].x;
      arr[i3+1] += vel[i].y;
      if (arr[i3]   >  90)  arr[i3]   = -90;
      if (arr[i3]   < -90)  arr[i3]   =  90;
      if (arr[i3+1] >  55)  arr[i3+1] = -55;
      if (arr[i3+1] < -55)  arr[i3+1] =  55;
    }
    geo.attributes.position.needsUpdate = true;
    particles.rotation.y = t * 0.01;

    // Float shapes
    for (const s of shapes) {
      s.rotation.x += s.userData.rx;
      s.rotation.y += s.userData.ry;
      s.position.y = s.userData.baseY +
        Math.sin(t * s.userData.fSpeed + s.userData.fOff) * s.userData.fAmp;
    }

    // Camera parallax
    camera.position.x += (mx * 10 - camera.position.x) * 0.04;
    camera.position.y += (-my * 7  - camera.position.y) * 0.04;
    camera.lookAt(scene.position);

    // Grid scroll
    grid.position.z = -((t * 1.8) % 9);

    renderer.render(scene, camera);
  }

  animate();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { clock.start(); animate(); }
  });
})();


/* ──────────────────────────────────────────────
   2. GRADE SYSTEM
   ────────────────────────────────────────────── */
// Map grade dropdown value → display label
const GRADE_LABELS = {
  '10': 'S / O', '9': 'A+', '8': 'A',
  '7': 'B+', '6.5': 'B', '6': 'C+', '5': 'C',
};
// Map value → CSS pill class
const GRADE_PILL = {
  '10': 'gp-10', '9': 'gp-9', '8': 'gp-8',
  '7': 'gp-7', '6.5': 'gp-65', '6': 'gp-6', '5': 'gp-5',
};
// CGPA → performance label
function cgpaLabel(c) {
  if (c >= 9.5) return '🏆 Outstanding';
  if (c >= 9.0) return '⭐ Excellent';
  if (c >= 8.5) return '✦ Distinction';
  if (c >= 8.0) return '↑ First Class';
  if (c >= 7.0) return '◆ Second Class';
  if (c >= 6.0) return '◇ Pass Class';
  return '⚠ Below Average';
}
function cgpaColor(c) {
  if (c >= 9.0) return 'var(--green-lt)';
  if (c >= 8.0) return 'var(--blue-lt)';
  if (c >= 7.0) return '#9070e0';
  if (c >= 6.0) return '#c89040';
  return '#c06060';
}


/* ──────────────────────────────────────────────
   3. APP STATE
   ────────────────────────────────────────────── */
const state = { courses: [], nextId: 1, studentName: '' };


/* ──────────────────────────────────────────────
   4. DOM REFS
   ────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const els = {
  studentInput:  $('student-name'),
  subjectInput:  $('subject-name'),
  gradeSelect:   $('grade-select'),
  creditInput:   $('credit-input'),
  btnAdd:        $('btn-add-course'),
  btnSubmit:     $('btn-submit'),
  btnClear:      $('btn-clear'),
  btnDownload:   $('btn-download'),
  tbody:         $('course-tbody'),
  emptyState:    $('empty-state'),
  tableWrap:     $('table-wrap'),
  courseBadge:   $('course-count-badge'),
  tfootCredits:  $('tfoot-credits'),
  // Results
  resultsPanel:  $('results-panel'),
  resCourses:    $('res-courses'),
  resCredits:    $('res-credits'),
  resCgpa:       $('res-cgpa'),
  resCgpaTag:    $('res-cgpa-tag'),
  ringFill:      $('ring-progress'),
  // Toast
  toast:         $('toast'),
  // Theme
  themeToggle:   $('theme-toggle'),
  themeIcon:     $('theme-icon'),
  // Modal
  contactModal:  $('contact-modal'),
  btnCreator:    $('btn-creator'),
  modalClose:    $('modal-close'),
};


/* ──────────────────────────────────────────────
   5. THEME TOGGLE
   ────────────────────────────────────────────── */
let currentTheme = localStorage.getItem('kpriet-theme') || 'light';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  els.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('kpriet-theme', theme);
  currentTheme = theme;
}

applyTheme(currentTheme); // load saved preference

els.themeToggle.addEventListener('click', () => {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});


/* ──────────────────────────────────────────────
   6. CONTACT MODAL
   ────────────────────────────────────────────── */
els.btnCreator.addEventListener('click', () => {
  els.contactModal.classList.add('open');
  document.body.style.overflow = 'hidden';
});
function closeModal() {
  els.contactModal.classList.remove('open');
  document.body.style.overflow = '';
}
els.modalClose.addEventListener('click', closeModal);
els.contactModal.addEventListener('click', e => {
  if (e.target === els.contactModal) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});


/* ──────────────────────────────────────────────
   7. VALIDATION
   ────────────────────────────────────────────── */
function clearErrors() {
  ['fg-student','fg-subject','fg-grade','fg-credit'].forEach(id => {
    const el = $(id);
    if (el) el.classList.remove('has-error');
  });
  [els.studentInput, els.subjectInput, els.gradeSelect, els.creditInput].forEach(el => {
    if (el) el.classList.remove('error');
  });
}

function setError(groupId, inputEl) {
  const grp = $(groupId);
  if (grp) grp.classList.add('has-error');
  if (inputEl) {
    inputEl.classList.add('error');
    // force reflow so shake animation re-triggers
    void inputEl.offsetWidth;
  }
}

// Validates only the course fields (subject, grade, credit)
function validateCourse() {
  let ok = true;
  clearErrors();

  if (!els.subjectInput.value.trim()) { setError('fg-subject', els.subjectInput); ok = false; }
  if (!els.gradeSelect.value)          { setError('fg-grade',   els.gradeSelect);  ok = false; }

  const cr = els.creditInput.value.trim();
  const crNum = Number(cr);
  if (!cr || isNaN(crNum) || crNum < 1 || crNum > 10 || !Number.isInteger(crNum)) {
    setError('fg-credit', els.creditInput);
    ok = false;
  }
  return ok;
}


/* ──────────────────────────────────────────────
   8. ADD COURSE
   ────────────────────────────────────────────── */
function addCourse() {
  if (!validateCourse()) {
    toast('Please fix the highlighted fields', 'error');
    return;
  }

  const name  = els.subjectInput.value.trim();
  const grVal = parseFloat(els.gradeSelect.value);
  const grLbl = GRADE_LABELS[String(grVal)] || String(grVal);
  const cr    = parseInt(els.creditInput.value, 10);

  const course = { id: state.nextId++, name, grade: grVal, gradeLabel: grLbl, credit: cr };
  state.courses.push(course);

  appendRow(course);
  updateBadge();
  updateTfoot();

  // Reset only course fields; keep student name
  els.subjectInput.value = '';
  els.gradeSelect.value  = '';
  els.creditInput.value  = '';
  clearErrors();
  els.subjectInput.focus();

  // Hide results panel (need to re-submit)
  els.resultsPanel.style.display = 'none';

  showCtrlBtns(true);
  toast(`"${name}" added`, 'success');
}


/* ──────────────────────────────────────────────
   9. RENDER TABLE ROW
   ────────────────────────────────────────────── */
function appendRow(course) {
  els.emptyState.style.display = 'none';
  els.tableWrap.style.display  = 'block';

  const idx  = state.courses.length;
  const pill = GRADE_PILL[String(course.grade)] || 'gp-5';

  const tr = document.createElement('tr');
  tr.dataset.id = course.id;
  tr.style.animationDelay = '0ms';
  tr.innerHTML = `
    <td class="row-num">${String(idx).padStart(2,'0')}</td>
    <td>${escHtml(course.name)}</td>
    <td><span class="grade-pill ${pill}">${escHtml(course.gradeLabel)}</span></td>
    <td>${course.credit}</td>
    <td><button class="btn-delete" data-id="${course.id}" title="Remove">&#10005;</button></td>
  `;
  tr.querySelector('.btn-delete').addEventListener('click', () => deleteRow(course.id, tr));
  els.tbody.appendChild(tr);
}

function deleteRow(id, trEl) {
  trEl.style.transition = 'opacity 0.22s, transform 0.22s';
  trEl.style.opacity    = '0';
  trEl.style.transform  = 'translateX(24px)';
  setTimeout(() => {
    trEl.remove();
    state.courses = state.courses.filter(c => c.id !== id);
    renumberRows();
    updateBadge();
    updateTfoot();
    els.resultsPanel.style.display = 'none';
    if (state.courses.length === 0) {
      els.emptyState.style.display = '';
      els.tableWrap.style.display  = 'none';
      showCtrlBtns(false);
    }
    toast('Course removed', 'info');
  }, 230);
}

function renumberRows() {
  els.tbody.querySelectorAll('tr').forEach((tr, i) => {
    const cell = tr.querySelector('.row-num');
    if (cell) cell.textContent = String(i + 1).padStart(2, '0');
  });
}

function updateBadge() {
  const n = state.courses.length;
  els.courseBadge.textContent = `${n} course${n !== 1 ? 's' : ''}`;
}

function updateTfoot() {
  const total = state.courses.reduce((s, c) => s + c.credit, 0);
  els.tfootCredits.textContent = state.courses.length ? total : '—';
}

function showCtrlBtns(show) {
  els.btnClear.style.display    = show ? 'inline-flex' : 'none';
  els.btnDownload.style.display = show ? 'inline-flex' : 'none';
}


/* ──────────────────────────────────────────────
   10. CALCULATE CGPA  (only on Submit click)
   ────────────────────────────────────────────── */
function calculateAndShow() {
  if (state.courses.length === 0) {
    toast('Add at least one course first', 'error');
    return;
  }

  // Save student name at submit time
  state.studentName = els.studentInput.value.trim();

  const totalCr  = state.courses.reduce((s, c) => s + c.credit, 0);
  const totalGP  = state.courses.reduce((s, c) => s + c.grade * c.credit, 0);
  const cgpa     = totalGP / totalCr;

  // Show results panel with animation
  els.resultsPanel.style.display = '';
  // Force reflow so animation triggers freshly every time
  void els.resultsPanel.offsetWidth;
  els.resultsPanel.style.animation = 'none';
  void els.resultsPanel.offsetWidth;
  els.resultsPanel.style.animation = '';

  // Animate counter for courses and credits
  animCount(els.resCourses,  0, state.courses.length, 500);
  animCount(els.resCredits,  0, totalCr,               600);

  // CGPA display + ring
  els.resCgpa.textContent    = cgpa.toFixed(2);
  els.resCgpaTag.textContent = cgpaLabel(cgpa);
  els.resCgpaTag.style.color = cgpaColor(cgpa);

  // Ring: circumference = 2π × 50 ≈ 314.16
  const CIRC = 314.16;
  els.ringFill.style.strokeDashoffset = Math.max(0, CIRC - (cgpa / 10) * CIRC);

  // Scroll results into view smoothly
  setTimeout(() => {
    els.resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 80);

  toast(`CGPA calculated: ${cgpa.toFixed(2)}`, 'success');
}

function animCount(el, from, to, dur) {
  const start = performance.now();
  (function step(now) {
    const p = Math.min((now - start) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3); // cubic ease-out
    el.textContent = Math.round(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}


/* ──────────────────────────────────────────────
   11. CLEAR ALL
   ────────────────────────────────────────────── */
function clearAll() {
  if (!state.courses.length) return;
  if (!confirm('Clear all courses? This cannot be undone.')) return;
  state.courses = [];
  els.tbody.innerHTML = '';
  els.emptyState.style.display  = '';
  els.tableWrap.style.display   = 'none';
  els.resultsPanel.style.display = 'none';
  showCtrlBtns(false);
  updateBadge();
  els.tfootCredits.textContent  = '—';
  toast('All courses cleared', 'info');
}


/* ──────────────────────────────────────────────
   12. PDF EXPORT — professional layout
   Logo top-left | Title | Student name | Table
   NO grade points column
   ────────────────────────────────────────────── */
function downloadPDF() {
  if (!state.courses.length) { toast('No courses to export', 'error'); return; }

  const { jsPDF } = window.jspdf;
  if (!jsPDF) { toast('PDF library not available', 'error'); return; }

  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW    = doc.internal.pageSize.getWidth();
  const PH    = doc.internal.pageSize.getHeight();
  const ML    = 18; // left margin
  const MR    = 18; // right margin
  const CW    = PW - ML - MR;

  /* ── Background ── */
  doc.setFillColor(248, 253, 250);
  doc.rect(0, 0, PW, PH, 'F');

  /* ── Top colour bar ── */
  doc.setFillColor(45, 139, 78);
  doc.rect(0, 0, PW, 4, 'F');
  doc.setFillColor(42, 95, 172);
  doc.rect(0, 4, PW, 1.2, 'F');

  /* ── Logo (top-left) ── */
  // Embed logo from first <img> in modal
  const logoEl = document.querySelector('.modal-logo-img');
  if (logoEl) {
    try {
      // Create canvas to convert image
      const cv = document.createElement('canvas');
      cv.width = 80; cv.height = 80;
      const ctx = cv.getContext('2d');
      ctx.drawImage(logoEl, 0, 0, 80, 80);
      const imgData = cv.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', ML, 10, 18, 18);
    } catch(e) { /* skip if CORS blocks */ }
  }

  /* ── Title block (right of logo) ── */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(42, 95, 172);
  doc.text('KPRIET-CGPA Calculator', ML + 22, 17);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 130, 110);
  doc.text('KPR Institute of Engineering and Technology', ML + 22, 23);

  /* ── Divider ── */
  doc.setDrawColor(45, 139, 78);
  doc.setLineWidth(0.5);
  doc.line(ML, 31, PW - MR, 31);

  /* ── Student name ── */
  const student = state.studentName || 'N/A';
  const dateStr = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Student Name:', ML, 39);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(42, 95, 172);
  doc.text(student, ML + 32, 39);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Date:', PW - MR - 42, 39);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(dateStr, PW - MR - 28, 39);

  /* ── Summary row ── */
  const totalCr = state.courses.reduce((s,c) => s + c.credit, 0);
  const totalGP = state.courses.reduce((s,c) => s + c.grade * c.credit, 0);
  const cgpa    = totalGP / totalCr;

  // Summary card background
  doc.setFillColor(240, 252, 245);
  doc.roundedRect(ML, 44, CW, 22, 3, 3, 'F');
  doc.setDrawColor(45, 139, 78);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, 44, CW, 22, 3, 3, 'S');

  const statItems = [
    ['Total Courses', String(state.courses.length)],
    ['Total Credits', String(totalCr)],
    ['Final CGPA',    cgpa.toFixed(2)],
  ];
  const colW = CW / 3;
  statItems.forEach(([label, val], i) => {
    const x = ML + colW * i + colW / 2;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(i === 2 ? 45 : 42, i === 2 ? 139 : 95, i === 2 ? 78 : 172);
    doc.text(val, x, 54, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 130, 110);
    doc.text(label.toUpperCase(), x, 61, { align: 'center' });
  });

  /* ── Table header label ── */
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 139, 78);
  doc.text('COURSE DETAILS', ML, 74);

  /* ── Course table (Subject | Grade | Credits — NO grade points) ── */
  const tableBody = state.courses.map((c, i) => [
    String(i + 1).padStart(2, '0'),
    c.name,
    c.gradeLabel,
    String(c.credit),
  ]);
  // Totals row
  tableBody.push(['', 'TOTAL', '', String(totalCr)]);

  doc.autoTable({
    startY: 77,
    head: [['#', 'Subject Name', 'Grade', 'Credits']],
    body: tableBody,
    theme: 'plain',
    margin: { left: ML, right: MR },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [30, 40, 35],
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      fillColor: [255, 255, 255],
      lineColor: [220, 240, 228],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [45, 139, 78],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [245, 253, 248],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', textColor: [160, 180, 165], fontSize: 8 },
      1: { cellWidth: 90 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 28, halign: 'center', fontStyle: 'bold', textColor: [42, 95, 172] },
    },
    didParseCell(data) {
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fillColor    = [235, 248, 240];
        data.cell.styles.fontStyle    = 'bold';
        data.cell.styles.textColor    = [30, 80, 50];
        data.cell.styles.fontSize     = 9.5;
      }
    },
    didDrawPage() {
      // Footer on every page
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 180, 165);
      doc.text('KPRIET-CGPA Calculator  ·  KPR Institute of Engineering and Technology', PW/2, PH - 10, { align: 'center' });
      // Bottom bar
      doc.setFillColor(42, 95, 172);
      doc.rect(0, PH - 3.5, PW, 1, 'F');
      doc.setFillColor(45, 139, 78);
      doc.rect(0, PH - 2.5, PW, 2.5, 'F');
    },
  });

  const fname = `KPRIET_CGPA_${(student || 'Report').replace(/\s+/g,'_')}.pdf`;
  doc.save(fname);
  toast('PDF downloaded!', 'success');
}


/* ──────────────────────────────────────────────
   13. TOAST
   ────────────────────────────────────────────── */
let toastTimer;
function toast(msg, type = 'info') {
  const el = els.toast;
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.className = `toast show ${type}`;
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}


/* ──────────────────────────────────────────────
   14. UTILITY
   ────────────────────────────────────────────── */
function escHtml(str) {
  return str
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


/* ──────────────────────────────────────────────
   15. BUTTON RIPPLE HELPER
   ────────────────────────────────────────────── */
function attachRipple(btn) {
  btn.addEventListener('click', function(e) {
    const r   = this.querySelector('.btn-ripple-el');
    if (!r) return;
    const rc  = this.getBoundingClientRect();
    r.style.left = (e.clientX - rc.left)  + 'px';
    r.style.top  = (e.clientY - rc.top)   + 'px';
    r.classList.remove('active');
    void r.offsetWidth;
    r.classList.add('active');
  });
}
attachRipple(els.btnAdd);
attachRipple(els.btnSubmit);


/* ──────────────────────────────────────────────
   16. EVENT LISTENERS
   ────────────────────────────────────────────── */
els.btnAdd.addEventListener('click', addCourse);
els.btnSubmit.addEventListener('click', calculateAndShow);
els.btnClear.addEventListener('click', clearAll);
els.btnDownload.addEventListener('click', downloadPDF);

// Enter key submits add-course from subject / credit inputs
[els.subjectInput, els.creditInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') els.btnAdd.click(); });
});

// Clear error styling as user types / selects
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
  // Strip non-numeric characters
  els.creditInput.value = els.creditInput.value.replace(/[^0-9]/g, '');
  $('fg-credit').classList.remove('has-error');
  els.creditInput.classList.remove('error');
});


/* ──────────────────────────────────────────────
   17. INIT
   ────────────────────────────────────────────── */
updateBadge();
els.studentInput.focus();
console.log('%cKPRIET-CGPA Calculator ready ✓', 'color:#2d8b4e;font-family:monospace;font-size:13px;');
