# Evolution API Guidelines

Guideline ini menjadi pedoman developer untuk menggunakan Evolution API di Mocci CRM Dashboard.

Sumber utama:

- Evolution API OpenAPI version: `2.3.7`
- Instance docs: create, connect, connection state, logout, delete, fetch all, restart, set presence
- Message docs: send buttons/contact/list/location/media/poll/reaction/template/text
- Chat docs: archive, find chats/contacts/messages, mark read, profile update, check numbers
- Event docs: get webhook, set webhook

> Catatan: semua konfigurasi teknis Evolution API harus dikelola developer melalui environment variables atau deployment config. Jangan memindahkan API key, base URL, webhook URL, atau detail teknis lain ke UI non-teknikal.

## 1. Prinsip integrasi

1. **Gunakan wrapper server-side.** Semua call ke Evolution API harus lewat server code, bukan dari client component.
2. **Jangan expose `apikey`.** Header `apikey` hanya boleh dipakai di backend/server runtime.
3. **Satu instance utama per deployment.** Gunakan `EVOLUTION_INSTANCE_NAME` sebagai instance CRM utama.
4. **Anggap hanya state connected yang boleh menampilkan data CRM.** Untuk halaman Inbox, Contacts, dan Pipeline, tampilkan data hanya saat instance connected.
5. **Webhook adalah sumber sinkronisasi utama.** Inbox, Contacts, dan Pipeline harus diperbarui dari event webhook, bukan polling agresif dari UI.
6. **Logs teknis cukup di VPS/Vercel.** UI user cukup menampilkan status dan aksi sederhana seperti connect/reconnect.
7. **Normalisasi response.** Evolution API bisa mengembalikan field state/name di beberapa path. Wrapper harus toleran terhadap variasi shape response.

## 2. Environment variables

Gunakan env berikut:

```env
EVOLUTION_BASE_URL=https://your-evolution-api.example.com
EVOLUTION_API_KEY=...
EVOLUTION_INSTANCE_NAME=main
EVOLUTION_WEBHOOK_URL=https://your-app.example.com/api/webhooks/evolution
```

Aturan:

- `EVOLUTION_BASE_URL` tidak boleh memiliki trailing slash saat disimpan di config internal.
- `EVOLUTION_API_KEY` wajib dikirim sebagai header `apikey`.
- `EVOLUTION_INSTANCE_NAME` wajib di-trim sebelum dipakai di path URL.
- `EVOLUTION_WEBHOOK_URL` boleh diisi manual. Di Vercel, boleh fallback dari `VERCEL_URL` jika aman.
- Jangan log nilai env sensitif.

## 3. Authentication dan request format

Semua endpoint Evolution API menggunakan API key header:

```http
apikey: <EVOLUTION_API_KEY>
```

Untuk JSON request:

```http
Content-Type: application/json
```

Untuk file upload seperti media/profile picture, gunakan `multipart/form-data`. Jangan set `Content-Type` manual saat memakai `FormData`; biarkan runtime menambahkan boundary.

Error umum yang harus ditangani:

- `400`: request/body tidak valid
- `401`: API key salah atau hilang
- `403`: permission tidak cukup
- `404`: instance/resource tidak ditemukan
- `500`: error internal Evolution API

Pedoman handling:

- UI user: tampilkan pesan sederhana.
- Server logs: simpan detail endpoint/status/message tanpa membocorkan API key atau PII.
- Untuk bug Evolution tertentu yang sudah diketahui, tangani eksplisit di wrapper dan beri test regresi.

## 4. Instance lifecycle

### 4.1 Create Instance

Endpoint:

```http
POST /instance/create
```

Body minimum:

```json
{
  "instanceName": "main",
  "qrcode": true
}
```

Body opsional:

```json
{
  "integration": "WHATSAPP-BAILEYS",
  "token": "...",
  "number": "6281234567890",
  "webhook": {
    "enabled": true,
    "url": "https://app.example.com/api/webhooks/evolution",
    "events": ["MESSAGES_UPSERT"]
  }
}
```

