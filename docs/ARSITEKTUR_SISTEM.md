# ARSITEKTUR SISTEM — STATUS TERKINI

## Sistem Kehadiran Real-Time (Face Recognition + Geolocation)

> Dokumen ini adalah **arsitektur aktual** (hasil implementasi + seluruh update yang sudah dilakukan).
> Dokumen `PART_01` s.d. `PART_17` sebelumnya adalah *spesifikasi desain awal*; dokumen ini menggantikannya sebagai sumber kebenaran kondisi terkini.

Terakhir diperbarui: 31 Juli 2026

---

# 1. RINGKASAN

Sistem kehadiran berbasis web untuk lingkungan sekolah/asrama, dengan:
- **Face Recognition** (verifikasi wajah 2x: saat check-in dan check-out)
- **Geolocation** (validasi radius lokasi absen)
- **JWT Authentication** + role-based access control
- **REST API** Laravel 12 di VPS
- **Frontend SPA** React + Vite di Vercel

URL produksi:
| Komponen | URL |
|---|---|
| Frontend | https://sistem-kehadiran.applab.my.id |
| Backend API | https://api.applab.my.id/api/v1 |
| Health check | https://api.applab.my.id/up |

---

# 2. ARSITEKTUR DEPLOYMENT

```
                           INTERNET
                               |
          +--------------------+--------------------+
          |                                         |
  https://sistem-kehadiran.applab.my.id     https://api.applab.my.id
          |                                         |
  +-------+--------+                      +----------v-----------+
  |     VERCEL     |     REST API (HTTPS) |         VPS          |
  |   React SPA    | -------------------> |  Ubuntu + Nginx      |
  |  (statis)      |                      |  PHP-FPM 8.2/8.3     |
  +----------------+                      |  Laravel 12          |
                                          |  MySQL               |
                                          |  Redis/DB Queue      |
                                          +----------+-----------+
                                                     |
                                                 MySQL DB
```

## 2.1 Hosting Aktual

| Layer | Rencana Awal (spek) | **Aktual** |
|---|---|---|
| Frontend | Vercel | **Vercel** (project `digital-projects1/frontend`) |
| Backend | Railway | **VPS Ubuntu + Nginx + PHP-FPM** |
| Database | Neon PostgreSQL | **MySQL** (di VPS) |
| Storage foto | Cloudinary | **Local storage / kolom LONG TEXT (base64)** di database |
| Realtime | Laravel Reverb WebSocket | **Polling** (React Query refetch); Reverb terpasang namun `BROADCAST_CONNECTION=null` dan frontend belum memakai Echo/WebSocket |
| Email | SMTP Gmail | **Log** (`MAIL_MAILER=log`) |
| Queue | Database queue | **Database queue** (`QUEUE_CONNECTION=database`) |

## 2.2 Repositori

| Repo | Remote | Isi |
|---|---|---|
| `frontend` | https://github.com/Jyd25/frontend.git | React SPA |
| `backend_absensi` | https://github.com/Jyd25/backend_absensi.git | Laravel API |

## 2.3 CI/CD (GitHub Actions)

| Workflow | Lokasi | Aksi |
|---|---|---|
| Deploy frontend | `frontend/.github/workflows/deploy.yml` | `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` |
| Deploy backend | `backend/.github/workflows/deploy.yml` | SSH `appleboy/ssh-action` ke VPS → `git pull`, `composer install`, `migrate`, cache, reload php-fpm + nginx |

Catatan: workflow backend mengacu ke direktori `/var/www/sistem-kehadiran` dan membutuhkan secret GitHub `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`, `VPS_PORT`. Deployment saat ini dilakukan manual via SSH ke `/var/www/absensi` — pastikan path pada workflow sesuai direktori aktual VPS sebelum dipakai.

## 2.4 Env Variable Vercel

- `VITE_API_URL` (Production) = `https://api.applab.my.id/api/v1`
- Wajib ada saat build. **Pelajaran penting (bug login 31 Jul 2026):** bila `VITE_API_URL` tidak ter-inject saat build, Vite memakai fallback `http://localhost:8000/api/v1` dari `src/lib/axios.ts`, sehingga login selalu gagal. Kini `frontend/.env.production` di-commit ke repo sebagai pengaman tambahan.

