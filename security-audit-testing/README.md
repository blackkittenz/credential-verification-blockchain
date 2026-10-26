# MODUL AUDIT KEAMANAN & PENGUJIAN OTOMATIS (PROJECT 2 & 3)
**Mata Kuliah: Blockchain (KP70067008) — Universitas Siliwangi**  
**Dosen Pengampu: Dr. Ir. Nur Widiyasono, M.Kom.**  
**Penanggung Jawab / Auditor:** Friza Tri Maulana (NPM: 237006125) — *Security Auditor & QA Engineer*

---

## 📌 Ringkasan Modul
Folder ini memuat seluruh artefak teknis, skrip otomasi pengujian, laporan formal, log eksekusi CLI, dan bukti tangkapan layar asli untuk pemenuhan dua komponen utama UAS:
1. **Project 2: Testing, Debugging, Deployment, dan Integrasi (Bobot 20 Poin)**
2. **Project 3: Security Audit dan Perbaikan Smart Contract (Bobot 25 Poin)**

Seluruh pengujian dijalankan secara riil pada node blockchain lokal Hardhat (Chain ID: `31337`) di server VPS 1 (`151.243.222.93:8545`) dan dapat diverifikasi ulang secara deterministik (*100% reproducible*).

---

## 📁 Struktur Berkas

```text
security-audit-testing/
├── Security_Audit.pdf                 <- Laporan Formal Security Audit (7 Halaman, Format Akademik)
├── CredentialVerification.test.ts     <- Test Suite Otomatis 18 Kasus Uji (Mocha & Chai / Hardhat)
├── debug_failure_demo.ts              <- Skrip Demonstrasi 4-Fase Debugging Kasus Transaksi Gagal
├── audit_7_gates_cli.ts               <- Skrip Audit Statis & Verifikasi 7 Gerbang Keamanan
├── security_audit_execution.log       <- Log Mentah Eksekusi CLI Terminal di Server VPS
├── evidence/                          <- Bukti Visual Tangkapan Layar Asli Console CLI (Spectacle OS)
│   ├── B01_hardhat_test_suite_18_passing.png    <- Bukti [B-01]: 18 Skenario Uji Passing 100%
│   ├── B02_debugging_failure_remediation.png    <- Bukti [B-02]: 4 Fase Debugging & Root Cause Analysis
│   └── B03_security_audit_7_gates.png           <- Bukti [B-03]: Verifikasi Remediasi 7 Celah Keamanan
└── README.md                          <- Dokumentasi teknis modul audit dan pengujian
```

---

## 🧪 1. Tabel Hasil Pengujian Otomatis (Project 2 — Subbab 5.2 Laporan)
Sebanyak 18 skenario uji otomatis (*test cases*) dirancang untuk memverifikasi seluruh kemungkinan kondisi transaksi:

| ID Tes | Skenario Pengujian (Positif/Negatif/Batas/Akses) | Ekspektasi Sistem | Hasil | Bukti |
| :---: | :--- | :--- | :---: | :---: |
| **T-01** | Admin mendaftarkan Fakultas Teknik sebagai Authorized Issuer | Mapping `authorizedIssuers` bernilai `true` | **Lulus** | `[B-01]` |
| **T-02** | Akun penyerang mencoba mendaftarkan issuer liar | Transaksi revert dengan custom error `NotAdmin()` | **Lulus** | `[B-01]` |
| **T-03** | Admin mendaftarkan Fakultas Ekonomi untuk uji lintas-fakultas | Mapping `authorizedIssuers` bernilai `true` | **Lulus** | `[B-01]` |
| **T-04** | Mahasiswa / pihak luar mencoba menerbitkan ijazah | Transaksi revert dengan `NotAuthorizedIssuer()` | **Lulus** | `[B-01]` |
| **T-05** | Penerbitan ijazah dengan ID kosong (`bytes32(0)`) | Transaksi revert dengan `EmptyString()` | **Lulus** | `[B-01]` |
| **T-06** | Penerbitan ijazah dengan hash kosong (`bytes32(0)`) | Transaksi revert dengan `ZeroHash()` | **Lulus** | `[B-01]` |
| **T-07** | Penerbitan dengan tanggal kedaluwarsa di masa lampau | Transaksi revert dengan `InvalidValidityPeriod()` | **Lulus** | `[B-01]` |
| **T-08** | Penerbitan ijazah otentik seumur hidup (`validUntil = 0`) | Transaksi ditambang & event `CredentialIssued` terpancar | **Lulus** | `[B-01]` |
| **T-09** | Percobaan duplikasi penerbitan dengan ID yang sama | Transaksi revert dengan `CredentialAlreadyExists()` | **Lulus** | `[B-01]` |
| **T-10** | Verifikasi ijazah otentik oleh Verifikator / HRD | Status `VALID` (Kode 0) dengan 0 Gas Fee | **Lulus** | `[B-01]` |
| **T-11** | Verifikasi berkas PDF yang dimanipulasi isi nilainya | Status `HASH_MISMATCH` (Kode 1, Avalanche Effect) | **Lulus** | `[B-01]` |
| **T-12** | Pencarian nomor ijazah fiktif yang tidak pernah terbit | Status `NOT_FOUND` (Kode 5) | **Lulus** | `[B-01]` |
| **T-13** | Penerbitan kredensial pelatihan dengan masa berlaku relatif | Transaksi ditambang dengan timestamp `validUntil` di masa depan | **Lulus** | `[B-01]` |
| **T-14** | Verifikasi setelah waktu kedaluwarsa lewat (*EVM time increase*) | Status otomatis berubah menjadi `EXPIRED` (Kode 3) | **Lulus** | `[B-01]` |
| **T-15** | Fakultas Ekonomi mencoba mencabut ijazah Fakultas Teknik | Transaksi revert dengan `NotIssuingAuthority()` | **Lulus** | `[B-01]` |
| **T-16** | Fakultas Teknik mencabut ijazah sah karena sanksi plagiarisme | Status berubah menjadi `REVOKED` (Kode 2) | **Lulus** | `[B-01]` |
| **T-17** | Ralat salah ketik nama: Ijazah lama diralat dan digantikan | Ijazah lama `SUPERSEDED` (Kode 4), ijazah baru `ACTIVE` (Kode 0) | **Lulus** | `[B-01]` |
| **T-18** | Audit integritas penyimpanan buku besar on-chain | Terbukti Zero PII (tidak ada nama/NIK di storage ledger) | **Lulus** | `[B-01]` |

