/**
 * Main Application Logic
 * ระบบจองห้องประชุมออนไลน์ (Smart Meeting Room Booking System)
 * วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 */

let calendarInstance = null;
let roomUsageChartInstance = null;
let equipmentUsageChartInstance = null;

// Signature Pad State
let isDrawingSignature = false;
let sigCanvas, sigCtx;

// Active filter state
let currentApprovalFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initSignaturePad();
  initRoomShowcase();
  renderAllViews();
  setupFormAutoDefaults();
  initSettingsValues();
});

// ================= REAL-TIME THAI CLOCK =================
function initClock() {
  const el = document.getElementById('current-thai-time');
  const update = () => {
    const now = new Date();
    const thMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const dateStr = `${now.getDate()} ${thMonths[now.getMonth()]} ${now.getFullYear() + 543}`;
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (el) {
      el.innerHTML = `<i class="far fa-clock mr-1 text-amber-300"></i> วันนี้: ${dateStr} เวลา ${timeStr} น.`;
    }
  };
  update();
  setInterval(update, 1000);
}

// ================= TAB NAVIGATION =================
function switchTab(tabId) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  // Remove active styling on nav buttons
  document.querySelectorAll('.nav-tab').forEach(el => {
    el.classList.remove('active-tab', 'text-red-700', 'bg-red-50', 'border-b-2', 'border-red-600', 'font-semibold');
    el.classList.add('text-slate-600');
  });

  // Show target tab
  const target = document.getElementById(`tab-${tabId}`);
  if (target) {
    target.classList.remove('hidden');
  }

  // Activate button
  const btn = document.getElementById(`tab-btn-${tabId}`);
  if (btn) {
    btn.classList.add('active-tab', 'text-red-700', 'bg-red-50', 'border-b-2', 'border-red-600', 'font-semibold');
    btn.classList.remove('text-slate-600');
  }

  // If opening calendar, force re-render
  if (tabId === 'calendar') {
    setTimeout(() => {
      if (!calendarInstance) {
        initFullCalendar();
      } else {
        calendarInstance.render();
      }
    }, 100);
  }

  // If opening dashboard, re-render charts
  if (tabId === 'dashboard') {
    setTimeout(() => {
      renderCharts();
    }, 100);
  }
}

// ================= ROOM SHOWCASE GRID =================
function initRoomShowcase() {
  const container = document.getElementById('roomShowcaseGrid');
  if (!container) return;

  container.innerHTML = ROOMS_CONFIG.map(room => {
    const facilitiesText = room.facilities.slice(0, 2).join(' • ');
    return `
      <div class="border border-slate-200 rounded-xl p-3.5 hover:border-sky-400 hover:shadow-sm transition-all bg-white flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style="background-color: ${room.color}">
              <i class="fas ${room.icon} mr-1"></i> ${room.capacity}
            </span>
            <button onclick="quickSelectRoom('${room.name}')" class="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center">
              จองห้องนี้ <i class="fas fa-plus-circle ml-1"></i>
            </button>
          </div>
          <h4 class="font-bold text-slate-800 text-sm">${room.name}</h4>
          <p class="text-xs text-slate-500 mt-0.5 line-clamp-1">${room.description}</p>
        </div>
        <div class="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center">
          <i class="fas fa-check-circle text-emerald-500 mr-1"></i> ${facilitiesText}
        </div>
      </div>
    `;
  }).join('');
}

function quickSelectRoom(roomName) {
  switchTab('booking-form');
  const sel = document.getElementById('formRoomSelect');
  if (sel) {
    sel.value = roomName;
    onFormDateTimeChange();
  }
}

// ================= FULLCALENDAR.JS INTEGRATION =================
function initFullCalendar() {
  const calendarEl = document.getElementById('fullCalendarEl');
  if (!calendarEl) return;

  calendarInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'th',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
    },
    buttonText: {
      today: 'วันนี้',
      month: 'เดือน',
      week: 'สัปดาห์',
      day: 'วัน',
      list: 'รายการ'
    },
    views: {
      timeGridWeek: { slotMinTime: '07:00:00', slotMaxTime: '19:00:00' },
      timeGridDay: { slotMinTime: '07:00:00', slotMaxTime: '19:00:00' }
    },
    events: getCalendarEventsData(),
    eventClick: function(info) {
      const bookingId = info.event.id;
      openEventDetailModal(bookingId);
    },
    height: 'auto',
    nowIndicator: true,
    dayMaxEvents: 3
  });

  calendarInstance.render();
}

function getCalendarEventsData(roomFilter = 'ALL') {
  const bookings = storageService.getAllBookings();
  const filtered = roomFilter === 'ALL' ? bookings : bookings.filter(b => b.roomName === roomFilter);

  return filtered.map(b => {
    const roomCfg = ROOMS_CONFIG.find(r => r.name === b.roomName) || { color: '#64748b' };
    const startStr = `${b.startDate}T${b.startTime || '08:30'}:00`;
    const endStr = `${b.endDate || b.startDate}T${b.endTime || '16:30'}:00`;

    // Status prefix for calendar title
    let prefix = '⏳ ';
    if (b.status === 'APPROVED') prefix = '✅ ';
    if (b.status === 'REJECTED') prefix = '❌ ';

    return {
      id: b.id,
      title: `${prefix}[${b.roomName}] ${b.purpose}`,
      start: startStr,
      end: endStr,
      backgroundColor: roomCfg.color,
      borderColor: roomCfg.color,
      textColor: '#ffffff',
      extendedProps: {
        requester: b.requesterName,
        dept: b.requesterDept,
        status: b.overallStatusLabel
      }
    };
  });
}

function filterCalendarByRoom(roomName) {
  if (!calendarInstance) return;
  const events = getCalendarEventsData(roomName);
  calendarInstance.removeAllEvents();
  calendarInstance.addEventSource(events);
}