Response penting:

- `instance.instanceName`
- `instance.instanceId`
- `instance.status`, contoh: `connecting`
- `qrcode.base64`
- `qrcode.code`
- `qrcode.pairingCode`
- `qrcode.count`

Pedoman:

- Gunakan saat instance belum ada.
- Jika `qrcode` tersedia, tampilkan QR di halaman settings/connect.
- Setelah create, pastikan webhook terpasang lewat Set Webhook.
- Jika create gagal karena state instance rusak, wrapper boleh melakukan delete lalu create ulang dengan hati-hati.

### 4.2 Connect Instance

Endpoint:

```http
GET /instance/connect/{instanceName}
```

Response penting:

- `base64`
- `code`
- `pairingCode`
- `count`

Pedoman:

- Gunakan untuk meminta QR/pairing code saat instance belum connected.
- Jangan loop connect agresif. Gunakan user action atau interval pendek terbatas.
- Setelah connect, cek state dengan Get Connection State atau Fetch All Instances.

### 4.3 Get Connection State

Endpoint:

```http
GET /instance/connectionState/{instanceName}
```

Response:

```json
{
  "instance": {
    "instanceName": "main",
    "state": "open"
  }
}
```

State resmi yang perlu ditangani:

- `open`: connected
- `connecting`: sedang proses
- `close`: disconnected

State tambahan yang harus tetap didukung karena variasi implementasi:

- `connected`: connected
- `connect`: connected
- unknown/missing: unknown

Pedoman:

- Helper `isConnectedState()` harus menganggap `open`, `connected`, dan `connect` sebagai connected.
- Halaman CRM data-heavy harus kosong saat state bukan connected.
- Jangan mengandalkan satu endpoint saja jika response production berbeda; fallback ke Fetch All Instances boleh dipakai.

### 4.4 Fetch All Instances

Endpoint:

```http
GET /instance/fetchInstances
```

Response: array instance.

Shape dapat bervariasi. Normalisasi nama dari beberapa kemungkinan:

- `name`
- `instanceName`
- `instance.instanceName`
- `instance.name`

Normalisasi state dari beberapa kemungkinan:

- `instance.state`
- `state`
- `connectionStatus.state`
- `status`

Pedoman:

- Gunakan untuk menemukan `EVOLUTION_INSTANCE_NAME` di list instance.
- Jika instance target tidak ditemukan, treat sebagai `no-instance`.
- Jika request gagal, treat sebagai `unknown`, bukan connected.

### 4.5 Logout / Disconnect Instance

Endpoint:

```http
DELETE /instance/logout/{instanceName}
```

Response sukses umum:

```json
{
  "success": true,
  "message": "Instance logged out successfully"
}
```

Pedoman:

- Gunakan untuk disconnect WhatsApp tanpa menghapus instance.
- Setelah logout, UI Contacts/Pipeline/Inbox harus tidak menampilkan data CRM aktif.
- Jangan otomatis delete setelah logout.

### 4.6 Delete Instance

Endpoint:

```http
DELETE /instance/delete/{instanceName}
```

Pedoman:

- Operasi destruktif. Butuh konfirmasi jika diekspos ke admin.
- Gunakan saat instance corrupt, salah konfigurasi, atau ingin reset total.
- Setelah delete, hapus/invalidasi state lokal terkait koneksi, tetapi jangan hapus CRM data historis tanpa requirement terpisah.

### 4.7 Restart Instance

Endpoint:

```http
POST /instance/restart/{instanceName}
```

Pedoman:

- Gunakan untuk recovery saat instance stuck.
- Setelah restart, cek connection state lagi.
- Jangan jadikan restart sebagai retry default untuk semua error.

### 4.8 Set Presence

Endpoint:

```http
POST /instance/setPresence/{instanceName}
```

Body:

```json
{
  "presence": "available"
}
```

Allowed values:

- `available`
- `unavailable`
- `composing`
- `recording`

Pedoman:

- Gunakan hanya untuk fitur yang benar-benar membutuhkan presence.
- Jangan spam `composing`/`recording` dari UI.

