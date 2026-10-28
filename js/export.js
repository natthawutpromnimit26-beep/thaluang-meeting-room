/**
 * Export & Official A4 Report Generator
 * วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 * รองรับการพิมพ์เอกสารราชการ A4 และการส่งออก CSV (UTF-8 BOM) / Excel
 */

class ExportService {
  constructor() {}

  /**
   * สร้าง HTML แบบฟอร์มขอใช้ห้องประชุมราชการขนาด A4
   * @param {Object} booking 
   */
  generateOfficialA4HTML(booking) {
    if (!booking) return '';

    const formatThaiDate = (dateStr) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const thMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      return `${d.getDate()} ${thMonths[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`;
    };

    const createdThaiDate = formatThaiDate(booking.createdAt ? booking.createdAt.split('T')[0] : booking.startDate);
    const eventThaiDate = booking.startDate === booking.endDate 
      ? formatThaiDate(booking.startDate)
      : `${formatThaiDate(booking.startDate)} ถึง ${formatThaiDate(booking.endDate)}`;

    const renderSignature = (sigText, defaultName) => {
      if (!sigText) {
        return `<div class="h-12 border-b border-dotted border-slate-400 w-44 mx-auto"></div>`;
      }
      if (sigText.startsWith('data:image')) {
        return `<div class="h-12 flex items-center justify-center"><img src="${sigText}" class="max-h-12 max-w-[170px] object-contain" alt="ลายมือชื่อ" /></div>`;
      }
      return `<div class="h-12 flex items-center justify-center font-serif italic text-blue-900 font-bold text-base border-b border-dotted border-slate-400 w-44 mx-auto">${sigText}</div>`;
    };