---

# 3. TEKNOLOGI

## 3.1 Frontend (`frontend/`)

- React 19 + Vite 8 + TypeScript (strict)
- TailwindCSS 4 (+ `@tailwindcss/vite`)
- UI kit sendiri (`src/components/ui/`) — Button, Card, Input, Badge, Modal, DataTable, dll.
- React Router 7, TanStack Query 5, Zustand 5, Axios
- React Hook Form + Zod
- Framer Motion, Sonner (toast), Recharts (dashboard)
- Leaflet + OpenStreetMap (map lokasi)
- @vladmandic/face-api (face recognition)
- jsPDF + autotable + XLSX (export)
- **Tidak memakai Laravel Echo / WebSocket** — data realtime via polling React Query

## 3.2 Backend (`backend/`)

- Laravel 12, PHP 8.x
- `php-open-source-saver/jwt-auth` (JWT)
- `spatie/laravel-permission` (role/permission)
- Repository Pattern + Service Layer
- Event/Listener + Queue database
- Reverb terkonfigurasi (`config/reverb.php`) tapi **tidak aktif** di produksi
- MySQL

## 3.3 Database

- Driver aktual: **MySQL**
- Queue: database
- Cache: database
- Session: database

---

# 4. STRUKTUR FRONTEND (AKTUAL)

```
frontend/src/
├── App.tsx                      # Routes + lazy loading + RootRedirect
├── main.tsx
├── components/
│   ├── attendance/PresensiModal.tsx   # Modal absen (check-in/out, face, GPS)
│   ├── layouts/
│   │   ├── AuthLayout.tsx
│   │   └── MainLayout.tsx             # Sidebar + role-based menu + absen popup
│   └── ui/                            # Button, Card, Input, Modal, Badge,
│                                      # DataTable, FaceThumbnail, ImagePreview,
│                                      # LocationMap, Logo, ProfileModal, RealTimeClock
├── hooks/
│   ├── useAuth.ts              # useLogin, useLogout, useProfile (React Query)
│   ├── useAttendanceReminder.ts
│   └── useFaceRecognition.ts   # deteksi wajah via face-api
├── lib/
│   ├── axios.ts                # instance axios + interceptor JWT + refresh
│   ├── geocode.ts              # reverse geocoding (Nominatim/OSM)
│   └── utils.ts                # formatTime, formatDate, formatDateFull, cn
├── pages/
│   ├── auth/LoginPage.tsx
│   ├── DashboardPage.tsx       # redesign Hero195 (recharts)
│   ├── attendance/AttendancePage.tsx + AttendanceListPage.tsx
│   ├── history/HistoryPage.tsx
│   ├── leaves/LeavePage.tsx    # izin/sakit/cuti + modal approve/reject
│   ├── corrections/CorrectionPage.tsx  # perbaikan kehadiran + modal approve
│   ├── face-requests/FaceUpdateRequestPage.tsx
│   ├── faces/, notifications/, profile/, reports/, settings/,
│   ├── employees/, departments/, positions/, schedules/, locations/, users/
│   └── NotFoundPage.tsx
├── services/                   # 1 service per modul (auth, attendance, face-geo,
│                               # leave-correction, report, export, dll.)
├── stores/useAuthStore.ts      # Zustand auth (token + user cache)
└── types/api.ts                # interface User, Employee, Attendance, dsb.
```

## 4.1 Alur Akses & Role (Sidebar `MainLayout`)

| Role | Menu |
|---|---|
| Administrator | Semua menu termasuk MANAJEMEN (Export, Karyawan, Departemen, Jabatan, Jadwal, Lokasi, Manajemen User) |
| Pimpinan | Dashboard, Kehadiran, Izin, Perbaikan, Update Wajah, Export, Riwayat, Notifikasi |
| Guru / Karyawan | Kehadiran, Izin, Perbaikan, Update Wajah, Riwayat, Notifikasi |
| Default route | Administrator/Pimpinan → `/dashboard`; Guru/Karyawan → `/attendance` |