## 5. Webhook / Events

### 5.1 Set Webhook

Endpoint:

```http
POST /webhook/set/{instanceName}
```

Body:

```json
{
  "enabled": true,
  "url": "https://app.example.com/api/webhooks/evolution",
  "events": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
  "headers": {
    "x-webhook-secret": "optional-shared-secret"
  },
  "base64": false
}
```

Fields:

- `enabled`: aktif/nonaktif webhook
- `url`: endpoint aplikasi
- `events`: daftar event yang dikirim
- `headers`: header tambahan dari Evolution ke app
- `base64`: apakah payload media dikirim base64

Pedoman:

- Set webhook setelah create/connect instance.
- Untuk CRM ini, minimal event yang disarankan:
  - `MESSAGES_UPSERT` untuk pesan baru
  - `MESSAGES_UPDATE` atau event status untuk delivery/read status jika tersedia di deployment
  - `CONNECTION_UPDATE` jika tersedia untuk update state koneksi
- Gunakan URL publik HTTPS. Localhost tidak valid untuk production webhook.
- Jika `EVOLUTION_WEBHOOK_URL` masih localhost saat deploy Vercel, fallback ke `VERCEL_URL`.
- Validasi webhook inbound dengan shared secret jika memungkinkan.

### 5.2 Get Webhook

Endpoint:

```http
GET /webhook/find/{instanceName}
```

Response bisa `null` jika webhook belum dikonfigurasi.

Pedoman:

- Gunakan untuk audit/debug server-side.
- Jangan tampilkan detail webhook teknis ke user non-teknikal.

### 5.3 Inbound webhook handling

Aturan handler aplikasi:

1. Terima payload sebagai `unknown`.
2. Validasi event type dan struktur minimal.
3. Normalisasi remote JID, phone, group flag, message id, timestamp, direction.
4. Upsert conversation/contact/message secara idempotent.
5. Jangan gagal total jika satu field opsional hilang.
6. Log error teknis di server logs saja.
7. Jangan log isi pesan lengkap jika berisiko PII, kecuali untuk debug lokal yang disengaja.

## 6. Messages API

Semua endpoint message menggunakan path:

```http
POST /message/<action>/{instanceName}
```

Response umum:

```json
{
  "key": {},
  "message": {},
  "status": "..."
}
```

### 6.1 Send Text Message

Endpoint:

```http
POST /message/sendText/{instanceName}
```

Body:

```json
{
  "number": "6281234567890",
  "textMessage": {
    "text": "Halo, ada yang bisa kami bantu?"
  },
  "linkPreview": true,
  "mentioned": []
}
```

Required:

- `number`
- `textMessage.text`

Pedoman:

- Ini endpoint default untuk reply dari Inbox.
- Simpan optimistic message di UI, lalu rekonsiliasi dengan webhook/status update.
- Validasi nomor dengan format country code tanpa `+`.

### 6.2 Send Template Message

Endpoint:

```http
POST /message/sendTemplate/{instanceName}
```

Body minimal menurut spec:

```json
{
  "number": "6281234567890",
  "textMessage": {
    "text": "Template text"
  }
}
```

Pedoman:

- Gunakan untuk WhatsApp Business template jika deployment mendukung template.
- Pastikan template sudah approved di provider terkait.

### 6.3 Send Media Message

Endpoint:

```http
POST /message/sendMedia/{instanceName}
```

Content type: `multipart/form-data`

Required:

- `number`
- `mediatype`: `image`, `video`, `audio`, `document`
- `media`: file binary

Optional:

- `caption`
- `fileName`

Pedoman:

- Validasi tipe dan ukuran file sebelum upload.
- Jangan simpan media base64 besar di database aplikasi.
- Untuk dokumen, selalu isi `fileName`.

### 6.4 Send Buttons

Endpoint:

```http
POST /message/sendButtons/{instanceName}
```

Required:

- `number`
- `text`
- `footerText`
- `buttons[]`

Pedoman:

- Gunakan untuk quick actions sederhana.
- Sediakan fallback text jika client WhatsApp tidak mendukung button.

### 6.5 Send List

Endpoint:

```http
POST /message/sendList/{instanceName}
```

Required:

- `number`
- `title`
- `description`
- `buttonText`
- `sections[]`

Pedoman:

- Gunakan untuk pilihan yang lebih dari 3 item.
- Hindari list terlalu panjang.

### 6.6 Send Contact

Endpoint:

```http
POST /message/sendContact/{instanceName}
```

Required:

- `number`
- `contacts[]`

Pedoman:

- Gunakan untuk mengirim kartu kontak sales/support.
- Pastikan data kontak yang dikirim tidak berisi PII yang tidak perlu.

### 6.7 Send Location

Endpoint:

```http
POST /message/sendLocation/{instanceName}
```

Required:

- `number`
- `latitude`
- `longitude`

Optional:

- `name`
- `address`

Pedoman:

- Gunakan untuk alamat toko/kantor/cabang.
- Validasi koordinat.

### 6.8 Send Poll

Endpoint:

```http
POST /message/sendPoll/{instanceName}
```

Required:

- `number`
- `name`
- `selectableCount`
- `values[]`

Pedoman:

- Gunakan untuk voting/feedback ringan.
- Simpan hasil poll hanya jika webhook/message response mendukungnya.

### 6.9 Send Reaction

Endpoint:

```http
POST /message/sendReaction/{instanceName}
```

Required:

- `reactionKey`
- `reactionMessage`

Pedoman:

- Gunakan hanya jika app menyimpan key message asli.
- Jika key message tidak lengkap, jangan tampilkan aksi reaction.

## 7. Chat API

Semua endpoint chat menggunakan path:

```http
POST /chat/<action>/{instanceName}
```

kecuali jika docs menyebut berbeda.

### 7.1 Find Chats

Endpoint:

```http
POST /chat/findChats/{instanceName}
```

Body query opsional:

```json
{
  "where": {},
  "take": 20,
  "skip": 0,
  "orderBy": {}
}
```

Pedoman:

- Gunakan untuk backfill atau admin/server sync, bukan render utama setiap page load.
- Batasi pagination (`take`) agar tidak membebani Evolution API.

### 7.2 Find Contacts

Endpoint:

```http
POST /chat/findContacts/{instanceName}
```

Response item umum:

```json
{
  "id": "...",
  "pushName": "...",
  "number": "6281234567890",
  "profilePictureUrl": null
}
```

Pedoman:

- Gunakan untuk backfill contact list jika webhook belum cukup.
- Jangan overwrite nama manual user CRM tanpa aturan merge jelas.

### 7.3 Find Messages

Endpoint:

```http
POST /chat/findMessages/{instanceName}
```

Response:

```json
{
  "messages": {
    "total": 0,
    "pages": 0,
    "currentPage": 1,
    "records": []
  }
}
```

Pedoman:

- Gunakan untuk backfill conversation tertentu.
- Simpan message id dan upsert idempotent.
- Jangan fetch full history tanpa pagination dan batas waktu.

### 7.4 Archive Chat

Endpoint:

```http
POST /chat/archiveChat/{instanceName}
```

Required:

- `number`
- `archive`: boolean

Pedoman:

- Cocok untuk aksi admin/operator.
- Sinkronkan status lokal jika fitur archive dipakai.

### 7.5 Mark Message as Read

Endpoint:

```http
POST /chat/markMessageAsRead/{instanceName}
```

Required:

- `readMessages[]`

Pedoman:

- Gunakan setelah user membuka conversation.
- Pastikan payload berisi key message yang valid.
- Update unread count lokal secara optimistic, lalu koreksi dari webhook jika ada.

### 7.6 Update Profile

Endpoints:

```http
POST /chat/updateProfileName/{instanceName}
POST /chat/updateProfilePicture/{instanceName}
POST /chat/updateProfileStatus/{instanceName}
```

Required:

- Name: `name`
- Picture: multipart `file`
- Status: `status`

Pedoman:

- Ini fitur admin, bukan kebutuhan user CRM umum.
- Tambahkan konfirmasi sebelum mengubah profile WhatsApp bisnis.

### 7.7 Check WhatsApp Numbers

Endpoint:

```http
POST /chat/whatsappNumbers/{instanceName}
```

Required:

- `numbers[]`

Response:

```json
{
  "numbers": [
    {
      "number": "6281234567890",
      "exists": true
    }
  ]
}
```

Pedoman:

- Gunakan sebelum outbound campaign atau import kontak.
- Rate-limit request bulk.
- Jangan menjalankan check otomatis untuk seluruh database tanpa batching.

## 8. Data flow CRM yang direkomendasikan

### 8.1 Login/connect WhatsApp

1. Developer set env Evolution API.
2. User/admin membuka API Settings.
3. Server create/connect instance.
4. UI menampilkan QR/pairing code.
5. Setelah scan, server cek connection state.
6. Server set webhook.
7. Inbox, Contacts, Pipeline mulai menampilkan data setelah connected dan webhook masuk.

### 8.2 Incoming message

1. Evolution API mengirim webhook ke `/api/webhooks/evolution`.
2. Handler validasi payload.
3. Upsert contact.
4. Upsert conversation.
5. Insert/upsert message.
6. Auto-create pipeline item jika sesuai aturan CRM.
7. Publish event ke UI realtime jika tersedia.

### 8.3 Outgoing message

1. User kirim pesan dari Inbox.
2. Server validasi conversation/contact/phone.
3. Server cek WhatsApp connected.
4. Server call `POST /message/sendText/{instanceName}`.
5. UI tampilkan optimistic message.
6. Webhook/status update merekonsiliasi status final.

## 9. UI behavior untuk project ini

1. Jika WhatsApp belum connected:
   - Inbox: tampilkan empty/setup state.
   - Contacts: tampilkan info connect WhatsApp terlebih dahulu.
   - Pipeline: tampilkan info connect WhatsApp terlebih dahulu.
2. Jika WhatsApp disconnected/unknown:
   - Jangan tampilkan data CRM historis sebagai data aktif.
   - Arahkan user ke API Settings untuk reconnect.
3. Jangan tampilkan:
   - API base URL
   - API key
   - webhook URL
   - debug payload teknis
   - raw response Evolution API
4. Monitoring teknis dilakukan melalui logs VPS/Vercel.

## 10. Wrapper implementation rules

Semua Evolution API wrapper harus:

- menerima input typed object, bukan raw any dari UI;
- validate required fields sebelum request;
- encode `instanceName` saat masuk path URL;
- mengirim `apikey` header;
- parse JSON dengan aman;
- throw error typed/meaningful untuk server logs;
- tidak mengembalikan API key atau env ke caller;
- punya unit test untuk endpoint path, method, body, dan error khusus.

Contoh helper path:

```ts
function evolutionUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}
```

Contoh connected state:

```ts
export function isConnectedState(state: string) {
  const normalized = state.toLowerCase();
  return normalized === "open" || normalized === "connected" || normalized === "connect";
}
```

## 11. Testing checklist

Untuk perubahan Evolution API, wajib minimal:

- Unit test client/wrapper:
  - endpoint path benar
  - method benar
  - header `apikey` dikirim
  - body sesuai spec
  - response variant dinormalisasi
- Test state connection:
  - missing env -> `not-configured`
  - instance tidak ada -> `no-instance`
  - `open`/`connected`/`connect` -> connected
  - `close`/`connecting` -> disconnected/not ready
  - fetch error -> `unknown`
- Test webhook handler:
  - payload valid diproses
  - duplicate event idempotent
  - payload invalid tidak crash
  - PII/secrets tidak masuk logs
- Run:

```bash
npm run lint
npm run build
npm test
```

## 12. Security checklist

