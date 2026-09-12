const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const multer = require('multer');
const XLSX = require('xlsx');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'sam-pas.sqlite'));
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS profiles (id INTEGER PRIMARY KEY, name TEXT NOT NULL, mobile TEXT, department TEXT, class_name TEXT, role TEXT NOT NULL, password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS uploads (id INTEGER PRIMARY KEY AUTOINCREMENT, file_name TEXT NOT NULL, advisor_id INTEGER NOT NULL, student_count INTEGER NOT NULL, valid_row_count INTEGER NOT NULL, invalid_row_count INTEGER NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(advisor_id) REFERENCES profiles(id));
CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, student_name TEXT NOT NULL, parent_whatsapp_number TEXT NOT NULL, department TEXT NOT NULL, class_name TEXT NOT NULL, upload_id INTEGER NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(upload_id) REFERENCES uploads(id));
CREATE TABLE IF NOT EXISTS marks (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, subject_name TEXT NOT NULL, mark REAL NOT NULL, is_failed INTEGER NOT NULL, upload_id INTEGER NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(upload_id) REFERENCES uploads(id));
CREATE TABLE IF NOT EXISTS notification_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, upload_id INTEGER NOT NULL, recipient_number TEXT NOT NULL, message TEXT NOT NULL, failed_subject_count INTEGER NOT NULL, status TEXT NOT NULL, provider_message_id TEXT, provider_response TEXT, error_message TEXT, created_at TEXT NOT NULL, FOREIGN KEY(student_id) REFERENCES students(id), FOREIGN KEY(upload_id) REFERENCES uploads(id));
CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
const advisorPassword = process.env.ADVISOR_PASSWORD || 'demo-pass-123';
const existing = db.prepare('SELECT id FROM profiles WHERE mobile = ?').get('+91 7904166118');
if (!existing) db.prepare('INSERT INTO profiles (name,mobile,department,class_name,role,password_hash) VALUES (?,?,?,?,?,?)').run('Sree Devi', '+91 7904166118', 'CSE', 'D - 2nd Year', 'Class Advisor', bcrypt.hashSync(advisorPassword, 10));

const sessions = new Map();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, /\.xlsx?$|spreadsheetml|excel/i.test(file.originalname + file.mimetype)) });
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function now() { return new Date().toISOString(); }
function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return '91' + digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}
function auth(req, res, next) {
  const token = req.cookies.sam_session;
  const userId = token && sessions.get(token);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });
  req.user = db.prepare('SELECT id,name,mobile,department,class_name,role FROM profiles WHERE id = ?').get(userId);
  if (!req.user) return res.status(401).json({ error: 'Invalid session' });
  next();
}
function configured() { return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID); }
function testMode() { return String(process.env.TEST_MODE || 'true').toLowerCase() === 'true'; }
function approvedNumbers() { return String(process.env.APPROVED_TEST_NUMBERS || '').split(',').map(s => normalizePhone(s)).filter(Boolean); }
function publicPhone(n) { return n.length > 7 ? '+' + n.slice(0, 2) + ' ' + n.slice(2, 5) + ' XXX ' + n.slice(-2) : '+91 XXXXX'; }
function messageFor(name) { return `Dear Parent,\n\nYour son/daughter ${name} has failed in more than 3 subjects in the monthly internal assessment.\n\nWe kindly request you to come to the college and meet the Class Advisor regarding the student's academic performance.\n\nRegards,\nSree Devi\nClass Advisor, CSE D - 2nd Year`; }
function summarize(uploadId) {
  const students = db.prepare('SELECT * FROM students WHERE upload_id = ? ORDER BY id').all(uploadId);
  return students.map(s => { const marks = db.prepare('SELECT subject_name,mark,is_failed FROM marks WHERE student_id = ? ORDER BY id').all(s.id); const failed = marks.filter(m => m.is_failed); const log = db.prepare('SELECT status FROM notification_logs WHERE student_id = ? AND upload_id = ? ORDER BY id DESC LIMIT 1').get(s.id, uploadId); return { id:s.id, name:s.student_name, phone:s.parent_whatsapp_number, displayPhone:publicPhone(s.parent_whatsapp_number), marks, failedSubjects:failed.map(m=>m.subject_name), failedCount:failed.length, alert:failed.length >= 4, status:log?.status || null, message:messageFor(s.student_name) }; });
}