## 4.2 Autentikasi Frontend (`stores/useAuthStore.ts` + `lib/axios.ts`)

- Token disimpan: `localStorage` (`access_token`, `refresh_token`), user di `sessionStorage` (`user_profile`).
- Interceptor request: sisipkan `Authorization: Bearer <access_token>`.
- Interceptor response: jika `401`, retry 1x memakai `refresh_token` via `POST /auth/refresh`; jika gagal, hapus token dan redirect `/login`.
- Cache user di sessionStorage supaya refresh halaman tidak spinner/blank.
- React Query di-clear saat login/logout.

---

# 5. STRUKTUR BACKEND (AKTUAL)

```
backend/app/
├── Http/
│   ├── Controllers/Api/V1/
│   │   ├── AuthController.php                 # login, logout, refresh, profile, me, check
│   │   ├── AttendanceController.php           # today, history, index, show, update, check-in/out
│   │   ├── AttendanceCorrectionController.php # index, store, approve, reject
│   │   ├── AttendanceLocationController.php
│   │   ├── LeaveController.php                # index, store, approve, reject, destroy
│   │   ├── DashboardController.php            # index, weekly, monthly
│   │   ├── EmployeeController.php / UserController.php
│   │   ├── DepartmentController.php / PositionController.php / WorkScheduleController.php
│   │   ├── FaceController.php                 # register, verify, history, destroy
│   │   ├── FaceUpdateRequestController.php    # index, store, approve, reject
│   │   ├── GeolocationController.php          # validate
│   │   ├── NotificationController.php
│   │   ├── ProfileController.php
│   │   ├── ExportController.php               # attendance (PDF/Excel)
│   │   └── ReportController.php               # daily, monthly, employee, department
│   ├── Middleware/
│   │   ├── AuthenticateJWT.php   ('jwt')
│   │   ├── CheckRole.php         ('role')
│   │   ├── CheckUserStatus.php   ('status')
│   │   ├── CorsMiddleware.php    ('cors')
│   │   └── LogRequest.php        ('log.request')
│   ├── Requests/, Resources/
├── Services/                 # Auth/, FaceRecognition/, Geolocation/, dll.
├── Repositories/             # BaseRepository + 1 repo per modul
├── Models/                   # User, Employee, Attendance, AttendanceCorrection,
│                             # LeaveRequest, FaceDataset, FaceUpdateRequest,
│                             # AttendanceLocation, WorkSchedule, Department, Position,
│                             # Notification, LoginLog, ApiLog, ActivityLog, dll.
├── Events/                   # AttendanceCreated, AttendanceCheckedOut, LoginFailed,
│                             # NotificationCreated, PasswordChanged, UserLoggedIn, dll.
├── Listeners/                # AttendanceListener, DashboardListener, NotificationListener, dll.
├── Enums/                    # AttendanceStatus, AttendanceType, UserStatus, UserRole, dll.
├── Traits/                   # ApiResponse, SendsNotifications
├── Jobs/, Policies/, Providers/, Connectors/, Interfaces/
```

## 5.1 Middleware & Route

`bootstrap/app.php`:
- Alias: `jwt`, `role`, `status`, `log.request`, `cors`
- API global (prepend): `CorsMiddleware` + `LogRequest`
- Route file: `routes/auth.php` (login publik) + `routes/api.php` (semua `jwt, status`)

## 5.2 API Endpoint (Aktual)

**Publik (`routes/auth.php`)** — prefix `v1/auth`
- `POST /login`, `POST /forgot-password`, `POST /reset-password`

**Terproteksi (`routes/auth.php`)** — middleware `jwt, status`
- `POST /logout`, `POST /refresh`, `GET /profile`, `PUT /change-password`, `PUT /profile`, `GET /me`, `GET /check`