// ================= CHARTS (Chart.js) =================
function renderCharts() {
  const bookings = storageService.getAllBookings();

  // 1. Room Usage Stats
  const roomCounts = {};
  ROOMS_CONFIG.forEach(r => roomCounts[r.name] = 0);
  bookings.forEach(b => {
    if (roomCounts[b.roomName] !== undefined) {
      roomCounts[b.roomName]++;
    } else {
      roomCounts['อื่นๆ'] = (roomCounts['อื่นๆ'] || 0) + 1;
    }
  });

  const roomLabels = ROOMS_CONFIG.map(r => r.name);
  const roomData = ROOMS_CONFIG.map(r => roomCounts[r.name] || 0);
  const roomColors = ROOMS_CONFIG.map(r => r.color);

  const roomChartCanvas = document.getElementById('roomUsageChart');
  if (roomChartCanvas) {
    if (roomUsageChartInstance) roomUsageChartInstance.destroy();
    roomUsageChartInstance = new Chart(roomChartCanvas, {
      type: 'bar',
      data: {
        labels: roomLabels.map(name => name.length > 15 ? name.substring(0, 15) + '...' : name),
        datasets: [{
          label: 'จำนวนครั้งที่จอง (ครั้ง)',
          data: roomData,
          backgroundColor: roomColors,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0 }
          }
        }
      }
    });
  }

  // 2. Equipment Usage Stats
  let equipCounts = {
    'เครื่องฉายภาพ': 0,
    'ระบบเสียง': 0,
    'ไมโครโฟน': 0,
    'เครื่องปรับอากาศ': 0,
    'อินเทอร์เน็ต': 0,
    'โต๊ะ/เก้าอี้เสริม': 0
  };

  bookings.forEach(b => {
    const f = b.facilities || {};
    if (f.projector) equipCounts['เครื่องฉายภาพ']++;
    if (f.sound) equipCounts['ระบบเสียง']++;
    if (f.mic) equipCounts['ไมโครโฟน']++;
    if (f.air) equipCounts['เครื่องปรับอากาศ']++;
    if (f.internet) equipCounts['อินเทอร์เน็ต']++;
    if (f.furniture) equipCounts['โต๊ะ/เก้าอี้เสริม']++;
  });

  const equipChartCanvas = document.getElementById('equipmentUsageChart');
  if (equipChartCanvas) {
    if (equipmentUsageChartInstance) equipmentUsageChartInstance.destroy();
    equipmentUsageChartInstance = new Chart(equipChartCanvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(equipCounts),
        datasets: [{
          data: Object.values(equipCounts),
          backgroundColor: [
            '#0284c7', // Blue
            '#c81e1e', // Red
            '#f59e0b', // Yellow/Gold
            '#059669', // Emerald
            '#7c3aed', // Purple
            '#d97706'  // Amber
          ],
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 10 } }
          }
        }
      }
    });
  }
}

// ================= REAL-TIME CONFLICT DETECTION ENGINE =================
function onFormDateTimeChange() {
  const roomSelect = document.getElementById('formRoomSelect');
  const otherRoomContainer = document.getElementById('formOtherRoomContainer');
  let roomName = roomSelect ? roomSelect.value : '';

  if (roomName === 'อื่นๆ') {
    otherRoomContainer.classList.remove('hidden');
    const otherText = document.getElementById('formOtherRoomText');
    roomName = otherText && otherText.value ? otherText.value : 'อื่นๆ';
  } else {
    otherRoomContainer.classList.add('hidden');
  }

  const startDate = document.getElementById('formStartDate').value;
  const endDate = document.getElementById('formEndDate').value;
  const startTime = document.getElementById('formStartTime').value;
  const endTime = document.getElementById('formEndTime').value;
  const alertBox = document.getElementById('conflictAlertBox');
  const submitBtn = document.getElementById('submitBookingBtn');

  if (!roomName || !startDate || !endDate || !startTime || !endTime) {
    alertBox.classList.add('hidden');
    return;
  }

  // Check end datetime is after start datetime
  const startTs = new Date(`${startDate}T${startTime}:00`).getTime();
  const endTs = new Date(`${endDate}T${endTime}:00`).getTime();
  if (endTs <= startTs) {
    alertBox.classList.remove('hidden');
    alertBox.innerHTML = `
      <div class="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg flex items-start space-x-3">
        <i class="fas fa-exclamation-triangle text-red-600 text-lg mt-0.5"></i>
        <div class="text-xs">
          <p class="font-bold text-red-800">วันเวลาที่เลือกไม่ถูกต้อง!</p>
          <p class="text-red-700 mt-0.5">วันและเวลาสิ้นสุดต้องอยู่หลังจากวันและเวลาเริ่มต้น กรุณาตรวจสอบอีกครั้ง</p>
        </div>
      </div>
    `;
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    return;
  }

  // Run conflict query
  const conflicts = storageService.checkConflicts(roomName, startDate, endDate, startTime, endTime);

  if (conflicts.length > 0) {
    // Play warning buzz
    soundManager.playWarning();
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

    const conflictItems = conflicts.map(c => `
      <li class="mt-1 flex items-center justify-between text-xs bg-white/80 p-2 rounded border border-red-200">
        <div>
          <span class="font-bold text-red-900">${c.purpose}</span>
          <p class="text-slate-600 text-[11px]">ผู้จอง: ${c.requesterName} (${c.requesterDept})</p>
        </div>
        <span class="bg-red-100 text-red-800 font-semibold px-2 py-0.5 rounded text-[11px]">
          ${c.startDate} (${c.startTime} - ${c.endTime} น.)
        </span>
      </li>
    `).join('');

    alertBox.classList.remove('hidden');
    alertBox.innerHTML = `
      <div class="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg">
        <div class="flex items-center space-x-2 text-red-800 font-bold text-sm">
          <i class="fas fa-exclamation-circle text-red-600 animate-pulse text-lg"></i>
          <span>ตรวจพบการจองเวลาซ้ำซ้อน (Conflict Detected)!</span>
        </div>
        <p class="text-xs text-red-700 mt-1">ห้อง <strong>${roomName}</strong> มีรายการจองในช่วงเวลาดังกล่าวแล้ว ไม่สามารถจองซ้ำได้:</p>
        <ul class="mt-2 space-y-1">
          ${conflictItems}
        </ul>
        <p class="text-[11px] text-red-600 mt-2 font-medium">💡 คำแนะนำ: โปรดเลือกเวลาอื่น หรือเลือกห้องประชุมอื่น เช่น อาคารโดม หรือห้องประชุมสักทอง</p>
      </div>
    `;
  } else {
    // Available
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    alertBox.classList.remove('hidden');
    alertBox.innerHTML = `
      <div class="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-r-lg flex items-center justify-between text-xs text-emerald-800">
        <div class="flex items-center space-x-2">
          <i class="fas fa-check-circle text-emerald-600 text-base"></i>
          <span>ห้อง <strong>${roomName}</strong> ว่างพร้อมใช้งานในช่วงเวลาที่เลือก (สามารถยื่นจองได้)</span>
        </div>
        <span class="bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Available</span>
      </div>
    `;
  }
}

function setupFormAutoDefaults() {
  const todayStr = new Date().toISOString().split('T')[0];
  const startEl = document.getElementById('formStartDate');
  const endEl = document.getElementById('formEndDate');
  if (startEl && !startEl.value) startEl.value = todayStr;
  if (endEl && !endEl.value) endEl.value = todayStr;
}

function toggleMicInput(checked) {
  const container = document.getElementById('micCountContainer');
  if (container) {
    if (checked) container.classList.remove('hidden');
    else container.classList.add('hidden');
  }
}

function toggleFurnitureInput(checked) {
  const container = document.getElementById('furnitureCountContainer');
  if (container) {
    if (checked) container.classList.remove('hidden');
    else container.classList.add('hidden');
  }
}

