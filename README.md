# ระบบ API สำหรับจัดการโดรน

ระบบ API ที่พัฒนาด้วย Node.js/Express.js สำหรับจัดการการตั้งค่าและบันทึกข้อมูลโดรน

## ความต้องการของระบบ

- Node.js เวอร์ชัน 14.0.0 ขึ้นไป
- npm

## การติดตั้ง

```bash
npm install
```

## ตั้งค่าตัวแปรสภาพแวดล้อม

สร้างไฟล์ `.env` ในโฟลเดอร์หลัก:

```env
PORT=3000
NODE_ENV=production
DRONE_CONFIG_URL=<config-server-url>
LOG_URL=<log-server-url>
LOG_API_TOKEN=<api-token>
```

## การรันแอปพลิเคชัน

โหมดพัฒนา:
```bash
npm run dev
```

โหมดใช้งานจริง:
```bash
npm start
```

เซิร์ฟเวอร์จะทำงานที่ `http://localhost:3000` โดยค่าเริ่มต้น

## เอนด์พอยต์ API

### การตั้งค่า
- `GET /configs/{droneId}` - ดึงข้อมูลการตั้งค่าของโดรน

### สถานะ
- `GET /status/{droneId}` - ดึงข้อมูลสถานะของโดรน

### บันทึกข้อมูล
- `GET /logs/{droneId}` - ดึงประวัติการทำงานของโดรน (รองรับการแบ่งหน้า)
- `POST /logs` - สร้างบันทึกข้อมูลใหม่