**Terproteksi (`routes/api.php`)** — prefix `v1`
- Dashboard: `GET /dashboard`, `GET /dashboard/weekly`, `GET /dashboard/monthly`
- Notifications: `GET /notifications`, `POST /notifications/mark-all-read`, `GET /notifications/unread-count`, `PATCH /notifications/{id}/read`
- Reports: `GET /reports/daily`, `/monthly`, `/employee`, `/department`
- Attendances: `GET /attendances`, `GET /attendances/today`, `GET /attendances/history`, `GET/PUT /attendances/{id}`, `POST /attendances/check-in`, `POST /attendances/check-out`
- Faces: `POST /faces/register`, `POST /faces/verify`, `GET /faces/history`, `DELETE /faces/{id}`
- Geolocation: `POST /geolocation/validate`
- Leaves: `GET/POST /leaves`, `POST /leaves/{id}/approve`, `POST /leaves/{id}/reject`, `DELETE /leaves/{id}`
- Corrections: `GET/POST /corrections`, `POST /corrections/{id}/approve`, `POST /corrections/{id}/reject`
- Export: `GET /export/attendance`
- Face update requests: `GET/POST /face-update-requests`, `POST /face-update-requests/{id}/approve`, `POST /face-update-requests/{id}/reject`
- Resource CRUD: `departments`, `positions`, `schedules`, `locations`, `employees`, `users`, `GET /roles`

Format respons seragam (`Traits/ApiResponse`):
```json
{ "success": true, "message": "...", "data": {} }
```

## 5.3 Skema Database (migrasi aktual)

Tables utama: `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `departments`, `positions`, `work_schedules`, `attendance_locations`, `employees`, `users`, `face_datasets`, `attendances`, `attendance_histories`, `attendance_processes`, `notifications`, `login_logs`, `api_logs`, `activity_logs`, `leave_requests`, `attendance_corrections`, `face_update_requests`.

Field penting yang ditambahkan lewat update:
- `work_schedules`: `saturday_start_time`, `saturday_end_time` (jadwal Sabtu)
- `positions`: `role_id` (role default dari jabatan)
- `face_datasets`: descriptor + foto disimpan sebagai TEXT/LONG TEXT (base64)
- `attendances`: `address`, `checkin_photo_data`, `checkout_photo_data`, `status_checkout`, `checkout_address` (foto check-in/out terpisah)
- `employees.photo` → LONG TEXT (base64)

---

# 6. ALUR AUTENTIKASI (JWT)

1. `POST /api/v1/auth/login` dengan `{email, password}` (FormRequest `LoginRequest`).
2. Service `AuthService::login()`:
   - cek user by email + `Hash::check`
   - cek status user aktif
   - `JWTAuth::attempt($credentials)` → token
   - simpan `LoginLog` (sukses/gagal), dispatch event
   - load `role`, `employee.department`, `employee.position`, `employee.schedule`
3. Respons berisi **`user` (lengkap dengan role & employee) + `token`**:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { "id": 1, "name": "...", "email": "...", "role": {...}, "employee": {...}, "status": "active" },
    "token": { "access_token": "...", "refresh_token": "...", "expires_in": 3600, "token_type": "Bearer" }
  }
}
```
4. Token JWT berisi klaim kustom: `role`, `employee_id`, `status`.
5. Middleware `AuthenticateJWT` memvalidasi token; `CheckUserStatus` memastikan user aktif.
6. `POST /auth/refresh` memperbarui token (frontend memakai `refresh_token` sebagai Bearer).
7. `POST /auth/logout` menginvalidasi token.

> **Catatan bug yang pernah terjadi:** kontrak `user` + `token` ini wajib dijaga — frontend (`useAuth.ts` `onSuccess`) membaca `data.user` dan `data.token.access_token`/`refresh_token`. Jika salah satu hilang, login tampak "gagal".

---

# 7. ALUR KEHADIRAN

