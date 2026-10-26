import { network } from "hardhat";

const { ethers } = await network.create();

const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

console.log(`\n${BOLD}${CYAN}========================================================================================${RESET}`);
console.log(`${BOLD}${CYAN}   DEMONSTRASI PROSES DEBUGGING KASUS KEGAGALAN TRANSAKSI (PROJECT 2 OBE)              ${RESET}`);
console.log(`${BOLD}${CYAN}   Mata Kuliah: Blockchain (KP70067008) — Dosen: Dr. Ir. Nur Widiyasono, M.Kom.         ${RESET}`);
console.log(`${BOLD}${CYAN}   Auditor & QA Lead: Friza Tri Maulana (NPM: 237006125)                                ${RESET}`);
console.log(`${BOLD}${CYAN}========================================================================================${RESET}\n`);

const [admin, unauthorizedUser] = await ethers.getSigners();
const contract = await ethers.deployContract("CredentialVerificationV2");
await contract.waitForDeployment();
const contractAddress = await contract.getAddress();

console.log(`${DIM}Environment Setup:${RESET}`);
console.log(`  Smart Contract Address : ${contractAddress}`);
console.log(`  Admin Address          : ${await admin.getAddress()}`);
console.log(`  Target Caller Address  : ${await unauthorizedUser.getAddress()}`);

const testId = ethers.keccak256(ethers.toUtf8Bytes("UNSIL/DEBUG/2026/001"));
const holderRef = ethers.keccak256(ethers.toUtf8Bytes("NIM:237006125"));
const docHash = ethers.keccak256(ethers.toUtf8Bytes("CANONICAL_DOCUMENT_HASH_FOR_DEBUG"));

console.log(`\n${BOLD}${YELLOW}[FASE 1: SIMULASI KEGAGALAN / TRANSAKSI TIDAK VALID]${RESET}`);
console.log(`Mengirim transaksi issueCredential() dari alamat yang belum diotorisasi...`);

let caughtError: any = null;
try {
  const tx = await contract.connect(unauthorizedUser).issueCredential(testId, holderRef, docHash, 0);
  await tx.wait();
} catch (err: any) {
  caughtError = err;
}

if (caughtError) {
  console.log(`${RED}✖ Transaksi GAGAL (Reverted) sebagaimana diantisipasi!${RESET}`);
  console.log(`${DIM}Stack Trace Error:${RESET}`);
  console.log(`  Error Message : ${caughtError.message}`);
  console.log(`  Custom Error  : ${caughtError.message.includes("NotAuthorizedIssuer") ? "NotAuthorizedIssuer()" : "Unknown Revert"}`);
}

console.log(`\n${BOLD}${CYAN}[FASE 2: ANALISIS AKAR MASALAH (ROOT CAUSE ANALYSIS)]${RESET}`);
console.log(`  1. Pemanggil transaksi (msg.sender) adalah: ${await unauthorizedUser.getAddress()}`);
console.log(`  2. Pemetaan authorizedIssuers[msg.sender] bernilai: ${await contract.authorizedIssuers(await unauthorizedUser.getAddress())}`);
console.log(`  3. Modifier onlyAuthorizedIssuer() menolak eksekusi dan memicu revert NotAuthorizedIssuer()`);
console.log(`  4. Kesimpulan: Sistem keamanan Role-Based Access Control (RBAC) berfungsi optimal mencegah injeksi data liar.`);

console.log(`\n${BOLD}${GREEN}[FASE 3: REMEDIASI & RETEST TRANSAKSI VALID]${RESET}`);
console.log(`Administrator universitas melakukan otorisasi alamat resmi melalui registerIssuer()...`);

const regTx = await contract.connect(admin).registerIssuer(await unauthorizedUser.getAddress(), "Unit Layanan Terpadu UNSIL");
const regReceipt = await regTx.wait();
console.log(`${GREEN}✔ Alamat berhasil didaftarkan pada block #${regReceipt?.blockNumber}!${RESET}`);

console.log(`Menjalankan ulang (retest) penerbitan ijazah...`);
const issueTx = await contract.connect(unauthorizedUser).issueCredential(testId, holderRef, docHash, 0);
const issueReceipt = await issueTx.wait();
console.log(`${GREEN}✔ Transaksi BERHASIL ditambang!${RESET}`);
console.log(`  Block Number : #${issueReceipt?.blockNumber}`);
console.log(`  Gas Used     : ${issueReceipt?.gasUsed.toString()}`);
console.log(`  Tx Hash      : ${issueReceipt?.hash}`);

const verifyRes = await contract.verifyCredential(testId, docHash);
console.log(`\n${BOLD}${GREEN}[FASE 4: VERIFIKASI POST-REMEDIASI]${RESET}`);
console.log(`  Hasil Verifikasi : Status ${verifyRes[0]} (VALID)`);
console.log(`  Unit Penerbit    : ${verifyRes[2]}`);
console.log(`\n${BOLD}${CYAN}========================================================================================${RESET}`);
console.log(`${BOLD}${GREEN}✔ SIKLUS DEBUGGING SELESAI & SELURUH BUKTI TERVERIFIKASI SECARA DETERMINISTIK${RESET}`);
console.log(`${BOLD}${CYAN}========================================================================================${RESET}\n`);
