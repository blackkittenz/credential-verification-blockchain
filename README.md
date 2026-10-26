# SISTEM VERIFIKASI KREDENSIAL AKADEMIK TERDESENTRALISASI (UNSIL)
**Mata Kuliah: Blockchain (KP70067008) — Universitas Siliwangi**  
**Dosen Pengampu: Dr. Ir. Nur Widiyasono, M.Kom.**

Sistem Verifikasi Ijazah & Kredensial Akademik berbasis Smart Contract EVM (Solidity 0.8.24) dan Web3 DApp (Next.js App Router, Tailwind CSS, ethers.js v6) dengan kepatuhan penuh terhadap prinsip **Privacy by Design (UU PDP No. 27/2022)**.

---

## 👥 Tim Pengembang
* **Friza Tri Maulana (237006125)** — Security Auditor & QA Engineer
* **Gita Syafira Azzahra (237006126)** — Smart Contract & Node Infrastructure Engineer
* **M. Zikri A. (237006127)** — Web3 DApp & Frontend Integrator
* **Muhammad Syahran Mawarid Taslim (237006143)** — Enterprise Architect & Report Coordinator

---

## 📁 Struktur Repositori

```text
credential-verification-blockchain/
├── credential/                         <- Berkas Smart Contract Solidity & Metadata Deployment (Gita)
│   ├── CredentialVerificationV2.sol    <- Smart Contract Solidity v0.8.24 (State Machine 5 status, Zero PII)
│   └── deployed-contract.json          <- ABI resmi, alamat kontrak, dan metadata jaringan
│
├── DApp/                               <- Web3 Frontend Application Next.js 16 (Zikri)
│   ├── app/                            <- Next.js App Router (Portal Publik & Portal Penerbit /issuer)
│   ├── contracts/                      <- Salinan ABI & contract address untuk konektivitas frontend
│   ├── lib/                            <- Logika Web3 ethers.js (contract.ts) & Web Crypto hashing (crypto.ts)
│   ├── public/                         <- Aset logo resmi UNSIL dan grafis visual
│   ├── .env.example                    <- Contoh variabel lingkungan RPC & alamat kontrak
│   ├── package.json                    <- Dependensi frontend (ethers v6, lucide-react, tailwindcss v4)
│   └── README.md                       <- Petunjuk teknis khusus frontend DApp
│
├── security-audit-testing/             <- Modul Audit Keamanan & Automated Testing (Friza)
│   ├── Security_Audit.pdf              <- Laporan Formal Security Audit (7 Halaman Standar Akademik)
│   ├── CredentialVerification.test.ts  <- Automated Test Suite 18 Kasus Uji (Mocha & Chai / Hardhat)
│   ├── debug_failure_demo.ts           <- Skrip Demonstrasi 4-Fase Debugging Kasus Transaksi Gagal
│   ├── audit_7_gates_cli.ts            <- Skrip Audit Statis & Verifikasi 7 Gerbang Keamanan
│   ├── security_audit_execution.log    <- Log Mentah Eksekusi CLI Terminal di Server VPS
│   ├── evidence/                       <- Bukti Tangkapan Layar Asli Console CLI (Spectacle OS)
│   │   ├── B01_hardhat_test_suite_18_passing.png <- Bukti [B-01]: 18 Skenario Uji Passing 100%
│   │   ├── B02_debugging_failure_remediation.png <- Bukti [B-02]: 4 Fase Debugging & RCA
│   │   └── B03_security_audit_7_gates.png        <- Bukti [B-03]: Remediasi 7 Celah Keamanan
│   └── README.md                       <- Panduan teknis audit, STRIDE model, & matriks celah
│
└── README.md                           <- Dokumentasi utama repositori
```

---

## 🌐 Parameter Jaringan Blockchain & Smart Contract

Node blockchain privat beroperasi 24/7 di server VPS dan dapat diakses publik secara aman via reverse proxy SSL HTTPS:

* **Nama Jaringan:** `UNSIL Blockchain Private`
* **RPC Endpoint:** `https://rpc.prizftm.my.id`
* **Chain ID:** `31337` (EVM Standard)
* **Currency Symbol:** `ETH`
* **Alamat Smart Contract:** `0x5FbDB2315678afecb367f032d93F642f64180aa3`

---

## 🚀 Panduan Menjalankan Frontend DApp Secara Lokal

### 1. Masuk ke Direktori DApp
```bash
cd DApp
```

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Variabel Lingkungan
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
Isi konfigurasi default sudah siap pakai:
```env
NEXT_PUBLIC_RPC_URL=https://rpc.prizftm.my.id
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_NETWORK_NAME=UNSIL Blockchain Private
```

### 4. Jalankan Server Development
```bash
npm run dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000).

---

## 🛡️ Ringkasan Audit Keamanan & Automated Testing (Project 2 & 3)
* **Automated Unit Testing:** 18 dari 18 skenario uji lulus 100% (Zero Failure), mencakup skenario positif, penolakan pihak liar, uji batas zero-hash/empty-id, auto-expiration dinamis, dan penelusuran riwayat ralat (*superseding*).
* **Mitigasi 7 Celah Keamanan Wajib:**
  1. *Reentrancy:* Modifier `nonReentrant` mutex boolean.
  2. *Access Control:* Strict Ownership Guard (`NotIssuingAuthority`).
  3. *Front-Running:* Pemeriksaan atomik `CredentialAlreadyExists`.
  4. *Denial of Service (DoS):* Migrasi 100% ke $O(1)$ Direct Mapping (`mapping(bytes32 => Credential)`).
  5. *Input Validation:* Sanitasi ketat `EmptyString`, `ZeroHash`, dan `InvalidValidityPeriod`.
  6. *Error Handling & Gas:* 10 Solidity Custom Errors (hemat gas ~40% saat revert).
  7. *Oracle & Privacy Risk:* Zero Oracle Dependency + Zero PII On-Chain (UU PDP No. 27 Tahun 2022).
* Rincian lengkap dan cara menjalankan ulang pengujian tersedia di folder [`security-audit-testing/`](./security-audit-testing/).
