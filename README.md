Drone API Server - Assignment #1
API Server สำหรับระบบจัดการ Drone Configuration และ Logging ที่สร้างด้วย Node.js + Express.js และ host ด้วย vercel

📋 Features
GET /configs/{droneId} - ดึงข้อมูล configuration ของ drone
GET /status/{droneId} - ดึงสถานะของ drone
GET /logs/{droneId} - ดึงรายการ log ของ drone (รองรับ pagination)
POST /logs - สร้าง log record ใหม่

Running the Application
Development Mode
bash
npm run dev
Production Mode
bash
npm start
Server จะรันที่ http://localhost:3000 (หรือ port ที่กำหนดใน environment variable)

📡 API Endpoints
1. GET /configs/{droneId}
ดึงข้อมูล configuration ของ drone

Request:
GET /configs/3001
Response:

json
{
  "drone_id": 3001,
  "drone_name": "Dot Dot",
  "light": "on",
  "country": "India",
  "weight": 21
}
2. GET /status/{droneId}
ดึงสถานะของ drone

Request:

GET /status/3001
Response:

json
{
  "condition": "good"
}
3. GET /logs/{droneId}
ดึงรายการ log ของ drone (เรียงตาม created date ล่าสุดก่อน, จำกัด 12 รายการ)

Request:

GET /logs/3001
With Pagination:

GET /logs/3001?page=1&limit=12
Response:

json
[
  {
    "drone_id": 3001,
    "drone_name": "Dot Dot",
    "created": "2024-09-22T07:37:57.411Z",
    "country": "India",
    "celsius": 46
  },
  {
    "drone_id": 3001,
    "drone_name": "Dot Dot",
    "created": "2024-09-22T07:37:32.111Z",
    "country": "India",
    "celsius": 45
  }
]
Response with Pagination Info:

json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 12,
    "totalItems": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
4. POST /logs
สร้าง log record ใหม่

Request:

json
POST /logs
Content-Type: application/json

{
  "drone_id": 3001,
  "drone_name": "Dot Dot",
  "country": "India",
  "celsius": 47.5
}
Response:

json
{
  "success": true,
  "message": "Log created successfully",
  "data": {
    "drone_id": 3001,
    "drone_name": "Dot Dot",
    "country": "India",
    "celsius": 47.5,
    "created": "2024-09-22T08:30:15.123Z"
  }
}

🌐 Deployment
vercel

# Get drone config
http://localhost:3000/configs/3001

# Get drone status
http://localhost:3000/status/3001

# Get drone logs
http://localhost:3000/logs/3001

# Create new log
 http://localhost:3000/logs
Postman