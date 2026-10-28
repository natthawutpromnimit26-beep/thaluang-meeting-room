/**
 * Storage & Data Management Service
 * จัดการข้อมูลการจองห้องประชุม, LocalStorage, Google Sheets API Sync, และ Webhooks
 * วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 */

const STORAGE_KEYS = {
  BOOKINGS: 'thaluang_bookings_v1',
  SETTINGS: 'thaluang_settings_v1'
};

// ข้อมูลห้องประชุมหลัก 6 ห้อง + อื่นๆ
const ROOMS_CONFIG = [
  {
    id: 'room-1',
    name: 'หอประชุมอดิเรกสาร',
    capacity: '500 - 800 คน',
    color: '#0284c7', // ฟ้า/น้ำเงิน
    icon: 'fa-landmark',
    description: 'เหมาะสำหรับการประชุมใหญ่, พิธีมอบประกาศนียบัตร, สัมมนาองค์กร',
    facilities: ['Projector จอใหญ่ 300 นิ้ว', 'ระบบเครื่องเสียงคอนเสิร์ต', 'ไมค์ลอย 8 ตัว', 'แอร์คอนดิชันเนอร์ขนาดใหญ่']
  },
  {
    id: 'room-2',
    name: 'ห้องประชุมสักทอง',
    capacity: '50 - 80 คน',
    color: '#059669', // เขียวเข้ม
    icon: 'fa-users',
    description: 'ห้องประชุมขนาดกลาง โต๊ะประชุม U-Shape พร้อมสิ่งอำนวยความสะดวกครบครัน',
    facilities: ['Projector / LED Screen', 'ไมค์ประจำโต๊ะรายบุคคล', 'ระบบแอร์', 'อินเทอร์เน็ตความเร็วสูง']
  },
  {
    id: 'room-3',
    name: 'ห้องประชุมหน้าห้องผู้อำนวยการ',
    capacity: '20 - 30 คน',
    color: '#dc2626', // แดง
    icon: 'fa-user-tie',
    description: 'ห้องประชุมสำหรับผู้บริหาร การประชุมกลุ่มย่อยเร่งด่วน การต้อนรับแขกวีไอพี',
    facilities: ['Smart TV 75 นิ้ว รองรับ Wireless Display', 'ไมค์ประชุมรอบทิศทาง', 'ระบบวิดีโอคอนเฟอเรนซ์']
  },
  {
    id: 'room-4',
    name: 'ห้องประชุม (กาแฟ)',
    capacity: '15 - 20 คน',
    color: '#d97706', // ส้มอำพัน/กาแฟ
    icon: 'fa-mug-hot',
    description: 'บรรยากาศเป็นกันเอง เหมาะสำหรับการสนทนา ประชุมแผนก ระดมความคิด',
    facilities: ['จอภาพ LCD', 'เครื่องชงกาแฟ/จุดเบรค', 'โซฟารับรอง', 'Wi-Fi']
  },
  {
    id: 'room-5',
    name: 'อาคารโดมเอนกประสงค์',
    capacity: '1,000 - 1,500 คน',
    color: '#7c3aed', // ม่วงคราม
    icon: 'fa-archway',
    description: 'อาคารพื้นที่กว้างขวาง อากาศถ่ายเท กิจกรรมนักเรียนนักศึกษา นิทรรศการ และแข่งกีฬา',
    facilities: ['เวทียกระดับ', 'ระบบเสียงสนาม', 'เก้าอี้พลาสติก 1,000 ตัว', 'พัดลมไอเย็นอุตสาหกรรม']
  },
  {
    id: 'room-6',
    name: 'ห้องคอมพิวเตอร์กลาง (ห้องโสต)',
    capacity: '40 - 60 คน',
    color: '#0891b2', // ฟ้าคราม/เทอร์คอยส์
    icon: 'fa-desktop',
    description: 'ห้องปฏิบัติการคอมพิวเตอร์และสื่อโสตทัศนูปกรณ์ อบรมดิจิทัลและเทคโนโลยีสารสนเทศ',
    facilities: ['คอมพิวเตอร์ 50 เครื่อง', 'Projector Full HD 2 จอ', 'ระบบ LAN Gigabit', 'เครื่องปรับอากาศ 4 ตัว']
  },
  {
    id: 'room-7',
    name: 'อื่นๆ',
    capacity: 'ตามระบุ',
    color: '#64748b', // เทา
    icon: 'fa-map-marker-alt',
    description: 'สถานที่หรือห้องประชุมอื่นๆ ภายในวิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์',
    facilities: ['ประสานงานเจ้าหน้าที่ล่วงหน้า']
  }
];