- Jangan expose `EVOLUTION_API_KEY` ke client.
- Jangan commit `.env`.
- Jangan log API key, QR raw code, full webhook payload berisi PII, atau isi pesan user di production logs.
- Gunakan webhook secret/header signature jika tersedia.
- Rate-limit endpoint internal yang memicu outbound WhatsApp.
- Validasi nomor telepon dan message text sebelum send.
- Jangan izinkan user umum menjalankan delete/logout/restart instance tanpa authorization admin.

## 13. Endpoint quick reference

### Instance

| Action | Method | Path | Notes |
| --- | --- | --- | --- |
| Create Instance | `POST` | `/instance/create` | Body `instanceName`; optional `qrcode`, `webhook` |
| Connect Instance | `GET` | `/instance/connect/{instanceName}` | Returns QR/pairing data |
| Get Connection State | `GET` | `/instance/connectionState/{instanceName}` | State `open`, `connecting`, `close` |
| Logout Instance | `DELETE` | `/instance/logout/{instanceName}` | Disconnect only |
| Delete Instance | `DELETE` | `/instance/delete/{instanceName}` | Destructive reset |
| Fetch All Instances | `GET` | `/instance/fetchInstances` | Normalize response shape |
| Restart Instance | `POST` | `/instance/restart/{instanceName}` | Recovery action |
| Set Presence | `POST` | `/instance/setPresence/{instanceName}` | `available`, `unavailable`, `composing`, `recording` |

### Messages

| Action | Method | Path | Required fields |
| --- | --- | --- | --- |
| Send Text | `POST` | `/message/sendText/{instanceName}` | `number`, `textMessage.text` |
| Send Template | `POST` | `/message/sendTemplate/{instanceName}` | `number`, `textMessage.text` per spec |
| Send Media | `POST` | `/message/sendMedia/{instanceName}` | `number`, `mediatype`, `media` |
| Send Buttons | `POST` | `/message/sendButtons/{instanceName}` | `number`, `buttons`, `text`, `footerText` |
| Send List | `POST` | `/message/sendList/{instanceName}` | `number`, `title`, `description`, `buttonText`, `sections` |
| Send Contact | `POST` | `/message/sendContact/{instanceName}` | `number`, `contacts` |
| Send Location | `POST` | `/message/sendLocation/{instanceName}` | `number`, `latitude`, `longitude` |
| Send Poll | `POST` | `/message/sendPoll/{instanceName}` | `number`, `name`, `selectableCount`, `values` |
| Send Reaction | `POST` | `/message/sendReaction/{instanceName}` | `reactionKey`, `reactionMessage` |

### Chat

| Action | Method | Path | Notes |
| --- | --- | --- | --- |
| Archive Chat | `POST` | `/chat/archiveChat/{instanceName}` | `number`, `archive` |
| Find Chats | `POST` | `/chat/findChats/{instanceName}` | Optional query object |
| Find Contacts | `POST` | `/chat/findContacts/{instanceName}` | Optional query object |
| Find Messages | `POST` | `/chat/findMessages/{instanceName}` | Optional query object, paginated response |
| Mark Message as Read | `POST` | `/chat/markMessageAsRead/{instanceName}` | `readMessages[]` |
| Update Profile Name | `POST` | `/chat/updateProfileName/{instanceName}` | `name` |
| Update Profile Picture | `POST` | `/chat/updateProfilePicture/{instanceName}` | multipart `file` |
| Update Profile Status | `POST` | `/chat/updateProfileStatus/{instanceName}` | `status` |
| Check WhatsApp Numbers | `POST` | `/chat/whatsappNumbers/{instanceName}` | `numbers[]` |

### Events

| Action | Method | Path | Notes |
| --- | --- | --- | --- |
| Get Webhook | `GET` | `/webhook/find/{instanceName}` | Returns config or `null` |
| Set Webhook | `POST` | `/webhook/set/{instanceName}` | `enabled`, `url`, `events`, optional `headers`, `base64` |

## 14. When to update this guideline

Update dokumen ini saat:

- Evolution API version berubah.
- Endpoint wrapper baru ditambahkan.
- Ada response shape baru dari production.
- Ada bug integration yang membutuhkan workaround.
- Event webhook baru dipakai oleh CRM.