    return `
      <div class="text-black text-[13pt] leading-normal official-font select-none">
        
        <!-- Document Header / Garuda or College Seal -->
        <div class="text-center relative pb-3 border-b-2 border-black mb-4">
          <div class="w-16 h-16 mx-auto mb-2 flex items-center justify-center text-red-700">
            <!-- Simulated Official Emblem -->
            <svg class="w-16 h-16" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 5 L62 38 L97 38 L68 59 L80 93 L50 72 L20 93 L32 59 L3 38 L38 38 Z" fill="#b91c1c" stroke="#b45309" stroke-width="2"/>
              <circle cx="50" cy="50" r="18" fill="#fef3c7" stroke="#b91c1c" stroke-width="2"/>
              <text x="50" y="55" font-size="12" font-family="'Sarabun', sans-serif" font-weight="bold" fill="#b91c1c" text-anchor="middle">สอศ.</text>
            </svg>
          </div>
          <h2 class="text-xl font-bold tracking-wide">แบบคำขออนุญาตใช้ห้องประชุมและสิ่งอำนวยความสะดวก</h2>
          <h3 class="text-lg font-bold">วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</h3>
          <p class="text-xs text-slate-700 mt-1">งานศูนย์ดิจิทัลและสื่อสารองค์กร ฝ่ายพัฒนายุทธศาสตร์และแผนงาน</p>

          <div class="absolute right-0 top-0 text-right text-xs">
            <p><strong>เลขที่คำขอ:</strong> ${booking.id}</p>
            <p><strong>วันที่ยื่น:</strong> ${createdThaiDate}</p>
          </div>
        </div>

        <!-- SECTION 1: ข้อมูลผู้ขอใช้ & รายละเอียดการขอใช้ -->
        <div class="mb-4">
          <p class="font-bold text-sm bg-slate-100 px-2 py-1 border border-slate-300">
            ส่วนที่ 1: ข้อมูลผู้ขอใช้และรายละเอียดการขอใช้ห้องประชุม
          </p>
          <div class="mt-2 text-xs space-y-1.5 px-1">
            <div class="grid grid-cols-2 gap-4">
              <p><strong>ข้าพเจ้า:</strong> ${booking.requesterName}</p>
              <p><strong>ตำแหน่ง:</strong> ${booking.requesterPosition}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <p><strong>หน่วยงาน/สาขาวิชา:</strong> ${booking.requesterDept}</p>
              <p><strong>เบอร์โทรศัพท์ติดต่อ:</strong> ${booking.requesterPhone}</p>
            </div>
            <div class="border-t border-slate-200 pt-2 mt-2">
              <p>มีความประสงค์ขออนุญาตใช้ <strong>${booking.roomName}</strong></p>
              <p><strong>วัตถุประสงค์เพื่อ:</strong> ${booking.purpose}</p>
              <div class="grid grid-cols-2 gap-4 mt-1">
                <p><strong>ในวันที่:</strong> ${eventThaiDate}</p>
                <p><strong>เวลา:</strong> ${booking.startTime} น. ถึง ${booking.endTime} น.</p>
              </div>
              <p><strong>จำนวนผู้เข้าใช้ห้องโดยประมาณ:</strong> ${booking.attendees} คน</p>
            </div>
          </div>
        </div>

        <!-- SECTION 2: ครุภัณฑ์และอุปกรณ์ที่ขอใช้ -->
        <div class="mb-4">
          <p class="font-bold text-sm bg-slate-100 px-2 py-1 border border-slate-300">
            รายการครุภัณฑ์และสิ่งอำนวยความสะดวกที่ขอใช้งาน
          </p>
          <div class="mt-2 text-xs grid grid-cols-2 gap-y-1.5 px-2">
            <div>
              <span>${booking.facilities && booking.facilities.projector ? '☑' : '☐'} เครื่องฉายภาพ (Projector / จอแสดงผล)</span>
            </div>
            <div>
              <span>${booking.facilities && booking.facilities.sound ? '☑' : '☐'} ระบบเครื่องเสียงและลำโพง</span>
            </div>
            <div>
              <span>${booking.facilities && booking.facilities.mic ? '☑' : '☐'} ไมโครโฟน ${booking.facilities.mic ? `(${booking.facilities.micCount || 2} ตัว)` : ''}</span>
            </div>
            <div>
              <span>${booking.facilities && booking.facilities.air ? '☑' : '☐'} เครื่องปรับอากาศ</span>
            </div>
            <div>
              <span>${booking.facilities && booking.facilities.internet ? '☑' : '☐'} สัญญาณอินเทอร์เน็ต / Wi-Fi</span>
            </div>
            <div>
              <span>${booking.facilities && booking.facilities.furniture ? '☑' : '☐'} โต๊ะ/เก้าอี้เพิ่มเติม ${booking.facilities.furniture ? `(${booking.facilities.furnitureCount || 0} ตัว)` : ''}</span>
            </div>
            <div class="col-span-2">
              <span><strong>ความต้องการอื่นๆ เพิ่มเติม:</strong> ${booking.facilities && booking.facilities.other ? booking.facilities.other : 'ไม่มี'}</span>
            </div>
          </div>

          <!-- ลายมือชื่อผู้ยื่น -->
          <div class="text-right mt-3 pr-6 text-xs">
            ${renderSignature(booking.workflow && booking.workflow.step1 ? booking.workflow.step1.officialName : '', booking.requesterName)}
            <p class="mt-1">ลงชื่อ............................................................ผู้ขออนุญาต</p>
            <p class="mt-0.5">(${booking.requesterName})</p>
            <p class="text-[10px] text-slate-500 mt-0.5">วันที่ ${createdThaiDate}</p>
          </div>
        </div>

        <!-- SECTION 3 & 4 & 5: THREE COLUMNS OR ROWS FOR 3 OFFICIALS -->
        <div class="border border-black divide-y divide-black text-xs">
          
          <!-- STEP 2: เจ้าหน้าที่ตรวจสอบห้อง -->
          <div class="p-2.5">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-bold">ส่วนที่ 2: ความเห็นของเจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร</p>
                <div class="mt-1.5 flex items-center space-x-6">
                  <label class="inline-flex items-center">
                    <span class="mr-1">${booking.workflow && booking.workflow.step2.status === 'APPROVED' ? '☑' : '☐'}</span>
                    <span>ห้องประชุมและอุปกรณ์ <strong>พร้อมใช้งาน</strong></span>
                  </label>
                  <label class="inline-flex items-center">
                    <span class="mr-1">${booking.workflow && booking.workflow.step2.status === 'REJECTED' ? '☑' : '☐'}</span>
                    <span>ห้องประชุมหรืออุปกรณ์ <strong>ไม่พร้อมใช้งาน</strong></span>
                  </label>
                </div>
                <p class="mt-1"><strong>หมายเหตุ/ข้อคิดเห็น:</strong> ${booking.workflow && booking.workflow.step2.comment ? booking.workflow.step2.comment : '-'}</p>
              </div>
              <div class="text-center w-52">
                ${renderSignature(booking.workflow && booking.workflow.step2.signature, 'นายวัชรพงศ์ โสภา')}
                <p class="mt-1">ลงชื่อ............................................................เจ้าหน้าที่</p>
                <p class="mt-0.5">( นายวัชรพงศ์ โสภา )</p>
                <p class="text-[10px]">เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร</p>
                <p class="text-[10px] text-slate-500">${booking.workflow && booking.workflow.step2.timestamp ? formatThaiDate(booking.workflow.step2.timestamp.split('T')[0]) : 'วันที่ ......./......./.......'}</p>
              </div>
            </div>
          </div>

          <!-- STEP 3: หัวหน้างานรับรอง -->
          <div class="p-2.5">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-bold">ส่วนที่ 3: ความเห็นและการรับรองของหัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร</p>
                <div class="mt-1.5 flex items-center space-x-6">
                  <label class="inline-flex items-center">
                    <span class="mr-1">${booking.workflow && booking.workflow.step3.status === 'APPROVED' ? '☑' : '☐'}</span>
                    <span><strong>เห็นควรให้ใช้ห้องประชุมได้</strong> ตามวันและเวลาดังกล่าว</span>
                  </label>
                  <label class="inline-flex items-center">
                    <span class="mr-1">${booking.workflow && booking.workflow.step3.status === 'REJECTED' ? '☑' : '☐'}</span>
                    <span><strong>ไม่เห็นควร</strong></span>
                  </label>
                </div>
                <p class="mt-1"><strong>หมายเหตุ:</strong> ${booking.workflow && booking.workflow.step3.comment ? booking.workflow.step3.comment : '-'}</p>
              </div>
              <div class="text-center w-52">
                ${renderSignature(booking.workflow && booking.workflow.step3.signature, 'นายเอกราช เขียวทอง')}
                <p class="mt-1">ลงชื่อ............................................................หัวหน้างาน</p>
                <p class="mt-0.5">( นายเอกราช เขียวทอง )</p>
                <p class="text-[10px]">หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร</p>
                <p class="text-[10px] text-slate-500">${booking.workflow && booking.workflow.step3.timestamp ? formatThaiDate(booking.workflow.step3.timestamp.split('T')[0]) : 'วันที่ ......./......./.......'}</p>
              </div>
            </div>
          </div>

          <!-- STEP 4: รองผู้อำนวยการอนุมัติ -->
          <div class="p-2.5 bg-slate-50/50">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-bold text-red-900">ส่วนที่ 4: การพิจารณาอนุมัติของรองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน</p>
                <div class="mt-1.5 flex items-center space-x-6">
                  <label class="inline-flex items-center text-emerald-800">
                    <span class="mr-1 font-bold">${booking.workflow && booking.workflow.step4.status === 'APPROVED' ? '☑' : '☐'}</span>
                    <span class="font-bold">อนุมัติ</span>
                  </label>
                  <label class="inline-flex items-center text-red-800">
                    <span class="mr-1 font-bold">${booking.workflow && booking.workflow.step4.status === 'REJECTED' ? '☑' : '☐'}</span>
                    <span class="font-bold">ไม่อนุมัติ</span>
                  </label>
                </div>
                <p class="mt-1"><strong>คำสั่ง/ข้อคิดเห็น:</strong> ${booking.workflow && booking.workflow.step4.comment ? booking.workflow.step4.comment : '-'}</p>
              </div>
              <div class="text-center w-52">
                ${renderSignature(booking.workflow && booking.workflow.step4.signature, 'นายชาตรี เริงชัยภูมิ')}
                <p class="mt-1">ลงชื่อ............................................................ผู้อนุมัติ</p>
                <p class="mt-0.5 font-bold">( นายชาตรี เริงชัยภูมิ )</p>
                <p class="text-[10px]">รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน</p>
                <p class="text-[10px] text-slate-500">${booking.workflow && booking.workflow.step4.timestamp ? formatThaiDate(booking.workflow.step4.timestamp.split('T')[0]) : 'วันที่ ......./......./.......'}</p>
              </div>
            </div>
          </div>

        </div>

        <div class="text-center text-[9pt] text-slate-500 mt-4">
          <p>เอกสารนี้ออกโดยระบบจองห้องประชุมออนไลน์ (Smart Meeting Room Booking System) วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</p>
        </div>

      </div>
    `;
  }

  /**
   * ส่งออกข้อมูลการจองเป็นไฟล์ CSV โดยใส่ UTF-8 BOM (\uFEFF)
   * เพื่อให้เปิดใน Microsoft Excel ภาษาไทยได้ทันทีโดยไม่เป็นตัวอักษรต่างดาว
   */
  exportCSV() {
    const bookings = storageService.getAllBookings();
    if (bookings.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีรายการจองห้องประชุมสำหรับส่งออก',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const headers = [
      'เลขที่คำขอ',
      'ห้องประชุม',
      'ผู้ขอใช้',
      'ตำแหน่ง',
      'หน่วยงาน/สาขาวิชา',
      'เบอร์โทรศัพท์',
      'วัตถุประสงค์',
      'วันที่เริ่ม',
      'วันที่สิ้นสุด',
      'เวลาเริ่ม',
      'เวลาสิ้นสุด',
      'จำนวนคน',
      'เครื่องฉายภาพ',
      'ระบบเสียง',
      'ไมโครโฟน',
      'แอร์',
      'อินเทอร์เน็ต',
      'โต๊ะเก้าอี้เสริม',
      'อุปกรณ์อื่นๆ',
      'สถานะการอนุมัติ',
      'เจ้าหน้าที่ตรวจสอบ',
      'หัวหน้างานรับรอง',
      'รอง ผอ. อนุมัติ',
      'วันที่ยื่นคำขอ'
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = bookings.map(b => {
      const f = b.facilities || {};
      const w = b.workflow || {};
      return [
        escapeCSV(b.id),
        escapeCSV(b.roomName),
        escapeCSV(b.requesterName),
        escapeCSV(b.requesterPosition),
        escapeCSV(b.requesterDept),
        escapeCSV(b.requesterPhone),
        escapeCSV(b.purpose),
        escapeCSV(b.startDate),
        escapeCSV(b.endDate),
        escapeCSV(b.startTime),
        escapeCSV(b.endTime),
        escapeCSV(b.attendees),
        escapeCSV(f.projector ? 'ขอใช้' : '-'),
        escapeCSV(f.sound ? 'ขอใช้' : '-'),
        escapeCSV(f.mic ? `${f.micCount || 1} ตัว` : '-'),
        escapeCSV(f.air ? 'ขอใช้' : '-'),
        escapeCSV(f.internet ? 'ขอใช้' : '-'),
        escapeCSV(f.furniture ? `${f.furnitureCount || 0} ตัว` : '-'),
        escapeCSV(f.other || '-'),
        escapeCSV(b.overallStatusLabel || b.status),
        escapeCSV(w.step2 ? w.step2.status : '-'),
        escapeCSV(w.step3 ? w.step3.status : '-'),
        escapeCSV(w.step4 ? w.step4.status : '-'),
        escapeCSV(b.createdAt ? b.createdAt.split('T')[0] : '-')
      ].join(',');
    });

    // Add UTF-8 BOM (\uFEFF)
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting_bookings_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    soundManager.playSuccess();
    Swal.fire({
      icon: 'success',
      title: 'ส่งออก CSV สำเร็จ',
      text: 'ดาวน์โหลดไฟล์ CSV (รองรับภาษาไทยสำหรับ Excel) เรียบร้อยแล้ว',
      timer: 2000,
      showConfirmButton: false
    });
  }

  /**
   * ส่งออกเป็นไฟล์ Excel HTML Spreadsheet (.xls)
   */
  exportExcelHTML() {
    const bookings = storageService.getAllBookings();
    if (bookings.length === 0) return;

    let tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>การจองห้องประชุม</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          th { background-color: #c81e1e; color: #ffffff; border: 1px solid #000; padding: 6px; font-family: Tahoma, sans-serif; }
          td { border: 1px solid #ccc; padding: 5px; font-family: Tahoma, sans-serif; }
        </style>
      </head>
      <body>
        <h3>รายงานการจองห้องประชุม วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</h3>
        <table>
          <thead>
            <tr>
              <th>เลขที่คำขอ</th>
              <th>ห้องประชุม</th>
              <th>ผู้ขอใช้</th>
              <th>ตำแหน่ง</th>
              <th>หน่วยงาน</th>
              <th>เบอร์โทร</th>
              <th>วัตถุประสงค์</th>
              <th>วันที่เริ่ม</th>
              <th>วันที่สิ้นสุด</th>
              <th>เวลา</th>
              <th>จำนวนคน</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
    `;

    bookings.forEach(b => {
      tableHTML += `
        <tr>
          <td>${b.id}</td>
          <td>${b.roomName}</td>
          <td>${b.requesterName}</td>
          <td>${b.requesterPosition}</td>
          <td>${b.requesterDept}</td>
          <td>${b.requesterPhone}</td>
          <td>${b.purpose}</td>
          <td>${b.startDate}</td>
          <td>${b.endDate}</td>
          <td>${b.startTime} - ${b.endTime}</td>
          <td>${b.attendees}</td>
          <td>${b.overallStatusLabel || b.status}</td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table></body></html>`;

    const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting_report_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    soundManager.playSuccess();
  }
}

// Global instance
const exportService = new ExportService();
