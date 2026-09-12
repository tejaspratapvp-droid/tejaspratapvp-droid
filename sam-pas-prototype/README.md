# SAM-PAS — Smart Academic Monitoring & Parent Alert System

A runnable MVP prototype for the Class Advisor workflow: upload monthly internal marks, validate rows, calculate failed subjects (`mark < 50`), review exact student-to-parent mappings, and record real WhatsApp Business Cloud API outcomes.

## Run locally

```bash
cp .env.example .env
npm install
npm start
```

Open `http://localhost:3000`.

Demo login:

- Mobile: `+91 7904166118`
- Password: `demo-pass-123` (set `ADVISOR_PASSWORD` in `.env` before first start)

## Excel format

The first worksheet must contain headers matching:

| Student Name | Parent WhatsApp Number | DBMS | OOPS | DSA | MATHS | DPCO |
|---|---|---:|---:|---:|---:|---:|
| Test Student 1 | 8838670562 | 45 | 40 | 35 | 42 | 38 |

Headers are detected dynamically. Every mark must be numeric from 0 to 100. A mark of exactly 50 is a pass. A parent alert is created only when a student has 4 or more failed subjects. Invalid rows are reported and never inserted as valid students.

## WhatsApp safety

This demo defaults to `TEST_MODE=true`, so only numbers in `APPROVED_TEST_NUMBERS` are allowed to reach the provider. The backend never exposes `WHATSAPP_ACCESS_TOKEN` to the browser. If provider credentials are absent, confirmation creates `PENDING` records rather than fake `SENT` results. If the provider returns an error, the record is `FAILED` with the stored error.

Configure only on an authorized server:

```env
TEST_MODE=true
APPROVED_TEST_NUMBERS=918838670562
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
```

The send endpoint performs server-side qualification and duplicate checks. The UI confirmation is intentionally explicit; WhatsApp messages are not sent immediately after upload.

## Included implementation

- Express backend with `helmet`, HTTP-only session cookie, bcrypt password hashing, SQLite relational persistence, and protected API routes.
- Excel parsing through SheetJS (`xlsx`) with header detection, phone normalization, row validation, and import summary.
- Dashboard, upload, student status, parent alert review, and notification history screens.
- Database tables: `profiles`, `students`, `marks`, `uploads`, `notification_logs`, `system_settings`.
- Official WhatsApp Business Cloud API call only; no WhatsApp Web automation.

This is a prototype for local demonstration. Before production use, move sessions to a durable store, add CSRF protection and rate limiting, use HTTPS/secure cookies, rotate secrets, configure a durable database, and complete Meta template-message/business verification requirements.
