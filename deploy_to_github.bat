@echo off
chcp 65001 >nul
title อัปโหลดโครงการขึ้น GitHub - thaluang-meeting-room

set REPO_URL=https://github.com/natthawutpromnimit26-beep/thaluang-meeting-room.git
set UPLOAD_URL=https://github.com/natthawutpromnimit26-beep/thaluang-meeting-room/upload/main

echo ====================================================================
echo  🏫 ระบบจองห้องประชุมออนไลน์ (Smart Meeting Room Booking System)
echo  วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
echo  เป้าหมาย GitHub: %REPO_URL%
echo ====================================================================
echo.

where git >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [ตรวจพบ Git] กำลังดำเนินการอัปโหลดผ่านคำสั่ง Git อัตโนมัติ...
    if not exist ".git" (
        git init
    )
    git add .
    git commit -m "feat: ระบบจองห้องประชุมออนไลน์ วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์ v1.0"
    git branch -M main
    git remote remove origin >nul 2>nul
    git remote add origin %REPO_URL%
    echo กำลัง Push ไปยัง GitHub...
    git push -u origin main
    if %ERRORLEVEL% equ 0 (
        echo.
        echo [สำเร็จ!] อัปโหลดขึ้น GitHub เรียบร้อยแล้ว
        echo.
        pause
        exit /b
    )
)

echo [แจ้งเตือน] ไม่พบโปรแกรม Git ในเครื่องคอมพิวเตอร์ของคุณ
echo.
echo ระบบจะเปิดหน้าต่าง "เว็บ GitHub สำหรับอัปโหลด" และ "โฟลเดอร์ไฟล์ในเครื่อง"
echo ให้คุณลากไฟล์วางบนหน้าเว็บได้ทันที (ใช้เวลาเพียง 20 วินาที)
echo.
echo กำลังเปิดหน้าเว็บและโฟลเดอร์...
start %UPLOAD_URL%
explorer.exe .

echo.
echo ขั้นตอนง่ายๆ:
echo 1. หน้าเว็บ GitHub จะเปิดขึ้นมา
echo 2. ลากไฟล์ทั้งหมดจากหน้าต่างโฟลเดอร์ไปวางในหน้าเว็บ GitHub
echo 3. เลื่อนลงมากดปุ่มสีเขียว "Commit changes"
echo.
pause