app.post('/api/login', (req,res) => { const { mobile, password } = req.body || {}; const user = db.prepare('SELECT * FROM profiles WHERE mobile = ?').get(mobile); if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) return res.status(401).json({ error:'Invalid advisor credentials' }); const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, user.id); res.cookie('sam_session', token, { httpOnly:true, sameSite:'lax', secure:false, maxAge: 8*60*60*1000 }); res.json({ user:{ name:user.name, role:user.role, department:user.department, className:user.class_name } }); });
app.post('/api/logout', (req,res) => { if(req.cookies.sam_session) sessions.delete(req.cookies.sam_session); res.clearCookie('sam_session'); res.json({ok:true}); });
app.get('/api/me', auth, (req,res) => res.json({ user: { name:req.user.name, role:req.user.role, department:req.user.department, className:req.user.class_name, mobile:req.user.mobile }, testMode:testMode(), providerConfigured:configured(), approvedNumbers:approvedNumbers().map(publicPhone) }));
app.get('/api/dashboard', auth, (req,res) => { const latest = db.prepare('SELECT * FROM uploads ORDER BY id DESC LIMIT 1').get(); const students = latest ? summarize(latest.id) : []; const logs = db.prepare('SELECT status,COUNT(*) count FROM notification_logs GROUP BY status').all(); const counts = Object.fromEntries(logs.map(x=>[x.status,x.count])); res.json({ latestUpload: latest ? { ...latest, created_at: latest.created_at } : null, students, stats:{ processed:students.length, alerts:students.filter(s=>s.alert).length, sent:counts.SENT||0, pending:counts.PENDING||0, failed:counts.FAILED||0 } }); });
app.post('/api/uploads', auth, upload.single('file'), (req,res) => { if (!req.file) return res.status(400).json({ error:'Please select an .xlsx or .xls file.' }); let rows; try { const wb=XLSX.read(req.file.buffer,{type:'buffer',cellDates:false}); const sheet=wb.Sheets[wb.SheetNames[0]]; rows=XLSX.utils.sheet_to_json(sheet,{defval:''}); } catch(e) { return res.status(400).json({error:'Could not parse the Excel file.'}); } if(!rows.length) return res.status(400).json({error:'The first worksheet is empty.'}); const keys=Object.keys(rows[0]); const findKey=(names)=>keys.find(k=>names.some(n=>k.trim().toLowerCase()===n.toLowerCase())) || keys.find(k=>names.some(n=>k.trim().toLowerCase().includes(n.toLowerCase()))); const nameKey=findKey(['Student Name','Student']); const phoneKey=findKey(['Parent WhatsApp Number','Parent WhatsApp','Parent Phone']); const ignored=[nameKey,phoneKey].filter(Boolean); const subjectKeys=keys.filter(k=>!ignored.includes(k)); if(!nameKey||!phoneKey||subjectKeys.length===0) return res.status(400).json({error:'Required columns: Student Name, Parent WhatsApp Number, and at least one subject mark column.'}); const invalid=[]; const valid=[]; rows.forEach((row,i)=>{ const rowNo=i+2; const name=String(row[nameKey]??'').trim(); const phone=normalizePhone(row[phoneKey]); const errors=[]; if(!name) errors.push('missing student name'); if(!phone) errors.push('missing/invalid parent WhatsApp number'); const parsed={}; subjectKeys.forEach(k=>{ const raw=row[k]; const mark=typeof raw==='number'?raw:Number(String(raw).trim()); if(String(raw).trim()==='' || !Number.isFinite(mark) || mark<0 || mark>100) errors.push(`${k} must be a number from 0 to 100`); else parsed[k]=mark; }); if(errors.length) invalid.push({row:rowNo,errors}); else valid.push({name,phone,marks:parsed}); }); if(!valid.length) return res.status(400).json({error:'No valid rows found.', summary:{studentsFound:rows.length,subjectsFound:subjectKeys.length,validRows:0,invalidRows:invalid.length,invalid}}); const tx=db.transaction(()=>{ const uploadId=db.prepare('INSERT INTO uploads (file_name,advisor_id,student_count,valid_row_count,invalid_row_count,created_at) VALUES (?,?,?,?,?,?)').run(req.file.originalname,req.user.id,rows.length,valid.length,invalid.length,now()).lastInsertRowid; const studentStmt=db.prepare('INSERT INTO students (student_name,parent_whatsapp_number,department,class_name,upload_id,created_at) VALUES (?,?,?,?,?,?)'); const markStmt=db.prepare('INSERT INTO marks (student_id,subject_name,mark,is_failed,upload_id,created_at) VALUES (?,?,?,?,?,?)'); valid.forEach(v=>{ const studentId=studentStmt.run(v.name,v.phone,req.user.department,req.user.class_name,uploadId,now()).lastInsertRowid; Object.entries(v.marks).forEach(([subject,mark])=>markStmt.run(studentId,subject,mark,mark<50?1:0,uploadId,now())); }); return uploadId; }); const uploadId=tx(); res.json({ uploadId, summary:{studentsFound:rows.length,subjectsFound:subjectKeys.length,validRows:valid.length,invalidRows:invalid.length,invalid}, students:summarize(uploadId) }); });
app.get('/api/uploads/:id/review', auth, (req,res)=>{ const u=db.prepare('SELECT * FROM uploads WHERE id=?').get(req.params.id); if(!u) return res.status(404).json({error:'Upload not found'}); res.json({upload:u,students:summarize(u.id), testMode:testMode(), providerConfigured:configured(), approvedNumbers:approvedNumbers().map(publicPhone)}); });
app.post('/api/uploads/:id/send', auth, async (req,res)=>{ const u=db.prepare('SELECT * FROM uploads WHERE id=?').get(req.params.id); if(!u) return res.status(404).json({error:'Upload not found'}); const students=summarize(u.id).filter(s=>s.alert); if(!students.length) return res.json({results:[]}); const results=[]; for(const s of students){ const existing=db.prepare('SELECT * FROM notification_logs WHERE student_id=? AND upload_id=? AND status="SENT"').get(s.id,u.id); if(existing){results.push({student:s.name,status:'ALREADY SENT'});continue;} let status='PENDING', providerResponse=''; let errorMessage=null; if(testMode() && !approvedNumbers().includes(s.phone)){ status='FAILED'; errorMessage='Test mode blocked this recipient. Add the number to APPROVED_TEST_NUMBERS.'; } else if(!configured()){ status='PENDING'; errorMessage='WhatsApp provider not configured.'; } else { try { const response=await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:s.phone,type:'text',text:{body:s.message}})}); providerResponse=await response.text(); if(!response.ok){status='FAILED';errorMessage=`WhatsApp API error (${response.status})`; } else status='SENT'; } catch(e){ status='FAILED'; errorMessage=e.message; } } const info=db.prepare('INSERT INTO notification_logs (student_id,upload_id,recipient_number,message,failed_subject_count,status,provider_message_id,provider_response,error_message,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(s.id,u.id,s.phone,s.message,s.failedCount,status,null,providerResponse,errorMessage,now()); results.push({student:s.name,recipient:publicPhone(s.phone),status,error:errorMessage,logId:info.lastInsertRowid}); } res.json({results}); });
app.get('/api/students', auth, (req,res)=>{ const u=db.prepare('SELECT id FROM uploads ORDER BY id DESC LIMIT 1').get(); res.json({students:u?summarize(u.id):[]}); });
app.get('/api/history', auth, (req,res)=>{ const status=req.query.status; const rows=db.prepare(`SELECT n.*,s.student_name FROM notification_logs n JOIN students s ON s.id=n.student_id ${status&&['PENDING','SENT','FAILED'].includes(status)?'WHERE n.status = ?':''} ORDER BY n.id DESC`).all(...(status&&['PENDING','SENT','FAILED'].includes(status)?[status]:[])); res.json({history:rows}); });
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,'0.0.0.0',()=>console.log(`SAM-PAS running on http://0.0.0.0:${PORT}`));