// ข้อมูลเจ้าหน้าที่และผู้พิจารณาอนุมัติ 4 ขั้นตอน
const APPROVAL_OFFICIALS = {
  STEP_2: {
    name: 'นายวัชรพงศ์ โสภา',
    position: 'เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร',
    roleTitle: 'เจ้าหน้าที่ตรวจสอบห้องและอุปกรณ์',
    actionApprovedLabel: 'พร้อมใช้งาน',
    actionRejectedLabel: 'ไม่พร้อมใช้งาน'
  },
  STEP_3: {
    name: 'นายเอกราช เขียวทอง',
    position: 'หัวหน้างานศูนย์ดิจิทัลและสื่อสารองค์กร',
    roleTitle: 'หัวหน้างานผู้รับรองคำขอ',
    actionApprovedLabel: 'รับรองคำขอ',
    actionRejectedLabel: 'ไม่รับรอง'
  },
  STEP_4: {
    name: 'นายชาตรี เริงชัยภูมิ',
    position: 'รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน',
    roleTitle: 'ผู้พิจารณาอนุมัติคำขอ',
    actionApprovedLabel: 'อนุมัติ',
    actionRejectedLabel: 'ไม่อนุมัติ'
  }
};

class StorageService {
  constructor() {
    this.bookings = [];
    this.settings = {
      googleWebAppUrl: '',
      googleSheetOnlineUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
      webhookProvider: 'discord',
      webhookUrl: '',
      autoSync: false
    };
    this.init();
  }

  init() {
    this.loadSettings();
    this.loadBookings();
    if (this.bookings.length === 0) {
      this.loadSampleData();
    }
  }

  loadSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        this.settings = Object.assign(this.settings, JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage', e);
    }
  }

  saveSettings(newSettings) {
    this.settings = Object.assign(this.settings, newSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
  }

  loadBookings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      if (data) {
        this.bookings = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load bookings from localStorage', e);
      this.bookings = [];
    }
  }

  saveBookings() {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(this.bookings));
      // If Google Sheets Web App URL is configured, trigger background sync
      if (this.settings.googleWebAppUrl) {
        this.syncToGoogleSheetsBackground();
      }
    } catch (e) {
      console.error('Failed to save bookings to localStorage', e);
    }
  }

  getAllBookings() {
    return [...this.bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getBookingById(id) {
    return this.bookings.find(b => b.id === id);
  }

  addBooking(bookingData) {
    const newBooking = {
      id: 'REQ-' + new Date().getFullYear().toString().substr(-2) + '-' + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'PENDING_STEP2', // สถานะหลัก: PENDING_STEP2, PENDING_STEP3, PENDING_STEP4, APPROVED, REJECTED
      overallStatusLabel: 'รอเจ้าหน้าที่ตรวจสอบ',
      ...bookingData,
      workflow: {
        step1: {
          title: 'ผู้ขอใช้ยื่นคำขอ',
          officialName: bookingData.requesterName,
          officialPosition: bookingData.requesterPosition,
          status: 'COMPLETED',
          timestamp: new Date().toISOString(),
          comment: 'ยื่นคำขอผ่านระบบออนไลน์สำเร็จ'
        },
        step2: {
          title: 'เจ้าหน้าที่ตรวจสอบห้อง',
          officialName: APPROVAL_OFFICIALS.STEP_2.name,
          officialPosition: APPROVAL_OFFICIALS.STEP_2.position,
          status: 'PENDING', // PENDING, APPROVED, REJECTED
          timestamp: null,
          comment: '',
          signature: null
        },
        step3: {
          title: 'หัวหน้างานรับรอง',
          officialName: APPROVAL_OFFICIALS.STEP_3.name,
          officialPosition: APPROVAL_OFFICIALS.STEP_3.position,
          status: 'WAITING', // WAITING, PENDING, APPROVED, REJECTED
          timestamp: null,
          comment: '',
          signature: null
        },
        step4: {
          title: 'รองผู้อำนวยการอนุมัติ',
          officialName: APPROVAL_OFFICIALS.STEP_4.name,
          officialPosition: APPROVAL_OFFICIALS.STEP_4.position,
          status: 'WAITING', // WAITING, PENDING, APPROVED, REJECTED
          timestamp: null,
          comment: '',
          signature: null
        }
      }
    };

    this.bookings.unshift(newBooking);
    this.saveBookings();

    // Fire webhook notification
    this.triggerWebhookNotification(newBooking, 'NEW_BOOKING');

    return newBooking;
  }

  updateApprovalStep(bookingId, stepNumber, decision, comment, signature) {
    const booking = this.getBookingById(bookingId);
    if (!booking) return null;

    const now = new Date().toISOString();

    if (stepNumber === 2) {
      booking.workflow.step2.status = decision;
      booking.workflow.step2.timestamp = now;
      booking.workflow.step2.comment = comment;
      if (signature) booking.workflow.step2.signature = signature;

      if (decision === 'APPROVED') {
        booking.status = 'PENDING_STEP3';
        booking.overallStatusLabel = 'รอหัวหน้างานรับรอง';
        booking.workflow.step3.status = 'PENDING';
      } else {
        booking.status = 'REJECTED';
        booking.overallStatusLabel = 'ไม่พร้อมใช้งาน (ห้องไม่ว่าง/อุปกรณ์ชำรุด)';
        booking.workflow.step3.status = 'SKIPPED';
        booking.workflow.step4.status = 'SKIPPED';
      }
    } else if (stepNumber === 3) {
      booking.workflow.step3.status = decision;
      booking.workflow.step3.timestamp = now;
      booking.workflow.step3.comment = comment;
      if (signature) booking.workflow.step3.signature = signature;

      if (decision === 'APPROVED') {
        booking.status = 'PENDING_STEP4';
        booking.overallStatusLabel = 'รอรองผู้อำนวยการอนุมัติ';
        booking.workflow.step4.status = 'PENDING';
      } else {
        booking.status = 'REJECTED';
        booking.overallStatusLabel = 'หัวหน้างานไม่รับรองคำขอ';
        booking.workflow.step4.status = 'SKIPPED';
      }
    } else if (stepNumber === 4) {
      booking.workflow.step4.status = decision;
      booking.workflow.step4.timestamp = now;
      booking.workflow.step4.comment = comment;
      if (signature) booking.workflow.step4.signature = signature;

      if (decision === 'APPROVED') {
        booking.status = 'APPROVED';
        booking.overallStatusLabel = 'อนุมัติเรียบร้อยแล้ว';
      } else {
        booking.status = 'REJECTED';
        booking.overallStatusLabel = 'รองผู้อำนวยการไม่อนุมัติ';
      }
    }

    booking.updatedAt = now;
    this.saveBookings();

    // Fire webhook notification for status update
    this.triggerWebhookNotification(booking, 'STATUS_UPDATE');

    return booking;
  }

  deleteBooking(bookingId) {
    const idx = this.bookings.findIndex(b => b.id === bookingId);
    if (idx !== -1) {
      this.bookings.splice(idx, 1);
      this.saveBookings();
      return true;
    }
    return false;
  }

  // ================= CONFLICT DETECTION LOGIC =================
  /**
   * ตรวจสอบว่าช่วงเวลาที่ต้องการจอง ชนกับการจองอื่นในห้องเดียวกันหรือไม่
   * @param {string} roomName 
   * @param {string} startDate 'YYYY-MM-DD'
   * @param {string} endDate 'YYYY-MM-DD'
   * @param {string} startTime 'HH:mm'
   * @param {string} endTime 'HH:mm'
   * @param {string} excludeId รหัสคำขอที่ไม่นำมาตรวจ (กรณีแก้ไขข้อมูล)
   * @returns {Array} รายการคำขอที่ชนเวลา
   */
  checkConflicts(roomName, startDate, endDate, startTime, endTime, excludeId = null) {
    if (!roomName || !startDate || !endDate || !startTime || !endTime) {
      return [];
    }

    const proposedStart = new Date(`${startDate}T${startTime}:00`).getTime();
    const proposedEnd = new Date(`${endDate}T${endTime}:00`).getTime();

    if (isNaN(proposedStart) || isNaN(proposedEnd) || proposedEnd <= proposedStart) {
      return [];
    }

    // เฉพาะการจองที่ยังไม่ถูกปฏิเสธ (APPROVED, PENDING_STEP2, PENDING_STEP3, PENDING_STEP4)
    return this.bookings.filter(b => {
      if (excludeId && b.id === excludeId) return false;
      if (b.status === 'REJECTED') return false;
      if (b.roomName !== roomName) return false;

      const existingStart = new Date(`${b.startDate}T${b.startTime}:00`).getTime();
      const existingEnd = new Date(`${b.endDate}T${b.endTime}:00`).getTime();

      if (isNaN(existingStart) || isNaN(existingEnd)) return false;

      // Overlap condition: ProposedStart < ExistingEnd AND ProposedEnd > ExistingStart
      return (proposedStart < existingEnd && proposedEnd > existingStart);
    });
  }

  // ================= SAMPLE DATA GENERATOR =================
  loadSampleData() {
    const today = new Date();
    const formatDate = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    this.bookings = [
      {
        id: 'REQ-26-1001',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        roomName: 'หอประชุมอดิเรกสาร',
        requesterName: 'นายประสิทธิ์ ภูมิลำเนา',
        requesterPosition: 'หัวหน้าแผนกวิชาช่างยนต์',
        requesterDept: 'แผนกวิชาช่างยนต์',
        requesterPhone: '081-456-7890',
        purpose: 'การประชุมผู้ปกครองนักเรียนนักศึกษาใหม่ ประจำภาคเรียนที่ 1',
        attendees: 450,
        startDate: formatDate(0), // วันนี้
        endDate: formatDate(0),
        startTime: '08:30',
        endTime: '12:00',
        facilities: {
          projector: true,
          sound: true,
          mic: true,
          micCount: 4,
          air: true,
          internet: true,
          furniture: true,
          furnitureCount: 450,
          other: 'เวทีและโพเดียม พร้อมธงชาติและธงวิทยาลัย'
        },
        status: 'APPROVED',
        overallStatusLabel: 'อนุมัติเรียบร้อยแล้ว',
        workflow: {
          step1: {
            title: 'ผู้ขอใช้ยื่นคำขอ',
            officialName: 'นายประสิทธิ์ ภูมิลำเนา',
            officialPosition: 'หัวหน้าแผนกวิชาช่างยนต์',
            status: 'COMPLETED',
            timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
            comment: 'ยื่นคำขอจัดประชุมผู้ปกครอง'
          },
          step2: {
            title: 'เจ้าหน้าที่ตรวจสอบห้อง',
            officialName: APPROVAL_OFFICIALS.STEP_2.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_2.position,
            status: 'APPROVED',
            timestamp: new Date(Date.now() - 86400000 * 2.8).toISOString(),
            comment: 'ตรวจสอบระบบเครื่องเสียง แอร์ และเก้าอี้ พร้อมใช้งาน',
            signature: 'วัชรพงศ์ โสภา'
          },
          step3: {
            title: 'หัวหน้างานรับรอง',
            officialName: APPROVAL_OFFICIALS.STEP_3.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_3.position,
            status: 'APPROVED',
            timestamp: new Date(Date.now() - 86400000 * 2.5).toISOString(),
            comment: 'เห็นควรจัดเจ้าหน้าที่คุมระบบเสียงอำนวยความสะดวก',
            signature: 'เอกราช เขียวทอง'
          },
          step4: {
            title: 'รองผู้อำนวยการอนุมัติ',
            officialName: APPROVAL_OFFICIALS.STEP_4.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_4.position,
            status: 'APPROVED',
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
            comment: 'อนุมัติให้ใช้สถานที่ตามระเบียบ',
            signature: 'ชาตรี เริงชัยภูมิ'
          }
        }
      },
      {
        id: 'REQ-26-1002',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        roomName: 'ห้องประชุมสักทอง',
        requesterName: 'นางสาวรัชนี ศรีวิชัย',
        requesterPosition: 'ครูชำนาญการพิเศษ หัวหน้างานวิชาการ',
        requesterDept: 'ฝ่ายวิชาการ',
        requesterPhone: '089-765-4321',
        purpose: 'การประชุมพัฒนาหลักสูตรฐานสมรรถนะร่วมกับสถานประกอบการเครือข่าย',
        attendees: 35,
        startDate: formatDate(1), // พรุ่งนี้
        endDate: formatDate(1),
        startTime: '09:00',
        endTime: '16:00',
        facilities: {
          projector: true,
          sound: true,
          mic: true,
          micCount: 6,
          air: true,
          internet: true,
          furniture: false,
          furnitureCount: 0,
          other: 'ชุดกาแฟอาหารว่างเช้า-บ่าย'
        },
        status: 'PENDING_STEP4',
        overallStatusLabel: 'รอรองผู้อำนวยการอนุมัติ',
        workflow: {
          step1: {
            title: 'ผู้ขอใช้ยื่นคำขอ',
            officialName: 'นางสาวรัชนี ศรีวิชัย',
            officialPosition: 'หัวหน้างานวิชาการ',
            status: 'COMPLETED',
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
            comment: 'ยื่นคำขอพัฒนาหลักสูตร'
          },
          step2: {
            title: 'เจ้าหน้าที่ตรวจสอบห้อง',
            officialName: APPROVAL_OFFICIALS.STEP_2.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_2.position,
            status: 'APPROVED',
            timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
            comment: 'ห้องสักทองสภาพพร้อมใช้งาน ไมค์ประจำโต๊ะทดสอบแล้วทำงานปกติ',
            signature: 'วัชรพงศ์ โสภา'
          },
          step3: {
            title: 'หัวหน้างานรับรอง',
            officialName: APPROVAL_OFFICIALS.STEP_3.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_3.position,
            status: 'APPROVED',
            timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
            comment: 'รับรองคำขอ อยู่ในแผนพัฒนาการศึกษา',
            signature: 'เอกราช เขียวทอง'
          },
          step4: {
            title: 'รองผู้อำนวยการอนุมัติ',
            officialName: APPROVAL_OFFICIALS.STEP_4.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_4.position,
            status: 'PENDING',
            timestamp: null,
            comment: '',
            signature: null
          }
        }
      },
      {
        id: 'REQ-26-1003',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        roomName: 'ห้องคอมพิวเตอร์กลาง (ห้องโสต)',
        requesterName: 'นายณัฐพงษ์ แก้วมณี',
        requesterPosition: 'ครูแผนกเทคโนโลยีสารสนเทศ',
        requesterDept: 'แผนกวิชาเทคโนโลยีสารสนเทศ',
        requesterPhone: '086-112-2334',
        purpose: 'การอบรมเชิงปฏิบัติการพัฒนาเว็บแอปพลิเคชันและระบบปัญญาประดิษฐ์ AI สำหรับนักศึกษา ปวส.',
        attendees: 40,
        startDate: formatDate(2),
        endDate: formatDate(2),
        startTime: '08:30',
        endTime: '16:30',
        facilities: {
          projector: true,
          sound: true,
          mic: true,
          micCount: 2,
          air: true,
          internet: true,
          furniture: false,
          furnitureCount: 0,
          other: 'ต้องการเชื่อมต่อสาย LAN กับเครื่องเซิร์ฟเวอร์ทดสอบ'
        },
        status: 'PENDING_STEP2',
        overallStatusLabel: 'รอเจ้าหน้าที่ตรวจสอบ',
        workflow: {
          step1: {
            title: 'ผู้ขอใช้ยื่นคำขอ',
            officialName: 'นายณัฐพงษ์ แก้วมณี',
            officialPosition: 'ครูแผนกเทคโนโลยีสารสนเทศ',
            status: 'COMPLETED',
            timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
            comment: 'ยื่นคำขออบรม AI ปวส.'
          },
          step2: {
            title: 'เจ้าหน้าที่ตรวจสอบห้อง',
            officialName: APPROVAL_OFFICIALS.STEP_2.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_2.position,
            status: 'PENDING',
            timestamp: null,
            comment: '',
            signature: null
          },
          step3: {
            title: 'หัวหน้างานรับรอง',
            officialName: APPROVAL_OFFICIALS.STEP_3.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_3.position,
            status: 'WAITING',
            timestamp: null,
            comment: '',
            signature: null
          },
          step4: {
            title: 'รองผู้อำนวยการอนุมัติ',
            officialName: APPROVAL_OFFICIALS.STEP_4.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_4.position,
            status: 'WAITING',
            timestamp: null,
            comment: '',
            signature: null
          }
        }
      },
      {
        id: 'REQ-26-1004',
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        roomName: 'ห้องประชุมหน้าห้องผู้อำนวยการ',
        requesterName: 'นางสาวกานดา วิเศษสุข',
        requesterPosition: 'หัวหน้างานแผนงานและงบประมาณ',
        requesterDept: 'ฝ่ายพัฒนายุทธศาสตร์และแผนงาน',
        requesterPhone: '083-998-8776',
        purpose: 'การประชุมกลั่นกรองงบประมาณรายจ่าย ประจำปีงบประมาณ 2569 ร่วมกับคณะผู้บริหาร',
        attendees: 15,
        startDate: formatDate(3),
        endDate: formatDate(3),
        startTime: '13:30',
        endTime: '16:30',
        facilities: {
          projector: true,
          sound: false,
          mic: false,
          micCount: 0,
          air: true,
          internet: true,
          furniture: false,
          furnitureCount: 0,
          other: 'จอ Smart TV ไร้สาย และของว่างสำหรับผู้บริหาร'
        },
        status: 'APPROVED',
        overallStatusLabel: 'อนุมัติเรียบร้อยแล้ว',
        workflow: {
          step1: {
            title: 'ผู้ขอใช้ยื่นคำขอ',
            officialName: 'นางสาวกานดา วิเศษสุข',
            officialPosition: 'หัวหน้างานแผนงานและงบประมาณ',
            status: 'COMPLETED',
            timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
            comment: 'ยื่นคำขอประชุมงบประมาณ'
          },
          step2: {
            title: 'เจ้าหน้าที่ตรวจสอบห้อง',
            officialName: APPROVAL_OFFICIALS.STEP_2.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_2.position,
            status: 'APPROVED',
            timestamp: new Date(Date.now() - 86400000 * 3.8).toISOString(),
            comment: 'ห้องพร้อมใช้งาน จอ Smart TV พร้อมรีโมตคอนโทรล',
            signature: 'วัชรพงศ์ โสภา'
          },
          step3: {
            title: 'หัวหน้างานรับรอง',
            officialName: APPROVAL_OFFICIALS.STEP_3.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_3.position,
            status: 'APPROVED',
            timestamp: new Date(Date.now() - 86400000 * 3.5).toISOString(),
            comment: 'รับรองคำขอการประชุมผู้บริหาร',
            signature: 'เอกราช เขียวทอง'
          },
          step4: {
            title: 'รองผู้อำนวยการอนุมัติ',
            officialName: APPROVAL_OFFICIALS.STEP_4.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_4.position,
            status: 'APPROVED',
            timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
            comment: 'อนุมัติ ดำเนินการตามกำหนดการ',
            signature: 'ชาตรี เริงชัยภูมิ'
          }
        }
      },
      {
        id: 'REQ-26-1005',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        roomName: 'อาคารโดมเอนกประสงค์',
        requesterName: 'นายธีรพล วงศ์สวัสดิ์',
        requesterPosition: 'หัวหน้างานกิจกรรมนักเรียนนักศึกษา',
        requesterDept: 'ฝ่ายพัฒนากิจการนักเรียนนักศึกษา',
        requesterPhone: '085-334-5566',
        purpose: 'กิจกรรมปฐมนิเทศชมรมวิชาชีพ และคัดเลือกตัวแทนนักศึกษาเข้าร่วมการแข่งขันทักษะวิชาชีพ',
        attendees: 600,
        startDate: formatDate(4),
        endDate: formatDate(4),
        startTime: '08:00',
        endTime: '15:30',
        facilities: {
          projector: false,
          sound: true,
          mic: true,
          micCount: 6,
          air: false,
          internet: true,
          furniture: true,
          furnitureCount: 500,
          other: 'พัดลมไอเย็น 6 ตัว และแผงกั้นจัดนิทรรศการ'
        },
        status: 'PENDING_STEP3',
        overallStatusLabel: 'รอหัวหน้างานรับรอง',
        workflow: {
          step1: {
            title: 'ผู้ขอใช้ยื่นคำขอ',
            officialName: 'นายธีรพล วงศ์สวัสดิ์',
            officialPosition: 'หัวหน้างานกิจกรรมฯ',
            status: 'COMPLETED',
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
            comment: 'ยื่นคำขอกิจกรรมปฐมนิเทศชมรม'
          },
          step2: {
            title: 'เจ้าหน้าที่ตรวจสอบห้อง',
            officialName: APPROVAL_OFFICIALS.STEP_2.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_2.position,
            status: 'APPROVED',
            timestamp: new Date(Date.now() - 86400000 * 1.8).toISOString(),
            comment: 'พื้นที่โดมพร้อมใช้งาน ระบบเสียงกลางแจ้งพร้อม',
            signature: 'วัชรพงศ์ โสภา'
          },
          step3: {
            title: 'หัวหน้างานรับรอง',
            officialName: APPROVAL_OFFICIALS.STEP_3.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_3.position,
            status: 'PENDING',
            timestamp: null,
            comment: '',
            signature: null
          },
          step4: {
            title: 'รองผู้อำนวยการอนุมัติ',
            officialName: APPROVAL_OFFICIALS.STEP_4.name,
            officialPosition: APPROVAL_OFFICIALS.STEP_4.position,
            status: 'WAITING',
            timestamp: null,
            comment: '',
            signature: null
          }
        }
      }
    ];

    this.saveBookings();
  }

  // ================= WEBHOOK NOTIFICATION =================
  async triggerWebhookNotification(booking, eventType = 'NEW_BOOKING') {
    if (!this.settings.webhookUrl) return;

    try {
      const isDiscord = this.settings.webhookUrl.includes('discord.com');
      const isGoogleChat = this.settings.webhookUrl.includes('chat.googleapis.com');
      const isTelegram = this.settings.webhookUrl.includes('api.telegram.org');

      let payload = {};

      if (isDiscord) {
        let embedColor = 0xc81e1e; // Red
        if (booking.status === 'APPROVED') embedColor = 0x059669; // Green
        if (booking.status === 'REJECTED') embedColor = 0x64748b; // Gray

        payload = {
          content: eventType === 'NEW_BOOKING' 
            ? '📢 **มีการยื่นคำขอจองห้องประชุมใหม่!** วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์' 
            : `🔔 **อัปเดตสถานะคำขอจองห้องประชุม:** ${booking.id}`,
          embeds: [
            {
              title: `${booking.roomName} (${booking.startDate})`,
              description: `**วัตถุประสงค์:** ${booking.purpose}\n**ผู้ขอใช้:** ${booking.requesterName} (${booking.requesterDept})`,
              color: embedColor,
              fields: [
                { name: 'วันที่ & เวลา', value: `${booking.startDate} (${booking.startTime} - ${booking.endTime} น.)`, inline: true },
                { name: 'จำนวนผู้เข้าใช้', value: `${booking.attendees} คน`, inline: true },
                { name: 'สถานะปัจจุบัน', value: booking.overallStatusLabel, inline: true }
              ],
              footer: { text: 'ระบบจองห้องประชุมออนไลน์ • วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์' },
              timestamp: new Date().toISOString()
            }
          ]
        };
      } else if (isGoogleChat) {
        payload = {
          text: `*ระบบจองห้องประชุมออนไลน์ วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์*\n` +
                `📌 *${booking.roomName}*\n` +
                `ผู้ขอใช้: ${booking.requesterName} (${booking.requesterDept})\n` +
                `วันเวลา: ${booking.startDate} (${booking.startTime} - ${booking.endTime} น.)\n` +
                `วัตถุประสงค์: ${booking.purpose}\n` +
                `สถานะ: ${booking.overallStatusLabel}`
        };
      } else {
        // Standard JSON payload
        payload = {
          event: eventType,
          bookingId: booking.id,
          roomName: booking.roomName,
          requesterName: booking.requesterName,
          requesterDept: booking.requesterDept,
          startDate: booking.startDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          attendees: booking.attendees,
          purpose: booking.purpose,
          status: booking.status,
          statusLabel: booking.overallStatusLabel,
          updatedAt: new Date().toISOString()
        };
      }

      await fetch(this.settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Webhook dispatched successfully');
    } catch (e) {
      console.warn('Webhook dispatch failed or blocked by CORS:', e);
    }
  }

  // ================= GOOGLE SHEETS SYNC =================
  async syncToGoogleSheetsBackground() {
    if (!this.settings.googleWebAppUrl) return;
    try {
      await fetch(this.settings.googleWebAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'SYNC_ALL',
          data: JSON.stringify(this.bookings)
        })
      });
      console.log('Google Sheets background sync successful');
    } catch (e) {
      console.warn('Google Sheets background sync error:', e);
    }
  }

  async fetchFromGoogleSheets() {
    if (!this.settings.googleWebAppUrl) {
      throw new Error('กรุณาระบุ Google Web App URL ในหน้าตั้งค่าก่อน');
    }
    const resp = await fetch(this.settings.googleWebAppUrl + '?action=GET_ALL');
    if (!resp.ok) throw new Error('HTTP Status ' + resp.status);
    const result = await resp.json();
    if (result && Array.isArray(result.bookings)) {
      this.bookings = result.bookings;
      this.saveBookings();
      return this.bookings;
    } else {
      throw new Error('รูปแบบข้อมูลจาก Google Sheets ไม่ถูกต้อง');
    }
  }
}

// Global instance
const storageService = new StorageService();