*Tingkat Kelulusan: **18 / 18 Passing (100.0%)**.*

---

## 🛠️ 2. Demonstrasi 4-Fase Debugging Kasus Gagal (Project 2)
Sesuai instrumen penilaian OBE Project 2, proses debugging pada kondisi kegagalan transaksi dibuktikan melalui 4 fase berurutan:
1. **Fase 1 (Simulasi Revert):** Akun liar (`0x7099...79C8` yang belum terdaftar) memanggil `issueCredential()`. Transaksi gagal dan mengalami revert dengan custom error `NotAuthorizedIssuer()`.
2. **Fase 2 (Root Cause Analysis):** Pelacakan stack trace error membuktikan bahwa mapping `authorizedIssuers[msg.sender]` bernilai `false`. Modifier `onlyAuthorizedIssuer()` membatalkan perubahan state guna mencegah injeksi kredensial palsu.
3. **Fase 3 (Remediasi Administratif):** Akun Admin Rektorat memanggil `registerIssuer(0x7099...79C8, "Unit Layanan Terpadu UNSIL")`. Transaksi otorisasi berhasil ditambang pada blok `#50`.
4. **Fase 4 (Retest & Verifikasi):** Akun yang telah terdaftar memanggil ulang `issueCredential()`. Transaksi berhasil ditambang pada blok `#51` (Gas: 201.172, Status `VALID`). Bukti terdokumentasi pada `[B-02]`.

---

## 🛡️ 3. Tabel Matriks Audit 7 Celah Keamanan (Project 3 — Subbab 5.3 Laporan)

| ID Temuan | Aspek Keamanan | Tingkat Risiko | Akar Masalah (V1 Sebelum Audit) | Tindakan Mitigasi Kode (V2 Hasil Audit) | Status Retest |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **A-01** | Reentrancy Risk | **HIGH** | Ketiadaan mutex lock pada fungsi mutasi state penerbitan dan pencabutan. | Menerapkan modifier `nonReentrant` dengan boolean lock `_locked` sesuai standar CEI. | **PASS** `[B-03]` |
| **A-02** | Access Control Flaw | **CRITICAL** | Fungsi `revokeCredential` tidak memeriksa apakah pemanggil adalah penerbit aslinya. | Menambahkan *Strict Ownership Guard*: `if (_credentials[id].issuerAddress != msg.sender) revert NotIssuingAuthority();`. | **PASS** `[B-03]` |
| **A-03** | Front-Running / Ordering | **MEDIUM** | Risiko pihak ketiga menyerobot ID ijazah pada antrean mempool dengan gas fee lebih tinggi. | Pemisahan peran admin pendaftar dan issuer, serta validasi atomik `CredentialAlreadyExists(_id)`. | **PASS** `[B-03]` |
| **A-04** | Denial of Service (DoS Gas) | **HIGH** | Potensi kehabisan batas gas blok (*gas limit exhaustion*) akibat perulangan array linier $O(N)$. | Menghapus seluruh array dinamis; migrasi total ke **$O(1)$ Direct Mapping** (`mapping(bytes32 => Credential)`). | **PASS** `[B-03]` |
| **A-05** | Input Validation & Boundary | **MEDIUM** | Parameter ID kosong (`bytes32(0)`), zero hash, dan tanggal masa lampau dapat lolos. | Sanitasi batas ketat: memicu revert `EmptyString()`, `ZeroHash()`, dan `InvalidValidityPeriod()`. | **PASS** `[B-03]` |
| **A-06** | Error Handling & Gas Limit | **LOW** | Penggunaan `require(kondisi, "string")` memboroskan deployment bytecode dan runtime revert gas. | Mengimplementasikan **10 Solidity Custom Errors** (Solidity 0.8.24), mereduksi bytecode ~18% dan gas ~40%. | **PASS** `[B-03]` |
| **A-07** | Oracle & Privacy Risk | **CRITICAL** | Kerentanan manipulasi oracle pihak ketiga dan pelanggaran hukum privasi jika data PII dicatat on-chain. | **Zero Oracle Dependency** (deterministik) + **Zero PII On-Chain** mematuhi UU PDP No. 27 Tahun 2022 (*Right to be Forgotten*). | **PASS** `[B-03]` |

---

## 💻 4. Panduan Menjalankan Ulang Pengujian (Reproducibility Guide)

Untuk menjalankan ulang seluruh pengujian otomatis di lingkungan lokal:

### 1. Masuk ke Lingkungan Node Blockchain
```bash
cd /opt/blockchain-local
```

### 2. Jalankan Automated Unit Test Suite (18 Kasus Uji)
```bash
npx hardhat run scripts/run_audit_tests.ts --network localhost
```

### 3. Jalankan Demonstrasi 4-Fase Debugging
```bash
npx hardhat run scripts/debug_failure_demo.ts --network localhost
```

### 4. Jalankan Verifikasi Audit Statis 7 Celah Keamanan
```bash
npx hardhat run scripts/audit_7_gates_cli.ts --network localhost
```
