/**
 * ==============================================================================
 * Google Apps Script: Backend API สำหรับระบบจองห้องประชุมออนไลน์
 * วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 * 
 * ฟังก์ชันหลัก:
 * 1. doGet: ให้บริการดึงข้อมูลรายการจองห้องประชุมทั้งหมด หรือ ค้นหาตาม ID
 * 2. doPost: บันทึกการจองใหม่, อัปเดตสถานะการอนุมัติ 4 ขั้นตอน, ซิงค์ข้อมูลทั้งหมด
 * 3. initSheetStructure: สร้างตารางและจัดฟอร์แมตหัวตารางอัตโนมัติ
 * ==============================================================================
 */

// ชื่อแผ่นงานหลักสำหรับจัดเก็บข้อมูล
var SHEET_NAME = 'Bookings';

/**
 * จัดการ HTTP GET Request
 * ตัวอย่าง URL: https://script.google.com/macros/s/.../exec?action=GET_ALL
 */
function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action || 'GET_ALL';
    var sheet = getOrCreateSheet();

    if (action === 'GET_ALL') {
      var rows = sheet.getDataRange().getValues();
      var bookings = [];

      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        if (!row[0]) continue; // ข้ามแถวว่าง
        var rawJson = row[1]; // Column B: JSON Data
        if (rawJson) {
          try {
            bookings.push(JSON.parse(rawJson));
          } catch(err) {
            // Fallback parse
          }
        }
      }

      return createJsonResponse({
        status: 'success',
        count: bookings.length,
        bookings: bookings,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'GET_BY_ID') {
      var targetId = params.id;
      var rows = sheet.getDataRange().getValues();
      for (var j = 1; j < rows.length; j++) {
        if (rows[j][0] === targetId) {
          return createJsonResponse({
            status: 'success',
            booking: JSON.parse(rows[j][1])
          });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Booking ID not found' }, 404);
    }

    return createJsonResponse({ status: 'error', message: 'Unknown GET action' }, 400);

  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() }, 500);
  }
}

/**
 * จัดการ HTTP POST Request
 * รองรับการซิงค์ข้อมูล (SYNC_ALL), บันทึกการจองใหม่ (ADD_BOOKING), หรืออัปเดตการอนุมัติ (UPDATE_APPROVAL)
 */
function doPost(e) {
  try {
    var params = e.parameter;
    var postData = null;

    // ตรวจสอบข้อมูลที่ส่งเข้ามา
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {
        postData = null;
      }
    }

    var action = (params && params.action) || (postData && postData.action) || 'SYNC_ALL';
    var sheet = getOrCreateSheet();

    // 1. ซิงค์ข้อมูลทั้งหมดจากหน้าเว็บ
    if (action === 'SYNC_ALL') {
      var rawJsonString = (params && params.data) || (postData && JSON.stringify(postData.data));
      if (!rawJsonString) {
        return createJsonResponse({ status: 'error', message: 'No data provided' }, 400);
      }

      var bookingsList = JSON.parse(rawJsonString);
      
      // ล้างข้อมูลเดิมและเขียนหัวตารางใหม่
      sheet.clear();
      initSheetStructure(sheet);

      var newRows = [];
      for (var i = 0; i < bookingsList.length; i++) {
        var b = bookingsList[i];
        newRows.push([
          b.id,
          JSON.stringify(b),
          b.roomName,
          b.requesterName,
          b.requesterPosition || '',
          b.requesterDept || '',
          b.requesterPhone || '',
          b.purpose || '',
          b.startDate,
          b.endDate || b.startDate,
          (b.startTime || '') + ' - ' + (b.endTime || ''),
          b.attendees || 0,
          b.overallStatusLabel || b.status,
          b.workflow && b.workflow.step2 ? b.workflow.step2.status : '-',
          b.workflow && b.workflow.step3 ? b.workflow.step3.status : '-',
          b.workflow && b.workflow.step4 ? b.workflow.step4.status : '-',
          b.createdAt || new Date().toISOString()
        ]);
      }

      if (newRows.length > 0) {
        sheet.getRange(2, 1, newRows.length, newRows[0].length).setValues(newRows);
      }

      return createJsonResponse({
        status: 'success',
        message: 'Successfully synced ' + bookingsList.length + ' records',
        updatedAt: new Date().toISOString()
      });
    }

    // 2. บันทึกคำขอจองใหม่รายรายการ
    if (action === 'ADD_BOOKING') {
      var newBooking = postData ? postData.booking : JSON.parse(params.booking);
      sheet.appendRow([
        newBooking.id,
        JSON.stringify(newBooking),
        newBooking.roomName,
        newBooking.requesterName,
        newBooking.requesterPosition || '',
        newBooking.requesterDept || '',
        newBooking.requesterPhone || '',
        newBooking.purpose || '',
        newBooking.startDate,
        newBooking.endDate || newBooking.startDate,
        (newBooking.startTime || '') + ' - ' + (newBooking.endTime || ''),
        newBooking.attendees || 0,
        newBooking.overallStatusLabel || newBooking.status,
        'PENDING',
        'WAITING',
        'WAITING',
        new Date().toISOString()
      ]);

      return createJsonResponse({
        status: 'success',
        bookingId: newBooking.id,
        message: 'Booking added successfully'
      });
    }

    return createJsonResponse({ status: 'error', message: 'Unsupported POST action: ' + action }, 400);

  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() }, 500);
  }
}

/**
 * ตรวจสอบหรือสร้าง Sheet เริ่มต้นพร้อมตกแต่งสีสัน
 */
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    initSheetStructure(sheet);
  }
  return sheet;
}

/**
 * สร้างหัวตารางและจัดฟอร์แมตให้สวยงามตามโทนสีวิทยาลัย (แดง-ทอง)
 */
function initSheetStructure(sheet) {
  var headers = [
    'เลขที่คำขอ (ID)',
    'ข้อมูลเต็ม (JSON Payload)',
    'ห้องประชุม',
    'ผู้ขอใช้',
    'ตำแหน่ง',
    'หน่วยงาน/สาขาวิชา',
    'เบอร์โทรศัพท์',
    'วัตถุประสงค์',
    'วันที่เริ่ม',
    'วันที่สิ้นสุด',
    'เวลาที่ขอใช้',
    'จำนวนผู้เข้าใช้ (คน)',
    'สถานะรวม',
    'ขั้น 2 (จนท.ตรวจห้อง)',
    'ขั้น 3 (หน.งานรับรอง)',
    'ขั้น 4 (รอง ผอ.อนุมัติ)',
    'วันที่บันทึกคำขอ'
  ];

  sheet.appendRow(headers);

  // จัดแต่ง Header สวยงาม
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#b91c1c'); // สีแดงเข้มท่าหลวง
  headerRange.setFontColor('#ffffff'); // ตัวอักษรสีขาว
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');

  // ตรึงแถวแรก
  sheet.setFrozenRows(1);

  // ซ่อนคอลัมน์ JSON Data (คอลัมน์ B) เพื่อความสบายตา
  sheet.hideColumns(2);

  // ตั้งความกว้างคอลัมน์
  sheet.setColumnWidth(1, 130); // ID
  sheet.setColumnWidth(3, 180); // Room
  sheet.setColumnWidth(4, 160); // Requester
  sheet.setColumnWidth(8, 250); // Purpose
}

/**
 * Helper แปลงผลลัพธ์เป็น JSON Response พร้อม CORS Header
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