## 7.1 Check-In
1. User klik tombol Absen → izin kamera & GPS diminta lebih dulu (agar prompt muncul saat klik).
2. `useFaceRecognition` memuat model face-api dan **verifikasi wajah #1**.
3. `POST /geolocation/validate` → validasi radius dari lokasi terdekat.
4. `POST /attendances/check-in` → hitung status (`present`/`late`) dari jadwal + toleransi; simpan foto, koordinat, alamat.
5. Dispatch `AttendanceCreated` → queue → listener → simpan history + notifikasi + (broadcast kalau diaktifkan).

## 7.2 Check-Out
- Verifikasi wajah **#2**, `POST /attendances/check-out`, foto checkout terpisah, hitung `status_checkout` (Pulang Cepat / Tepat Waktu).

## 7.3 Status Waktu (dinamis, bukan hardcode)
- Waktu check-in/out mengikuti `work_schedules` (`start_time`, `saturday_start_time`, `tolerance_minutes`, `break_*`).
- Terlambat = check-in melewati `start + tolerance`.

## 7.4 Izin / Sakit / Cuti (`LeaveRequest`)
- User mengajukan izin; admin/pimpinan **approve/reject**.
- Saat disetujui, sistem membuat/mengaitkan record `attendances` untuk tanggal tersebut.

## 7.5 Perbaikan Kehadiran (`AttendanceCorrection`)
- User mengajukan koreksi jam (check-in/check-out kosong/tidak valid) + alasan.
- Admin **approve** → update atau buat attendance, admin bisa **override jam** check-in/check-out.
- Normalisasi waktu `HH:mm:ss` → `HH:mm` sebelum digabung tanggal.
- Status ulang dihitung ulang (`recalculateAttendanceStatus`) dari jadwal + toleransi.

## 7.6 Update Wajah (`FaceUpdateRequest`)
- User meminta pembaruan data wajah; admin approve/reject.

---

# 8. FACE RECOGNITION & GEOLOCATION

## 8.1 Face
- Library: `@vladmandic/face-api` (frontend), model di folder `public/models`.
- Flow: deteksi wajah → descriptor 128-d → bandingkan dengan dataset tersimpan → threshold.
- Dataset & foto disimpan sebagai **base64** di kolom TEXT/LONG TEXT (bukan file/Cloudinary) karena keterbatasan hosting.

## 8.2 Geolocation
- HTML5 Geolocation API → lat/long.
- Reverse geocode via Nominatim/OpenStreetMap untuk menampilkan alamat.
- `POST /geolocation/validate` → hitung jarak terhadap `attendance_locations` dan validasi radius.
- Leaflet map menampilkan posisi & radius.

---

# 9. DASHBOARD, LAPORAN, NOTIFIKASI

- **Dashboard** (`DashboardPage`): statistik harian/mingguan/bulanan (Recharts), jam kerja dari API, jam realtime, badge "WebSocket: online" (statis).
- **Laporan**: `ExportPage` (PDF via jsPDF + Excel via XLSX) dengan fetch data terpisah dari generate; filter tanggal/bulan; batasi per role.
- **Notifikasi**: bell + unread count (polling 30s), center, mark all read. Backend `NotificationService` + trait `SendsNotifications`.

---

# 10. LOG & KEAMANAN

- `LogRequest` mencatat request/response API ke `api_logs`.
- `LoginLog` mencatat sukses/gagal login (IP, user agent).
- `ActivityLog` untuk aktivitas penting.
- Middleware `CorsMiddleware` mengizinkan origin frontend, method + header umum, `OPTIONS` langsung 200.
- JWT blacklist/refresh, hashing password (bcrypt), validasi FormRequest, `APP_DEBUG=false` di produksi.

---

# 11. CHANGELOG — SEMUA UPDATE YANG SUDAH DILAKUKAN

