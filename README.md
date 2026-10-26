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
├── credential/                 <- Berkas Smart Contract Solidity & Metadata Deployment
│   ├── CredentialVerificationV2.sol  <- Smart Contract Solidity v0.8.24 (State Machine 5 status, Zero PII)
│   └── deployed-contract.json        <- ABI resmi, alamat kontrak, dan metadata jaringan
├── DApp/                       <- Web3 Frontend Application (Next.js 16 + React 19)
│   ├── app/                    <- Next.js App Router (Portal Publik & Portal Penerbit /issuer)
│   ├── contracts/              <- Salinan ABI & contract address untuk konektivitas frontend
│   ├── lib/                    <- Logika Web3 ethers.js (contract.ts) & Web Crypto hashing (crypto.ts)
│   ├── public/                 <- Aset logo resmi UNSIL dan grafis visual
│   ├── .env.example            <- Contoh variabel lingkungan RPC & alamat kontrak
│   ├── package.json            <- Dependensi frontend (ethers v6, lucide-react, tailwindcss v4)
│   └── README.md               <- Petunjuk teknis khusus frontend DApp
└── README.md                   <- Dokumentasi utama repositori
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

## 🛡️ Fitur Kunci & Keamanan
1. **Zero PII On-Chain (UU PDP No. 27/2022):** Berkas PDF fisik dan data pribadi mahasiswa (Nama, NIK, NIM, Nilai) tidak pernah diunggah atau disimpan di blockchain. Browser menghitung hash Keccak-256 secara lokal di memori klien.
2. **Mesin Status 5 Siklus Hidup:** Membedakan secara presisi hasil verifikasi publik: `VALID`, `HASH_MISMATCH`, `REVOKED`, `EXPIRED`, `SUPERSEDED`, dan `NOT_FOUND`.
3. **Pemberitahuan Instan 0 Gas:** Fungsi verifikasi bersifat `view` sehingga pihak ketiga (perusahaan rekruter / HRD) dapat memeriksa keaslian ijazah secara gratis tanpa memerlukan dompet kripto MetaMask.
4. **Proteksi Akses Berlapis:** Transaksi penerbitan dan ralat dikunci menggunakan modifier `onlyAuthorizedIssuer` dan `nonReentrant`.