// Auto fill demo form
function fillMockBookingForm() {
  document.getElementById('formRequesterName').value = 'นายวัชรพงศ์ โสภา';
  document.getElementById('formRequesterPosition').value = 'เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร';
  document.getElementById('formRequesterDept').value = 'งานศูนย์ดิจิทัลและสื่อสารองค์กร';
  document.getElementById('formRequesterPhone').value = '084-555-1234';
  
  const roomSelect = document.getElementById('formRoomSelect');
  roomSelect.value = 'ห้องประชุมสักทอง';

  document.getElementById('formAttendees').value = '45';
  document.getElementById('formPurpose').value = 'การประชุมซักซ้อมแนวปฏิบัติการใช้งานระบบสารสนเทศดิจิทัล สำหรับหัวหน้าแผนกวิชา';
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 3);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  document.getElementById('formStartDate').value = tomorrowStr;
  document.getElementById('formEndDate').value = tomorrowStr;
  document.getElementById('formStartTime').value = '10:00';
  document.getElementById('formEndTime').value = '12:00';

  document.getElementById('equipProjector').checked = true;
  document.getElementById('equipSound').checked = true;
  document.getElementById('equipMic').checked = true;
  toggleMicInput(true);
  document.getElementById('equipMicCount').value = '3';
  document.getElementById('equipAir').checked = true;
  document.getElementById('equipInternet').checked = true;
  document.getElementById('equipFurniture').checked = false;
  document.getElementById('equipOther').value = 'ต้องการไมค์ลอยสำรอง 1 ตัว';

  onFormDateTimeChange();
  soundManager.playChime();
}

// Handle Form Submission
function handleBookingFormSubmit(e) {
  e.preventDefault();

  let roomName = document.getElementById('formRoomSelect').value;
  if (roomName === 'อื่นๆ') {
    roomName = document.getElementById('formOtherRoomText').value || 'อื่นๆ (โปรดประสานงาน)';
  }

  const startDate = document.getElementById('formStartDate').value;
  const endDate = document.getElementById('formEndDate').value;
  const startTime = document.getElementById('formStartTime').value;
  const endTime = document.getElementById('formEndTime').value;

  // Final conflict re-check
  const conflicts = storageService.checkConflicts(roomName, startDate, endDate, startTime, endTime);
  if (conflicts.length > 0) {
    soundManager.playWarning();
    Swal.fire({
      icon: 'error',
      title: 'เวลาซ้ำซ้อน!',
      text: `ห้อง ${roomName} มีรายการจองในช่วงเวลานี้แล้ว กรุณาเลือกช่วงเวลาใหม่`,
      confirmButtonColor: '#c81e1e'
    });
    return;
  }

  const bookingData = {
    roomName,
    requesterName: document.getElementById('formRequesterName').value.trim(),
    requesterPosition: document.getElementById('formRequesterPosition').value.trim(),
    requesterDept: document.getElementById('formRequesterDept').value.trim(),
    requesterPhone: document.getElementById('formRequesterPhone').value.trim(),
    purpose: document.getElementById('formPurpose').value.trim(),
    attendees: parseInt(document.getElementById('formAttendees').value) || 1,
    startDate,
    endDate,
    startTime,
    endTime,
    facilities: {
      projector: document.getElementById('equipProjector').checked,
      sound: document.getElementById('equipSound').checked,
      mic: document.getElementById('equipMic').checked,
      micCount: parseInt(document.getElementById('equipMicCount').value) || 2,
      air: document.getElementById('equipAir').checked,
      internet: document.getElementById('equipInternet').checked,
      furniture: document.getElementById('equipFurniture').checked,
      furnitureCount: parseInt(document.getElementById('equipFurnitureCount').value) || 0,
      other: document.getElementById('equipOther').value.trim()
    }
  };

  const newBooking = storageService.addBooking(bookingData);
  soundManager.playSuccess();

  showToast(`ยื่นคำขอจอง ${newBooking.id} สำเร็จ!`, 'success');

  Swal.fire({
    icon: 'success',
    title: 'บันทึกคำขอจองสำเร็จ!',
    html: `
      <div class="text-left text-xs space-y-1.5 mt-2 bg-slate-50 p-3 rounded-lg border">
        <p><strong>เลขที่คำขอ:</strong> <span class="text-red-700 font-bold">${newBooking.id}</span></p>
        <p><strong>ห้องประชุม:</strong> ${newBooking.roomName}</p>
        <p><strong>ผู้ขอใช้:</strong> ${newBooking.requesterName}</p>
        <p><strong>วันเวลา:</strong> ${newBooking.startDate} (${newBooking.startTime} - ${newBooking.endTime} น.)</p>
        <p class="text-sky-700 font-semibold mt-1">✓ ระบบส่งเรื่องไปยังขั้นตอนที่ 2: เจ้าหน้าที่ตรวจสอบห้อง (นายวัชรพงศ์ โสภา)</p>
      </div>
    `,
    showDenyButton: true,
    confirmButtonText: '<i class="fas fa-print mr-1"></i> พิมพ์แบบฟอร์ม A4',
    denyButtonText: 'ไปที่ปฏิทิน',
    confirmButtonColor: '#c81e1e',
    denyButtonColor: '#0284c7'
  }).then((result) => {
    if (result.isConfirmed) {
      openOfficialPrintModal(newBooking.id);
    } else if (result.isDenied) {
      switchTab('calendar');
    }
  });

  // Reset form
  document.getElementById('bookingForm').reset();
  setupFormAutoDefaults();
  document.getElementById('conflictAlertBox').classList.add('hidden');

  // Refresh views
  renderAllViews();
}