## 11.1 Backend (`Jyd25/backend_absensi`)
| Commit | Isi |
|---|---|
| `7b89f7e` | Normalisasi `HH:mm:ss`→`HH:mm` sebelum gabung tanggal; hapus kode duplikat (AttendanceCorrection approve) |
| `a0e2dfb` | Approve correction selalu update/buat attendance; perbaiki format date untuk Carbon cast |
| `ef118a2` | Workflow deploy VPS via SSH (GitHub Actions) |
| `8330c03` | Admin bisa override jam check-in/check-out saat approve correction |
| `54f8277` | Tambah `saturday_start_time`/`saturday_end_time` ke WorkSchedule Resource & Requests |
| `1bb0611` | Alur correction: handle check-in/check-out independen, status dihitung ulang; leave disetujui → buat attendance; format waktu `HH:mm` seragam |
| `5261cae` | Perbaiki `EmployeeService::update()` pass `\` not `\` ke `findOrFail()` |
| `d539ffd` | Dashboard mengembalikan `presensi_deadline` (start+tolerance), break, hari kerja, nama jadwal |
| `220b912` | Waktu berbasis jadwal (bukan hardcode 03:00/10:00/16:00/12:00) |
| `9f0543a` | Format start/end time `H:i` di respons dashboard |
| `fd32b2e` | Filter tanggal export; enum face_status; kolom `status_checkout` + `checkout_address` |
| `1058b28` | Validasi rentang waktu check-in; dispatch `AttendanceCreated`; search attendance index |
| `8a69d6a` | `EmployeeResource.photo_data` fallback untuk avatar |
| `0ca9742` | Penyimpanan foto check-in/check-out terpisah (`checkin_photo_data`, `checkout_photo_data`) |
| `18dec97` | ProfileController dibungkus `UserResource` agar `employee.photo` konsisten |
| `a3f82d6` | Alur check-in/check-out benar dengan 2x verifikasi wajah |
| `1ac4137` | Face history pakai `FaceDatasetResource`; admin edit attendance; kalender data sendiri |
| `ea55f53` | Tambah alamat ke attendance; hapus batas <5 jam; simpan alamat asli dari GPS |
| `806f018` | Tabel kehadiran bulanan dengan koreksi inline; filter bulan/tahun |
| `b55b93b` | Akses berbasis role: approve/reject khusus admin, pimpinan view-only |
| `bd52a05` | Batasi visibilitas attendance; dashboard akses Pimpinan; foto LONG TEXT |
| `4e2e11d` | Stop simpan base64 di kolom VARCHAR; perbaiki null check_in_time |
| `e869117` | Presensi terlambat = check-in kosong, auto check-out, admin bisa edit jam masuk |
| `6f3af98` | Check-in setelah 10:00 → auto checkout + status late |
| `c75a9f2` | Tambah alamat ke `AttendanceResource` |
| `148506c` | (Initial) Full Realtime Attendance System |

## 11.2 Frontend (`Jyd25/frontend`)
| Commit | Isi |
|---|---|
| `0be41a8` | Track `.env.production` (VITE_API_URL) agar build Vercel selalu benar |
| `22fcafa` | Tambah `onError` handler pada mutation approve |
| `101066a` | Workflow deploy Vercel (GitHub Actions) |
| `bbcdbe3` | Util `formatDate`; modal approve leave & correction dengan jam editable |
| `f45564b` | Rapi field birth; ExportPage pisah fetch & generate; tipe WorkSchedule lengkap |
| `3dc0499` | `formatTime` tangani mikrosekon (`.000000Z`); semua tampilan waktu pakai util |
| `6f5e869` | Cache user di sessionStorage; tangani error fetch profile; logout langsung redirect |
| `2288979` | Minta izin GPS sebelum kamera agar prompt muncul saat klik |
| `00c92f6` | Util `formatTime`/`formatDateFull` dipakai semua halaman (hapus duplikasi) |
| `a7ee786` | Auto-start kamera update wajah; dashboard jam kerja tampil lengkap; auto-assign role dari jabatan |
| `c6eae8a` | Clear React Query cache saat login/logout; guard profile sync |
| `12f4716` | Gender select `male/female` (sesuai backend) |
| `2dd5f01` | PresensiModal + Dashboard pakai jam presensi dari API (jadwal) |
| `499d062` | Perbaiki avatar race condition, stale closure, export, realtime clock, `checkout_address` |
| `79c5a33` | Pembatasan jam UI, search nama, export PDF/Excel |
| `a235614` | Redesign dashboard (Hero195) dengan recharts + komponen Card |
| `3c30c4e` | Thumbnail verifikasi wajah check-in/out + preview modal |
| `71b1b2f` | Sinkron avatar via profileData; tombol absen 03:00-10:00 check-in, 10:00+ check-out |
| `0696b27` | Alur check-in/check-out dengan 2x verifikasi wajah |
| `00a8f58` | Fallback tampilan foto wajah; admin edit attendance; kalender data sendiri |
| `d8343a4` | Foto wajah dengan border; tampil alamat; setelah 10:00 tombol = Check-Out |
| `17fa793` | Kalender + tabel kehadiran bulanan; modal presensi; koreksi inline; sidebar pimpinan |
| `f213979` | Sidebar Pimpinan: Export, Riwayat, Notifikasi |
| `37acf23` | Batasi daftar kehadiran staf; sembunyikan filter dept/status & kolom karyawan |
| `919b18d` | Pesan yang benar untuk presensi terlambat (tanpa bahasa auto checkin/out) |

## 11.3 Perbaikan Khusus (31 Juli 2026)

### Bug Login "Gagal"
- **Gejala:** login selalu menampilkan toast "Login gagal" padahal kredensial benar.
- **Akar masalah:** `VITE_API_URL` pada Vercel (tersimpan sebagai *sensitive*, nilainya tidak pernah ter-inject) → bundle ter-build memakai fallback `http://localhost:8000/api/v1` → browser memanggil localhost → network error.
- **Verifikasi:** isi bundle lama = `baseURL:\`http://localhost:8000/api/v1\``.
- **Perbaikan:**
  1. `vercel env rm VITE_API_URL production`
  2. `vercel env add VITE_API_URL production` = `https://api.applab.my.id/api/v1`
  3. `vercel --prod` (redeploy)
  4. Verifikasi bundle baru = `baseURL:\`https://api.applab.my.id/api/v1\``
  5. `.env.production` di-commit sebagai pengaman; `.env.local` dibersihkan dari `[SENSITIVE]`.
- **Bukti:** `POST /api/v1/auth/login` (jayadi@scr.sch.id) → HTTP 200 berisi `user` + `token`.

---

# 12. CATATAN PENTING & OPERASIONAL

1. **Jangan hapus `user` dari respons login** — kontrak frontend bergantung padanya.
2. **`VITE_API_URL` wajib benar di Vercel** dan `.env.production` (sudah di-commit).
3. **WebSocket/Reverb belum terhubung** ke frontend; dashboard & notifikasi memakai polling. Bila ingin realtime penuh, perlu: aktifkan `BROADCAST_CONNECTION=reverb`, jalankan `php artisan reverb:start` di VPS, pasang `laravel-echo` di frontend.
4. **Path deploy workflow backend** (`/var/www/sistem-kehadiran`) harus disamakan dengan direktori aktual VPS (`/var/www/absensi`?) dan secret `VPS_*` harus diisi di GitHub agar CI/CD berjalan.
5. Foto wajah & attendance disimpan sebagai **base64 di DB** — pantau ukuran tabel `face_datasets` dan `attendances` (bisa besar).
6. Queue memakai database — pastikan worker jalan (`php artisan queue:work` / supervisor).
7. Proyek dipakai untuk **skripsi** (undergraduate thesis): dokumentasi PART_* tetap tersedia sebagai bahan desain/spek.

---

# 13. LANGKAH VERIFIKASI & TEST

| Cek | Perintah / URL |
|---|---|
| Backend hidup | `GET https://api.applab.my.id/up` → 200 |
| Login API | `POST https://api.applab.my.id/api/v1/auth/login` → 200 + user/token |
| Frontend hidup | `GET https://sistem-kehadiran.applab.my.id` → 200 |
| Bundle URL benar | Cari `baseURL` di asset JS produksi → harus `https://api.applab.my.id/api/v1` |
| Deploy backend | `git push origin main` di `backend/` (workflow SSH) |
| Deploy frontend | `git push origin main` di `frontend/` (Vercel) atau `vercel --prod` |