// ================= MULTI-LEVEL APPROVAL WORKFLOW RENDER =================
function renderApprovalCards() {
  const container = document.getElementById('approvalCardsList');
  if (!container) return;

  const bookings = storageService.getAllBookings();
  let filtered = bookings;

  if (currentApprovalFilter === 'PENDING') {
    filtered = bookings.filter(b => b.status.startsWith('PENDING'));
  } else if (currentApprovalFilter === 'APPROVED') {
    filtered = bookings.filter(b => b.status === 'APPROVED');
  } else if (currentApprovalFilter === 'REJECTED') {
    filtered = bookings.filter(b => b.status === 'REJECTED');
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
        <i class="fas fa-inbox text-4xl mb-2 text-slate-300"></i>
        <p class="font-medium text-slate-500">ไม่พบรายการคำขอในหมวดนี้</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(b => {
    const w = b.workflow || {};
    const roomCfg = ROOMS_CONFIG.find(r => r.name === b.roomName) || { color: '#64748b', icon: 'fa-door-open' };

    // Step 2, 3, 4 badges
    const getStepBadge = (stepObj, stepNum) => {
      if (!stepObj) return `<span class="text-slate-400">-</span>`;
      if (stepObj.status === 'APPROVED' || stepObj.status === 'COMPLETED') {
        return `<span class="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center"><i class="fas fa-check-circle mr-1"></i> ผ่าน</span>`;
      }
      if (stepObj.status === 'REJECTED') {
        return `<span class="bg-red-100 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center"><i class="fas fa-times-circle mr-1"></i> ไม่ผ่าน</span>`;
      }
      if (stepObj.status === 'PENDING') {
        return `<span class="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center animate-pulse"><i class="fas fa-clock mr-1"></i> รอพิจารณา</span>`;
      }
      return `<span class="bg-slate-100 text-slate-500 text-[11px] font-medium px-2 py-0.5 rounded-full">รอลำดับก่อนหน้า</span>`;
    };

    // Action button depends on who needs to approve next
    let actionBtn = '';
    if (b.status === 'PENDING_STEP2') {
      actionBtn = `
        <button onclick="openApprovalActionModal('${b.id}', 2)" class="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center">
          <i class="fas fa-user-check mr-1.5"></i> ตรวจสอบห้อง (ขั้นที่ 2)
        </button>
      `;
    } else if (b.status === 'PENDING_STEP3') {
      actionBtn = `
        <button onclick="openApprovalActionModal('${b.id}', 3)" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center">
          <i class="fas fa-signature mr-1.5"></i> ลงนามรับรอง (ขั้นที่ 3)
        </button>
      `;
    } else if (b.status === 'PENDING_STEP4') {
      actionBtn = `
        <button onclick="openApprovalActionModal('${b.id}', 4)" class="bg-red-700 hover:bg-red-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center">
          <i class="fas fa-stamp mr-1.5"></i> พิจารณาอนุมัติ (ขั้นที่ 4)
        </button>
      `;
    } else {
      actionBtn = `
        <span class="text-xs text-slate-400 font-medium">กระบวนการเสร็จสิ้น</span>
      `;
    }

    return `
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:border-slate-300 transition-all">
        <!-- Card Top Bar -->
        <div class="p-4 sm:p-5 flex flex-wrap justify-between items-start gap-3 border-b border-slate-100 bg-slate-50/60">
          <div class="flex items-center space-x-3">
            <span class="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-sm" style="background-color: ${roomCfg.color}">
              <i class="fas ${roomCfg.icon}"></i>
            </span>
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-xs font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">${b.id}</span>
                <h4 class="font-bold text-slate-800 text-sm sm:text-base">${b.roomName}</h4>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">ผู้ขอ: <strong class="text-slate-700">${b.requesterName}</strong> (${b.requesterDept})</p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button onclick="openOfficialPrintModal('${b.id}')" class="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center" title="พิมพ์แบบฟอร์ม A4">
              <i class="fas fa-print mr-1 text-red-600"></i> พิมพ์ A4
            </button>
            <button onclick="openEventDetailModal('${b.id}')" class="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center" title="ดูรายละเอียด">
              <i class="fas fa-eye mr-1 text-sky-600"></i> รายละเอียด
            </button>
            ${actionBtn}
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-4 sm:p-5 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span class="text-slate-400 font-medium">วันและเวลาที่ขอใช้:</span>
              <p class="font-bold text-slate-800 mt-0.5"><i class="far fa-calendar-alt text-sky-600 mr-1"></i> ${b.startDate} (${b.startTime} - ${b.endTime} น.)</p>
            </div>
            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span class="text-slate-400 font-medium">จำนวนผู้เข้าใช้:</span>
              <p class="font-bold text-slate-800 mt-0.5"><i class="fas fa-users text-amber-500 mr-1"></i> ${b.attendees} คน</p>
            </div>
            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span class="text-slate-400 font-medium">สถานะคำขอปัจจุบัน:</span>
              <p class="font-bold text-slate-800 mt-0.5"><i class="fas fa-shield-alt text-emerald-600 mr-1"></i> ${b.overallStatusLabel}</p>
            </div>
          </div>

          <div>
            <span class="text-xs text-slate-400 font-medium">วัตถุประสงค์:</span>
            <p class="text-xs text-slate-700 mt-0.5 bg-amber-50/50 p-2 rounded border border-amber-100">${b.purpose}</p>
          </div>

          <!-- 4-Steps Visual Stepper -->
          <div class="pt-2 border-t border-slate-100">
            <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">ความคืบหน้าการพิจารณา 4 ลำดับขั้น:</p>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              
              <!-- Step 1 -->
              <div class="p-2 rounded-lg border ${w.step1 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'}">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-slate-700 text-[11px]">1. ยื่นคำขอ</span>
                  <span class="text-emerald-600 text-xs"><i class="fas fa-check"></i></span>
                </div>
                <p class="text-[11px] text-slate-600 truncate">${b.requesterName}</p>
              </div>

              <!-- Step 2 -->
              <div class="p-2 rounded-lg border ${w.step2 && w.step2.status === 'APPROVED' ? 'bg-emerald-50/50 border-emerald-200' : (w.step2 && w.step2.status === 'PENDING' ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200')}">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-slate-700 text-[11px]">2. เจ้าหน้าที่ตรวจ</span>
                  ${getStepBadge(w.step2, 2)}
                </div>
                <p class="text-[11px] text-slate-600 truncate">นายวัชรพงศ์ โสภา</p>
                ${w.step2 && w.step2.comment ? `<p class="text-[10px] text-slate-400 truncate mt-0.5">"${w.step2.comment}"</p>` : ''}
              </div>

              <!-- Step 3 -->
              <div class="p-2 rounded-lg border ${w.step3 && w.step3.status === 'APPROVED' ? 'bg-emerald-50/50 border-emerald-200' : (w.step3 && w.step3.status === 'PENDING' ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200')}">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-slate-700 text-[11px]">3. หัวหน้างานรับรอง</span>
                  ${getStepBadge(w.step3, 3)}
                </div>
                <p class="text-[11px] text-slate-600 truncate">นายเอกราช เขียวทอง</p>
                ${w.step3 && w.step3.comment ? `<p class="text-[10px] text-slate-400 truncate mt-0.5">"${w.step3.comment}"</p>` : ''}
              </div>

              <!-- Step 4 -->
              <div class="p-2 rounded-lg border ${w.step4 && w.step4.status === 'APPROVED' ? 'bg-emerald-50/50 border-emerald-200' : (w.step4 && w.step4.status === 'PENDING' ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200')}">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-slate-700 text-[11px]">4. รอง ผอ. อนุมัติ</span>
                  ${getStepBadge(w.step4, 4)}
                </div>
                <p class="text-[11px] text-slate-600 truncate font-medium">นายชาตรี เริงชัยภูมิ</p>
                ${w.step4 && w.step4.comment ? `<p class="text-[10px] text-slate-400 truncate mt-0.5">"${w.step4.comment}"</p>` : ''}
              </div>

            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterApprovalView(status) {
  currentApprovalFilter = status;
  document.querySelectorAll('.approval-filter-btn').forEach(btn => {
    btn.className = 'approval-filter-btn px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200';
  });
  const activeBtn = document.getElementById(`filterAppBtn-${status}`);
  if (activeBtn) {
    activeBtn.className = 'approval-filter-btn px-3 py-1 rounded-lg text-xs font-medium bg-red-600 text-white';
  }
  renderApprovalCards();
}

// ================= APPROVAL ACTION MODAL (SIGNATURE & CONFIRM) =================
function openApprovalActionModal(bookingId, stepNumber) {
  const booking = storageService.getBookingById(bookingId);
  if (!booking) return;

  document.getElementById('approvalBookingId').value = bookingId;
  document.getElementById('approvalStepNumber').value = stepNumber;
  document.getElementById('approvalTargetDetails').textContent = `${booking.id} - ${booking.roomName} (ผู้ขอ: ${booking.requesterName})`;
  document.getElementById('approvalComment').value = '';

  const officialDisplay = document.getElementById('approvalOfficialDisplay');
  const titleEl = document.getElementById('approvalModalTitle');
  const approveLabel = document.getElementById('approvalRadioApproveLabel');
  const rejectLabel = document.getElementById('approvalRadioRejectLabel');

  let officialInfo = APPROVAL_OFFICIALS[`STEP_${stepNumber}`];
  if (officialInfo) {
    titleEl.textContent = `บันทึกผลการพิจารณา - ขั้นที่ ${stepNumber}: ${officialInfo.roleTitle}`;
    officialDisplay.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <p class="font-bold text-slate-800">${officialInfo.name}</p>
          <p class="text-[11px] text-slate-500">${officialInfo.position}</p>
        </div>
        <span class="bg-sky-200 text-sky-900 font-bold px-2 py-0.5 rounded text-[10px]">ขั้นตอนที่ ${stepNumber} / 4</span>
      </div>
    `;
    approveLabel.textContent = `✓ ${officialInfo.actionApprovedLabel}`;
    rejectLabel.textContent = `✕ ${officialInfo.actionRejectedLabel}`;
  }

  clearSignaturePad();
  openModal('approvalActionModal');
}

function handleApprovalActionSubmit(e) {
  e.preventDefault();
  const bookingId = document.getElementById('approvalBookingId').value;
  const stepNumber = parseInt(document.getElementById('approvalStepNumber').value);
  const decisionRadio = document.querySelector('input[name="approvalDecision"]:checked');
  const decision = decisionRadio ? decisionRadio.value : 'APPROVED';
  const comment = document.getElementById('approvalComment').value.trim();

  // Get signature data URL or fallback name
  let signatureData = null;
  if (isCanvasDrawn(sigCanvas)) {
    signatureData = sigCanvas.toDataURL();
  } else {
    const officialInfo = APPROVAL_OFFICIALS[`STEP_${stepNumber}`];
    signatureData = officialInfo ? officialInfo.name : 'ลงนามแล้ว';
  }

  const updated = storageService.updateApprovalStep(bookingId, stepNumber, decision, comment, signatureData);
  if (updated) {
    soundManager.playSuccess();
    closeModal('approvalActionModal');
    showToast(`บันทึกผลการพิจารณาคำขอ ${updated.id} สำเร็จ!`, 'success');
    renderAllViews();
  }
}

// Canvas Drawing Helper
function initSignaturePad() {
  sigCanvas = document.getElementById('signaturePadCanvas');
  if (!sigCanvas) return;
  sigCtx = sigCanvas.getContext('2d');
  sigCtx.lineWidth = 2.5;
  sigCtx.lineCap = 'round';
  sigCtx.strokeStyle = '#0f172a'; // dark navy / black ink

  const getPos = (e) => {
    const rect = sigCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (sigCanvas.width / rect.width),
      y: (clientY - rect.top) * (sigCanvas.height / rect.height)
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawingSignature = true;
    const pos = getPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawingSignature) return;
    e.preventDefault();
    const pos = getPos(e);
    sigCtx.lineTo(pos.x, pos.y);
    sigCtx.stroke();
  };

  const stopDraw = () => {
    isDrawingSignature = false;
  };

  sigCanvas.addEventListener('mousedown', startDraw);
  sigCanvas.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', stopDraw);

  sigCanvas.addEventListener('touchstart', startDraw, { passive: false });
  sigCanvas.addEventListener('touchmove', draw, { passive: false });
  sigCanvas.addEventListener('touchend', stopDraw);
}

function clearSignaturePad() {
  if (sigCanvas && sigCtx) {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  }
}

function isCanvasDrawn(canvas) {
  if (!canvas) return false;
  const blank = document.createElement('canvas');
  blank.width = canvas.width;
  blank.height = canvas.height;
  return canvas.toDataURL() !== blank.toDataURL();
}

// ================= MODAL: EVENT DETAILS =================
function openEventDetailModal(bookingId) {
  const booking = storageService.getBookingById(bookingId);
  if (!booking) return;

  const roomCfg = ROOMS_CONFIG.find(r => r.name === booking.roomName) || { color: '#64748b' };
  
  document.getElementById('modalEventTitle').textContent = booking.purpose;
  document.getElementById('modalBookingId').textContent = `เลขที่คำขอ: ${booking.id}`;
  document.getElementById('modalRoomBadge').textContent = booking.roomName;
  document.getElementById('modalRoomBadge').style.backgroundColor = roomCfg.color;

  document.getElementById('modalRequester').textContent = booking.requesterName;
  document.getElementById('modalDeptPos').textContent = `${booking.requesterPosition} • ${booking.requesterDept}`;
  document.getElementById('modalPhone').innerHTML = `<i class="fas fa-phone mr-1"></i> โทร. ${booking.requesterPhone}`;

  document.getElementById('modalDate').textContent = booking.startDate === booking.endDate ? booking.startDate : `${booking.startDate} ถึง ${booking.endDate}`;
  document.getElementById('modalTime').textContent = `${booking.startTime} - ${booking.endTime} น.`;
  document.getElementById('modalAttendees').textContent = `${booking.attendees} คน`;

  // Status Badge
  let badgeColor = 'bg-amber-100 text-amber-800';
  if (booking.status === 'APPROVED') badgeColor = 'bg-emerald-100 text-emerald-800';
  if (booking.status === 'REJECTED') badgeColor = 'bg-red-100 text-red-800';
  document.getElementById('modalStatusBadge').innerHTML = `<span class="${badgeColor} px-2 py-0.5 rounded text-xs font-bold">${booking.overallStatusLabel}</span>`;

  document.getElementById('modalPurpose').textContent = booking.purpose;

  // Facilities
  const f = booking.facilities || {};
  const facList = [];
  if (f.projector) facList.push('<span class="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">เครื่องฉายภาพ</span>');
  if (f.sound) facList.push('<span class="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">ระบบเสียง</span>');
  if (f.mic) facList.push(`<span class="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">ไมค์ ${f.micCount || 2} ตัว</span>`);
  if (f.air) facList.push('<span class="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">เครื่องปรับอากาศ</span>');
  if (f.internet) facList.push('<span class="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">อินเทอร์เน็ต Wi-Fi</span>');
  if (f.furniture) facList.push(`<span class="bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">โต๊ะเก้าอี้ ${f.furnitureCount || 0} ตัว</span>`);
  if (f.other) facList.push(`<span class="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">${f.other}</span>`);
  document.getElementById('modalFacilitiesList').innerHTML = facList.length ? facList.join(' ') : '<span class="text-slate-400">ไม่มี</span>';

  // Timeline
  const w = booking.workflow || {};
  const timelineHTML = `
    <div class="text-xs space-y-2">
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-700">1. ผู้ขอใช้ยื่นคำขอ:</span>
        <span class="text-emerald-600 font-semibold">สำเร็จ (${w.step1 ? w.step1.officialName : booking.requesterName})</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-700">2. นายวัชรพงศ์ โสภา (ตรวจห้อง):</span>
        <span>${w.step2 ? (w.step2.status === 'APPROVED' ? '<span class="text-emerald-600 font-semibold">พร้อมใช้งาน</span>' : (w.step2.status === 'PENDING' ? '<span class="text-amber-600 font-semibold">รอตรวจ</span>' : '<span class="text-red-600 font-semibold">ไม่พร้อม</span>')) : '-'}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-700">3. นายเอกราช เขียวทอง (รับรอง):</span>
        <span>${w.step3 ? (w.step3.status === 'APPROVED' ? '<span class="text-emerald-600 font-semibold">รับรองแล้ว</span>' : (w.step3.status === 'PENDING' ? '<span class="text-amber-600 font-semibold">รอรับรอง</span>' : '-')) : '-'}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-700">4. นายชาตรี เริงชัยภูมิ (อนุมัติ):</span>
        <span>${w.step4 ? (w.step4.status === 'APPROVED' ? '<span class="text-emerald-600 font-bold">อนุมัติเรียบร้อย</span>' : (w.step4.status === 'PENDING' ? '<span class="text-amber-600 font-semibold">รออนุมัติ</span>' : '<span class="text-red-600 font-semibold">ไม่อนุมัติ</span>')) : '-'}</span>
      </div>
    </div>
  `;
  document.getElementById('modalApprovalTimeline').innerHTML = timelineHTML;

  // Print button
  document.getElementById('modalPrintA4Btn').onclick = () => {
    closeModal('eventDetailModal');
    openOfficialPrintModal(booking.id);
  };

  openModal('eventDetailModal');
}

// ================= MODAL: OFFICIAL A4 PRINT =================
function openOfficialPrintModal(bookingId) {
  const booking = storageService.getBookingById(bookingId);
  if (!booking) return;

  const html = exportService.generateOfficialA4HTML(booking);
  document.getElementById('printableA4Document').innerHTML = html;
  openModal('officialPrintModal');
}

// ================= DASHBOARD TABLE & METRICS =================
function renderDashboardMetrics() {
  const bookings = storageService.getAllBookings();
  const todayStr = new Date().toISOString().split('T')[0];

  const todayCount = bookings.filter(b => b.startDate === todayStr && b.status === 'APPROVED').length;
  const pendingCount = bookings.filter(b => b.status.startsWith('PENDING')).length;
  const approvedCount = bookings.filter(b => b.status === 'APPROVED').length;
  const totalCount = bookings.length;

  document.getElementById('statTodayCount').textContent = todayCount;
  document.getElementById('statPendingCount').textContent = pendingCount;
  document.getElementById('statApprovedCount').textContent = approvedCount;
  document.getElementById('statTotalCount').textContent = totalCount;

  // Pending badge in header
  const headerBadge = document.getElementById('pendingBadgeHeader');
  if (headerBadge) {
    headerBadge.textContent = pendingCount;
    if (pendingCount > 0) headerBadge.classList.remove('hidden');
    else headerBadge.classList.add('hidden');
  }
}

function renderDashboardTable(filterQuery = '') {
  const tbody = document.getElementById('dashboardBookingsTbody');
  if (!tbody) return;

  let bookings = storageService.getAllBookings();

  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    bookings = bookings.filter(b => 
      b.id.toLowerCase().includes(q) ||
      b.roomName.toLowerCase().includes(q) ||
      b.requesterName.toLowerCase().includes(q) ||
      b.purpose.toLowerCase().includes(q)
    );
  }

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">ไม่พบข้อมูลการจอง</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.slice(0, 10).map((b, idx) => {
    let badgeClass = 'bg-amber-100 text-amber-800';
    if (b.status === 'APPROVED') badgeClass = 'bg-emerald-100 text-emerald-800';
    if (b.status === 'REJECTED') badgeClass = 'bg-red-100 text-red-800';

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-mono font-bold text-red-700">${b.id}</td>
        <td class="py-3 px-4 font-semibold text-slate-800">${b.roomName}</td>
        <td class="py-3 px-4">
          <p class="font-medium text-slate-800">${b.requesterName}</p>
          <p class="text-[11px] text-slate-400">${b.requesterDept}</p>
        </td>
        <td class="py-3 px-4">
          <p class="font-medium">${b.startDate}</p>
          <p class="text-[11px] text-slate-500">${b.startTime} - ${b.endTime} น.</p>
        </td>
        <td class="py-3 px-4 max-w-xs truncate" title="${b.purpose}">${b.purpose}</td>
        <td class="py-3 px-4 text-center">
          <span class="${badgeClass} px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap">${b.overallStatusLabel}</span>
        </td>
        <td class="py-3 px-4 text-center whitespace-nowrap">
          <button onclick="openEventDetailModal('${b.id}')" class="text-sky-600 hover:text-sky-800 p-1 mx-0.5" title="ดูรายละเอียด"><i class="fas fa-eye"></i></button>
          <button onclick="openOfficialPrintModal('${b.id}')" class="text-red-600 hover:text-red-800 p-1 mx-0.5" title="พิมพ์ A4"><i class="fas fa-print"></i></button>
          <button onclick="confirmDeleteBooking('${b.id}')" class="text-slate-400 hover:text-red-600 p-1 mx-0.5" title="ลบรายการ"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterDashboardTable() {
  const q = document.getElementById('dashboardSearchInput').value;
  renderDashboardTable(q);
}

// ================= OFFICIAL REPORTS TAB TABLE =================
function renderOfficialReportsTable() {
  const tbody = document.getElementById('officialReportsTbody');
  if (!tbody) return;

  const bookings = storageService.getAllBookings();
  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400">ไม่มีข้อมูล</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    let badgeClass = 'bg-amber-100 text-amber-800';
    if (b.status === 'APPROVED') badgeClass = 'bg-emerald-100 text-emerald-800';
    if (b.status === 'REJECTED') badgeClass = 'bg-red-100 text-red-800';

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-mono font-bold text-red-700">${b.id}</td>
        <td class="py-3 px-4 font-semibold text-slate-800">${b.roomName}</td>
        <td class="py-3 px-4">${b.requesterName} (${b.requesterDept})</td>
        <td class="py-3 px-4">${b.startDate} (${b.startTime} - ${b.endTime} น.)</td>
        <td class="py-3 px-4"><span class="${badgeClass} px-2 py-0.5 rounded text-[11px] font-bold">${b.overallStatusLabel}</span></td>
        <td class="py-3 px-4 text-center">
          <button onclick="openOfficialPrintModal('${b.id}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold shadow-sm transition-all flex items-center mx-auto">
            <i class="fas fa-print mr-1"></i> พิมพ์แบบคำขอ (A4)
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ================= OPEN SETTINGS VIEW =================
function openSettingsView() {
  switchTab('settings');
  initSettingsValues();
}

// ================= SETTINGS & GOOGLE SHEETS / WEBHOOK =================
function initSettingsValues() {
  const gInput = document.getElementById('googleWebAppUrlInput');
  const gOnlineInput = document.getElementById('googleSheetOnlineUrlInput');
  const wProvider = document.getElementById('webhookProviderSelect');
  const wInput = document.getElementById('webhookUrlInput');

  if (gInput) gInput.value = storageService.settings.googleWebAppUrl || '';
  if (gOnlineInput) gOnlineInput.value = storageService.settings.googleSheetOnlineUrl || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing';
  if (wProvider) wProvider.value = storageService.settings.webhookProvider || 'discord';
  if (wInput) wInput.value = storageService.settings.webhookUrl || '';

  // Setup Code.gs in Apps Script modal pre tag
  const pre = document.getElementById('appsScriptCodePre');
  if (pre) {
    pre.textContent = getAppsScriptCode();
  }
}

function saveGoogleSheetsConfig() {
  const webAppVal = document.getElementById('googleWebAppUrlInput').value.trim();
  const onlineVal = document.getElementById('googleSheetOnlineUrlInput') ? document.getElementById('googleSheetOnlineUrlInput').value.trim() : '';
  storageService.saveSettings({
    googleWebAppUrl: webAppVal,
    googleSheetOnlineUrl: onlineVal || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing'
  });
  soundManager.playSuccess();
  Swal.fire({
    icon: 'success',
    title: 'บันทึกสำเร็จ',
    text: 'บันทึกการตั้งค่า Google Sheets เรียบร้อยแล้ว',
    confirmButtonColor: '#059669'
  });
}

async function testGoogleSheetsSync() {
  try {
    Swal.fire({
      title: 'กำลังซิงค์ข้อมูล...',
      text: 'กำลังเชื่อมต่อไปยัง Google Sheets Web App',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const data = await storageService.fetchFromGoogleSheets();
    soundManager.playSuccess();
    Swal.fire({
      icon: 'success',
      title: 'ซิงค์สำเร็จ!',
      text: `ดึงข้อมูลจาก Google Sheets สำเร็จ (${data.length} รายการ)`,
      confirmButtonColor: '#059669'
    });
    renderAllViews();
  } catch (err) {
    soundManager.playWarning();
    Swal.fire({
      icon: 'error',
      title: 'ซิงค์ไม่สำเร็จ',
      text: err.message,
      confirmButtonColor: '#c81e1e'
    });
  }
}

function saveWebhookConfig() {
  const provider = document.getElementById('webhookProviderSelect').value;
  const url = document.getElementById('webhookUrlInput').value.trim();
  storageService.saveSettings({ webhookProvider: provider, webhookUrl: url });
  soundManager.playSuccess();
  Swal.fire({
    icon: 'success',
    title: 'บันทึกสำเร็จ',
    text: 'บันทึกการตั้งค่า Webhook เรียบร้อยแล้ว',
    confirmButtonColor: '#0284c7'
  });
}

async function testWebhookTrigger() {
  const url = document.getElementById('webhookUrlInput').value.trim();
  if (!url) {
    Swal.fire({ icon: 'warning', title: 'กรุณาระบุ Webhook URL ก่อนทดสอบ', confirmButtonColor: '#f59e0b' });
    return;
  }
  storageService.saveSettings({ webhookUrl: url });

  const sampleBooking = storageService.getAllBookings()[0] || {
    id: 'TEST-WEBHOOK',
    roomName: 'หอประชุมอดิเรกสาร',
    requesterName: 'นายทดสอบ ระบบ',
    requesterDept: 'งานศูนย์ดิจิทัลและสื่อสารองค์กร',
    purpose: 'ทดสอบการส่งการแจ้งเตือน Real-time Webhook',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '12:00',
    attendees: 50,
    status: 'APPROVED',
    overallStatusLabel: 'ทดสอบส่งข้อความแจ้งเตือนสำเร็จ'
  };

  soundManager.playChime();
  await storageService.triggerWebhookNotification(sampleBooking, 'TEST_TRIGGER');
  
  Swal.fire({
    icon: 'success',
    title: 'ส่งสัญญาณทดสอบแล้ว!',
    text: 'หาก Webhook URL ถูกต้อง ข้อความจะปรากฏในช่องแชทของคุณทันที',
    confirmButtonColor: '#0284c7'
  });
}

function resetToSampleData() {
  Swal.fire({
    title: 'ยืนยันโหลดข้อมูลตัวอย่าง?',
    text: 'ข้อมูลปัจจุบันจะถูกแทนที่ด้วยข้อมูลจำลองของวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ยืนยันโหลดข้อมูล',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#c81e1e'
  }).then((res) => {
    if (res.isConfirmed) {
      storageService.loadSampleData();
      renderAllViews();
      soundManager.playSuccess();
      showToast('โหลดข้อมูลตัวอย่างสำเร็จ!', 'success');
    }
  });
}

function clearAllData() {
  Swal.fire({
    title: 'ยืนยันล้างข้อมูลทั้งหมด?',
    text: 'รายการจองทั้งหมดจะถูกลบออกจากระบบอย่างถาวร',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ลบทั้งหมด',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#c81e1e'
  }).then((res) => {
    if (res.isConfirmed) {
      storageService.bookings = [];
      storageService.saveBookings();
      renderAllViews();
      soundManager.playWarning();
      showToast('ล้างข้อมูลการจองทั้งหมดแล้ว', 'info');
    }
  });
}

function confirmDeleteBooking(id) {
  Swal.fire({
    title: 'ยืนยันการลบคำขอจอง?',
    text: `รหัสคำขอ ${id} จะถูกลบออกจากระบบ`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ลบรายการนี้',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#c81e1e'
  }).then((res) => {
    if (res.isConfirmed) {
      storageService.deleteBooking(id);
      renderAllViews();
      soundManager.playWarning();
      showToast(`ลบคำขอ ${id} แล้ว`, 'info');
    }
  });
}

// ================= MODAL HELPERS =================
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

// ================= GOOGLE SHEETS LIVE VIEWER =================
function openGoogleSheetsViewer() {
  renderGoogleSheetsLiveGrid();
  openModal('googleSheetsViewModal');
  soundManager.playChime();
}

function refreshGoogleSheetsLiveView() {
  renderGoogleSheetsLiveGrid();
  soundManager.playSuccess();
  showToast('รีเฟรชตาราง Google Sheets แล้ว', 'success');
}

function renderGoogleSheetsLiveGrid(filter = '') {
  const table = document.getElementById('sheetGridTable');
  const summaryEl = document.getElementById('sheetGridSummaryText');
  const formulaEl = document.getElementById('sheetFormulaDisplay');
  if (!table) return;

  let bookings = storageService.getAllBookings();

  if (filter) {
    const q = filter.toLowerCase();
    bookings = bookings.filter(b => 
      b.id.toLowerCase().includes(q) ||
      b.roomName.toLowerCase().includes(q) ||
      b.requesterName.toLowerCase().includes(q) ||
      b.purpose.toLowerCase().includes(q) ||
      (b.overallStatusLabel && b.overallStatusLabel.toLowerCase().includes(q))
    );
  }

  const columns = [
    { letter: 'A', name: 'เลขที่คำขอ (ID)', width: 'w-28' },
    { letter: 'B', name: 'ห้องประชุม', width: 'w-44' },
    { letter: 'C', name: 'ผู้ขอใช้', width: 'w-40' },
    { letter: 'D', name: 'ตำแหน่ง', width: 'w-36' },
    { letter: 'E', name: 'หน่วยงาน/สาขาวิชา', width: 'w-44' },
    { letter: 'F', name: 'เบอร์โทร', width: 'w-28' },
    { letter: 'G', name: 'วันที่เริ่ม', width: 'w-28' },
    { letter: 'H', name: 'วันที่สิ้นสุด', width: 'w-28' },
    { letter: 'I', name: 'เวลา', width: 'w-28' },
    { letter: 'J', name: 'คน', width: 'w-16' },
    { letter: 'K', name: 'วัตถุประสงค์', width: 'w-64' },
    { letter: 'L', name: 'สถานะรวม', width: 'w-36' },
    { letter: 'M', name: 'จนท.ตรวจ (2)', width: 'w-28' },
    { letter: 'N', name: 'หน.งาน (3)', width: 'w-28' },
    { letter: 'O', name: 'รอง ผอ. (4)', width: 'w-28' },
    { letter: 'P', name: 'วันที่ยื่นคำขอ', width: 'w-32' }
  ];

  // Build header row with row numbers column
  let headerHtml = `
    <thead>
      <tr class="bg-slate-200 text-slate-700 text-center font-bold border-b border-slate-300">
        <th class="py-1 px-2 border-r border-slate-300 w-10 bg-slate-300 text-slate-500 font-mono text-[10px]">#</th>
        ${columns.map(c => `
          <th class="py-1.5 px-3 border-r border-slate-300 text-left font-semibold text-slate-700 whitespace-nowrap bg-emerald-100/60 text-emerald-900 ${c.width}">
            <span class="text-emerald-700 font-bold mr-1">${c.letter}</span> ${c.name}
          </th>
        `).join('')}
      </tr>
    </thead>
  `;

  // Build rows
  let rowsHtml = '<tbody>';
  if (bookings.length === 0) {
    rowsHtml += `<tr><td colspan="17" class="py-10 text-center text-slate-400 font-sans">ไม่พบแถวข้อมูลในชีต</td></tr>`;
  } else {
    bookings.forEach((b, idx) => {
      const rowNum = idx + 2; // Row 1 is header
      const w = b.workflow || {};
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? 'bg-white' : 'bg-slate-50/70';

      let statusBadge = '<span class="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">รอพิจารณา</span>';
      if (b.status === 'APPROVED') statusBadge = '<span class="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">อนุมัติแล้ว</span>';
      if (b.status === 'REJECTED') statusBadge = '<span class="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[10px] font-bold">ไม่อนุมัติ</span>';

      rowsHtml += `
        <tr class="${rowBg} hover:bg-emerald-50/40 border-b border-slate-200 transition-colors">
          <td class="py-1 px-1.5 text-center bg-slate-100 border-r border-slate-300 text-slate-400 font-mono text-[10px]">${rowNum}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 font-bold text-red-700 whitespace-nowrap">${b.id}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-800 whitespace-nowrap">${b.roomName}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 whitespace-nowrap">${b.requesterName}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 text-slate-600 whitespace-nowrap">${b.requesterPosition || '-'}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 text-slate-600 whitespace-nowrap">${b.requesterDept || '-'}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 text-slate-600 whitespace-nowrap">${b.requesterPhone || '-'}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 whitespace-nowrap">${b.startDate}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 whitespace-nowrap">${b.endDate || b.startDate}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 whitespace-nowrap">${b.startTime} - ${b.endTime}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 text-center font-bold">${b.attendees}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 max-w-xs truncate" title="${b.purpose}">${b.purpose}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 text-center whitespace-nowrap">${statusBadge}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 text-center whitespace-nowrap text-[10px]">${w.step2 ? w.step2.status : '-'}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 text-center whitespace-nowrap text-[10px]">${w.step3 ? w.step3.status : '-'}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 text-center whitespace-nowrap text-[10px]">${w.step4 ? w.step4.status : '-'}</td>
          <td class="py-1.5 px-3 border-r border-slate-200 text-slate-500 whitespace-nowrap text-[10px]">${b.createdAt ? b.createdAt.split('T')[0] : '-'}</td>
        </tr>
      `;
    });
  }
  rowsHtml += '</tbody>';

  table.innerHTML = headerHtml + rowsHtml;

  const total = bookings.length;
  const approved = bookings.filter(b => b.status === 'APPROVED').length;
  const pending = bookings.filter(b => b.status.startsWith('PENDING')).length;

  if (summaryEl) {
    summaryEl.innerHTML = `รวมข้อมูล <strong>${total}</strong> แถว (อนุมัติแล้ว: <span class="text-emerald-700 font-bold">${approved}</span>, รอพิจารณา: <span class="text-amber-700 font-bold">${pending}</span>)`;
  }
  if (formulaEl) {
    formulaEl.textContent = `=COUNTA(A2:A${total + 1}) & " รายการจองห้องประชุมทั้งหมด"`;
  }
}

function filterSheetGridView(val) {
  renderGoogleSheetsLiveGrid(val);
}

function openGoogleSheetOnlineDirect() {
  const url = storageService.settings.googleSheetOnlineUrl || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing';
  window.open(url, '_blank');
}

function openGoogleSheetTemplateCopy() {
  const copyUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/copy';
  window.open(copyUrl, '_blank');
}

function openAppsScriptModal() {
  openModal('appsScriptModal');
}

function copyAppsScriptCode() {
  const code = getAppsScriptCode();
  navigator.clipboard.writeText(code).then(() => {
    soundManager.playSuccess();
    Swal.fire({ icon: 'success', title: 'คัดลอกโค้ดแล้ว!', text: 'สามารถนำไปวางใน Google Apps Script Editor ได้ทันที', timer: 1500, showConfirmButton: false });
  });
}

// ================= TOAST NOTIFICATION =================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-red-600' : 'bg-slate-800');
  toast.className = `${bg} text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold flex items-center space-x-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto`;
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-bell'}"></i> <span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ================= RE-RENDER ALL VIEWS =================
function renderAllViews() {
  renderDashboardMetrics();
  renderDashboardTable();
  renderApprovalCards();
  renderOfficialReportsTable();
  renderCharts();
  if (calendarInstance) {
    calendarInstance.removeAllEvents();
    calendarInstance.addEventSource(getCalendarEventsData());
  }
}

// Return Google Apps Script Code String
function getAppsScriptCode() {
  return `/**
 * Google Apps Script Backend for Smart Meeting Room Booking System
 * วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 */

function doGet(e) {
  var sheet = getOrCreateSheet();
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var bookings = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0]) continue;
    try {
      var rawJson = row[1];
      if (rawJson) {
        bookings.push(JSON.parse(rawJson));
      }
    } catch(err) {}
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', bookings: bookings }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = getOrCreateSheet();
  var params = e.parameter;
  var action = params.action;

  if (action === 'SYNC_ALL') {
    var rawData = params.data;
    var bookings = JSON.parse(rawData);

    sheet.clearContents();
    sheet.appendRow(['BookingID', 'JSON_DATA', 'RoomName', 'Requester', 'Date', 'Status', 'UpdatedAt']);

    for (var i = 0; i < bookings.length; i++) {
      var b = bookings[i];
      sheet.appendRow([b.id, JSON.stringify(b), b.roomName, b.requesterName, b.startDate, b.overallStatusLabel || b.status, new Date()]);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Synced ' + bookings.length + ' bookings' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Bookings');
  if (!sheet) {
    sheet = ss.insertSheet('Bookings');
    sheet.appendRow(['BookingID', 'JSON_DATA', 'RoomName', 'Requester', 'Date', 'Status', 'UpdatedAt']);
  }
  return sheet;
}`;
}
