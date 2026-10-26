"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import {
  Wallet,
  FileText,
  UploadCloud,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  History,
} from "lucide-react";
import {
  getSignerContract,
  getReadonlyContract,
  CONTRACT_ADDRESS,
  CHAIN_ID,
  DEFAULT_RPC_URL,
} from "@/lib/contract";
import {
  hashFileKeccak256,
  stringToBytes32,
  truncateHash,
} from "@/lib/crypto";

interface IssuedRecord {
  idText: string;
  idBytes32: string;
  holderRefText: string;
  holderRefBytes32: string;
  pdfHash: string;
  fileName: string;
  validUntil: number;
  txHash: string;
  action: "issue" | "supersede" | "revoke";
  timestamp: number;
  supersededOldId?: string;
}

export default function IssuerPortalPage() {
  // Wallet state
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [issuerOrgName, setIssuerOrgName] = useState("");
  const [walletError, setWalletError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"issue" | "supersede" | "revoke" | "register">("issue");

  // Form State: Issue
  const [issueId, setIssueId] = useState("");
  const [issueNim, setIssueNim] = useState("");
  const [issueFile, setIssueFile] = useState<File | null>(null);
  const [issueHash, setIssueHash] = useState("");
  const [issueValidType, setIssueValidType] = useState<"forever" | "custom">("forever");
  const [issueValidDate, setIssueValidDate] = useState("");

  // Form State: Supersede (Ralat)
  const [superOldId, setSuperOldId] = useState("");
  const [superNewId, setSuperNewId] = useState("");
  const [superNewNim, setSuperNewNim] = useState("");
  const [superFile, setSuperFile] = useState<File | null>(null);
  const [superHash, setSuperHash] = useState("");
  const [superValidType, setSuperValidType] = useState<"forever" | "custom">("forever");
  const [superValidDate, setSuperValidDate] = useState("");

  // Form State: Revoke
  const [revokeId, setRevokeId] = useState("");
  const [revokeReason, setRevokeReason] = useState("");

  // Form State: Register Issuer (Admin Only)
  const [newIssuerAddress, setNewIssuerAddress] = useState("");
  const [newIssuerOrgName, setNewIssuerOrgName] = useState("");

  // Transaction execution status
  const [isTransacting, setIsTransacting] = useState(false);
  const [txSuccess, setTxSuccess] = useState<{
    title: string;
    txHash: string;
    details?: string;
  } | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // History stored in browser
  const [history, setHistory] = useState<IssuedRecord[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const issueFileInputRef = useRef<HTMLInputElement>(null);
  const superFileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage and handle demo/tab query parameters
  useEffect(() => {
    try {
      const saved = localStorage.getItem("unsil_credential_history");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}

    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as any;
    if (tabParam && ["issue", "supersede", "revoke", "register"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (params.get("demo") === "admin") {
      setAccount("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
      setBalance("10000.0000");
      setIsAuthorized(true);
      setIsAdmin(true);
      setIssuerOrgName("Universitas Siliwangi (UNSIL) - Rektorat");
      setIssueId("UNSIL/FT/IF/2026/002");
      setIssueNim("237006127");
      setIssueHash("0x8a9b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b");

      setSuperOldId("UNSIL/FT/IF/2026/001");
      setSuperNewId("UNSIL/FT/IF/2026/001-REV1");
      setSuperNewNim("237006127");
      setSuperHash("0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d");

      setRevokeId("UNSIL/FT/IF/2026/001-REV1");
      setRevokeReason("Perbaikan data nama mahasiswa & akreditasi program studi.");
    }
  }, []);

  const saveHistory = (record: IssuedRecord) => {
    setHistory((prev) => {
      const next = [record, ...prev];
      try {
        localStorage.setItem("unsil_credential_history", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Check permissions directly via read-only RPC (never blocks)
  const checkAccountPermissions = async (addr: string) => {
    try {
      const roContract = getReadonlyContract();
      const contractAdmin = await roContract.admin();
      const userIsAdmin = contractAdmin.toLowerCase() === addr.toLowerCase();
      setIsAdmin(userIsAdmin);

      const userIsIssuer = await roContract.authorizedIssuers(addr);
      setIsAuthorized(userIsIssuer || userIsAdmin);

      const orgName = await roContract.issuerOrgNames(addr);
      setIssuerOrgName(orgName || (userIsAdmin ? "Universitas Siliwangi (UNSIL) - Rektorat" : ""));

      try {
        const fallbackProvider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
        const bal = await fallbackProvider.getBalance(addr);
        setBalance(Number(ethers.formatEther(bal)).toFixed(4));
      } catch {}
    } catch (e) {
      console.warn("Direct RPC permission check notice:", e);
    }
  };

  // Connect Wallet
  const connectWallet = async () => {
    setIsConnecting(true);
    setWalletError(null);
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          const addr = accounts[0];
          setAccount(addr);
          await checkAccountPermissions(addr);
        }
      }

      try {
        const { address } = await getSignerContract();
        setAccount(address);
        await checkAccountPermissions(address);
      } catch (signerErr: any) {
        console.warn("Signer auto-switch notice:", signerErr);
      }
    } catch (err: any) {
      console.error("Wallet connection error:", err);
      setWalletError(err.message || "Gagal menghubungkan ke MetaMask.");
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            checkAccountPermissions(accounts[0]);
          }
        })
        .catch(() => {});

      (window as any).ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          checkAccountPermissions(accounts[0]);
        } else {
          setAccount(null);
          setIsAuthorized(false);
        }
      });

      (window as any).ethereum.on("chainChanged", () => {
        if (typeof window !== "undefined" && (window as any).ethereum) {
          (window as any).ethereum.request({ method: "eth_accounts" }).then((accs: string[]) => {
            if (accs && accs.length > 0) {
              setAccount(accs[0]);
              checkAccountPermissions(accs[0]);
            }
          });
        }
      });
    }
  }, []);

  // PDF Hashing Handlers
  const handleIssuePdf = async (file: File) => {
    if (!file) return;
    setIssueFile(file);
    try {
      const h = await hashFileKeccak256(file);
      setIssueHash(h);
    } catch (err: any) {
      setTxError("Gagal hash PDF: " + err.message);
    }
  };

  const handleSuperPdf = async (file: File) => {
    if (!file) return;
    setSuperFile(file);
    try {
      const h = await hashFileKeccak256(file);
      setSuperHash(h);
    } catch (err: any) {
      setTxError("Gagal hash PDF: " + err.message);
    }
  };

  // SUBMIT 1: Issue Credential
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueId.trim() || !issueNim.trim() || !issueHash) {
      setTxError("Harap lengkapi Nomor Ijazah, NIM Mahasiswa, dan Unggah File PDF.");
      return;
    }

    setIsTransacting(true);
    setTxError(null);
    setTxSuccess(null);

    try {
      const { contract } = await getSignerContract();
      const idBytes32 = stringToBytes32(issueId.trim());
      const holderRefBytes32 = stringToBytes32(issueNim.trim());

      let validUntilSec = 0;
      if (issueValidType === "custom" && issueValidDate) {
        validUntilSec = Math.floor(new Date(issueValidDate).getTime() / 1000);
      }

      const tx = await contract.issueCredential(idBytes32, holderRefBytes32, issueHash, validUntilSec);
      const receipt = await tx.wait();

      setTxSuccess({
        title: "Kredensial Berhasil Diterbitkan On-Chain",
        txHash: receipt.hash,
        details: `ID: ${issueId} | Block: ${receipt.blockNumber}`,
      });

      saveHistory({
        idText: issueId,
        idBytes32,
        holderRefText: issueNim,
        holderRefBytes32,
        pdfHash: issueHash,
        fileName: issueFile?.name || "ijazah.pdf",
        validUntil: validUntilSec,
        txHash: receipt.hash,
        action: "issue",
        timestamp: Date.now(),
      });

      setIssueId("");
      setIssueNim("");
      setIssueFile(null);
      setIssueHash("");
      if (issueFileInputRef.current) issueFileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Issue error:", err);
      setTxError(err.reason || err.message || "Gagal menerbitkan kredensial.");
    } finally {
      setIsTransacting(false);
    }
  };

  // SUBMIT 2: Supersede Credential (Ralat)
  const handleSupersedeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superOldId.trim() || !superNewId.trim() || !superNewNim.trim() || !superHash) {
      setTxError("Harap lengkapi seluruh kolom formulir ralat termasuk berkas PDF baru.");
      return;
    }

    setIsTransacting(true);
    setTxError(null);
    setTxSuccess(null);

    try {
      const { contract } = await getSignerContract();
      const oldIdBytes32 = stringToBytes32(superOldId.trim());
      const newIdBytes32 = stringToBytes32(superNewId.trim());
      const newHolderRefBytes32 = stringToBytes32(superNewNim.trim());

      let validUntilSec = 0;
      if (superValidType === "custom" && superValidDate) {
        validUntilSec = Math.floor(new Date(superValidDate).getTime() / 1000);
      }

      const tx = await contract.supersedeCredential(
        oldIdBytes32,
        newIdBytes32,
        newHolderRefBytes32,
        superHash,
        validUntilSec
      );
      const receipt = await tx.wait();

      setTxSuccess({
        title: "Ralat Dokumen Berantai Berhasil Dicatat (Lineage)",
        txHash: receipt.hash,
        details: `Old ID: ${superOldId} → New ID: ${superNewId}`,
      });

      saveHistory({
        idText: superNewId,
        idBytes32: newIdBytes32,
        holderRefText: superNewNim,
        holderRefBytes32: newHolderRefBytes32,
        pdfHash: superHash,
        fileName: superFile?.name || "ijazah_ralat.pdf",
        validUntil: validUntilSec,
        txHash: receipt.hash,
        action: "supersede",
        timestamp: Date.now(),
        supersededOldId: superOldId,
      });

      setSuperOldId("");
      setSuperNewId("");
      setSuperNewNim("");
      setSuperFile(null);
      setSuperHash("");
      if (superFileInputRef.current) superFileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Supersede error:", err);
      setTxError(err.reason || err.message || "Gagal melakukan ralat dokumen.");
    } finally {
      setIsTransacting(false);
    }
  };

  // SUBMIT 3: Revoke Credential
  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeId.trim() || !revokeReason.trim()) {
      setTxError("Harap masukkan Nomor ID Ijazah dan Alasan Pencabutan Resmi.");
      return;
    }

    setIsTransacting(true);
    setTxError(null);
    setTxSuccess(null);

    try {
      const { contract } = await getSignerContract();
      const idBytes32 = stringToBytes32(revokeId.trim());

      const tx = await contract.revokeCredential(idBytes32, revokeReason);
      const receipt = await tx.wait();

      setTxSuccess({
        title: "Kredensial Berhasil Dicabut Resmi",
        txHash: receipt.hash,
        details: `ID: ${revokeId} | Alasan: ${revokeReason}`,
      });

      saveHistory({
        idText: revokeId,
        idBytes32,
        holderRefText: "-",
        holderRefBytes32: "-",
        pdfHash: "-",
        fileName: "-",
        validUntil: 0,
        txHash: receipt.hash,
        action: "revoke",
        timestamp: Date.now(),
      });

      setRevokeId("");
      setRevokeReason("");
    } catch (err: any) {
      console.error("Revoke error:", err);
      setTxError(err.reason || err.message || "Gagal mencabut kredensial.");
    } finally {
      setIsTransacting(false);
    }
  };

  // SUBMIT 4: Register New Issuer (Admin Only)
  const handleRegisterIssuerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssuerAddress.trim() || !newIssuerOrgName.trim()) {
      setTxError("Harap masukkan Alamat Wallet dan Nama Lembaga / Fakultas.");
      return;
    }

    setIsTransacting(true);
    setTxError(null);
    setTxSuccess(null);

    try {
      const { contract } = await getSignerContract();
      const tx = await contract.registerIssuer(newIssuerAddress.trim(), newIssuerOrgName.trim());
      const receipt = await tx.wait();

      setTxSuccess({
        title: "Authorized Issuer Baru Berhasil Didaftarkan",
        txHash: receipt.hash,
        details: `${newIssuerOrgName} (${truncateHash(newIssuerAddress)})`,
      });

      setNewIssuerAddress("");
      setNewIssuerOrgName("");
    } catch (err: any) {
      console.error("Register issuer error:", err);
      setTxError(err.reason || err.message || "Gagal mendaftarkan issuer.");
    } finally {
      setIsTransacting(false);
    }
  };

  const copyText = (txt: string, key: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ebebeb] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#8f8f8f] mb-1">
            <span>Universitas Siliwangi</span>
            <span>/</span>
            <span className="text-[#171717]">Issuer Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#171717]">
            Penerbitan & Tata Kelola
          </h1>
          <p className="text-xs text-[#666666] mt-1 font-mono">
            Manajemen siklus hidup sertifikat akademik &bull; UNSIL Private EVM (31337)
          </p>
        </div>

        {/* Wallet Pill / Button */}
        <div>
          {account ? (
            <div className="bg-white border border-[#ebebeb] rounded-md px-3.5 py-2 flex items-center gap-3 text-xs shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
              <div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[#171717] font-medium">{truncateHash(account, 6, 4)}</span>
                  {isAdmin && (
                    <span className="text-[10px] text-[#d97706] border border-[#fef08a] bg-[#fefce8] px-1 py-0.2 rounded font-mono font-medium">
                      ADMIN
                    </span>
                  )}
                  {isAuthorized && !isAdmin && (
                    <span className="text-[10px] text-[#0070f3] border border-[#bfdbfe] bg-[#eff6ff] px-1 py-0.2 rounded font-mono font-medium">
                      ISSUER
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#8f8f8f] font-mono">
                  {balance} ETH &bull; {issuerOrgName || "Private Node"}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="py-2 px-4 rounded-md font-medium text-xs bg-[#171717] text-white hover:bg-[#333333] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Hubungkan MetaMask</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {walletError && (
        <div className="p-3.5 rounded-md bg-[#fff0f0] border border-[#ffcccc] text-[#e00000] text-xs font-mono">
          {walletError}
        </div>
      )}

      {!account && (
        <div className="bg-white border border-[#ebebeb] rounded-xl p-8 text-center space-y-3 max-w-md mx-auto shadow-xs">
          <div className="w-10 h-10 rounded-md bg-[#fafafa] border border-[#ebebeb] text-[#666666] flex items-center justify-center mx-auto">
            <Wallet className="w-5 h-5 text-[#171717]" />
          </div>
          <h2 className="text-sm font-semibold text-[#171717]">Autentikasi Wallet Dibutuhkan</h2>
          <p className="text-xs text-[#666666] leading-relaxed">
            Portal penerbitan memerlukan tanda tangan transaksi digital dari dompet MetaMask yang terdaftar sebagai Authorized Issuer.
          </p>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={connectWallet}
              className="py-2 px-4 rounded-md font-medium text-xs bg-[#171717] text-white hover:bg-[#333333] transition-colors cursor-pointer w-full"
            >
              Hubungkan MetaMask
            </button>
            <button
              type="button"
              onClick={() => {
                setAccount("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
                setBalance("10000.0000");
                setIsAuthorized(true);
                setIsAdmin(true);
                setIssuerOrgName("Universitas Siliwangi (UNSIL) - Rektorat");
                setIssueId("UNSIL/FT/IF/2026/002");
                setIssueNim("237006127");
                setIssueHash("0x8a9b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b");
                setSuperOldId("UNSIL/FT/IF/2026/001");
                setSuperNewId("UNSIL/FT/IF/2026/001-REV1");
                setSuperNewNim("237006127");
                setSuperHash("0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d");
                setRevokeId("UNSIL/FT/IF/2026/001-REV1");
                setRevokeReason("Perbaikan data nama mahasiswa & akreditasi program studi.");
              }}
              className="text-[11px] text-[#666666] hover:text-[#171717] underline cursor-pointer mt-1"
            >
              Simulasi Mode Admin Rektorat (10,000 ETH)
            </button>
          </div>
        </div>
      )}

      {account && !isAuthorized && (
        <div className="p-4 rounded-md bg-[#fffbf0] border border-[#fed7aa] text-[#c2410c] text-xs space-y-1 font-mono">
          <div className="font-semibold text-sm">Akses Ditolak: Not Authorized Issuer</div>
          <p className="text-[#9a3412] text-[11px] leading-relaxed">
            Akun Anda ({account}) tidak terdaftar dalam smart contract sebagai authorized issuer. Daftarkan akun ini menggunakan akun Super Admin terlebih dahulu.
          </p>
        </div>
      )}

      {account && isAuthorized && (
        <div className="space-y-6">
          {/* Vercel Project Settings Style Segmented Tabs */}
          <div className="flex items-center gap-6 border-b border-[#ebebeb] text-xs font-medium overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab("issue");
                setTxError(null);
                setTxSuccess(null);
              }}
              className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap -mb-[1px] ${
                activeTab === "issue"
                  ? "text-[#171717] border-b-2 border-[#171717]"
                  : "text-[#666666] hover:text-[#171717]"
              }`}
            >
              Terbitkan Ijazah
            </button>

            <button
              onClick={() => {
                setActiveTab("supersede");
                setTxError(null);
                setTxSuccess(null);
              }}
              className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap -mb-[1px] ${
                activeTab === "supersede"
                  ? "text-[#171717] border-b-2 border-[#171717]"
                  : "text-[#666666] hover:text-[#171717]"
              }`}
            >
              Ralat Dokumen (Supersede)
            </button>

            <button
              onClick={() => {
                setActiveTab("revoke");
                setTxError(null);
                setTxSuccess(null);
              }}
              className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap -mb-[1px] ${
                activeTab === "revoke"
                  ? "text-[#171717] border-b-2 border-[#171717]"
                  : "text-[#666666] hover:text-[#171717]"
              }`}
            >
              Pencabutan (Revoke)
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setActiveTab("register");
                  setTxError(null);
                  setTxSuccess(null);
                }}
                className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap -mb-[1px] ${
                  activeTab === "register"
                    ? "text-[#171717] border-b-2 border-[#171717]"
                    : "text-[#666666] hover:text-[#171717]"
                }`}
              >
                Otorisasi Issuer Baru
              </button>
            )}
          </div>

          {/* Feedback Alerts */}
          {txSuccess && (
            <div className="p-4 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] text-[#00875a] text-xs space-y-1.5 font-mono">
              <div className="font-semibold text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00875a]"></span>
                <span>{txSuccess.title}</span>
              </div>
              {txSuccess.details && <p className="text-[#666666] text-[11px]">{txSuccess.details}</p>}
              <div className="flex items-center justify-between bg-white p-2 rounded text-[11px] text-[#171717] break-all border border-[#ebebeb]">
                <span>Tx Hash: {txSuccess.txHash}</span>
                <button
                  onClick={() => copyText(txSuccess.txHash, "txSuccess")}
                  className="text-[#8f8f8f] hover:text-[#171717] ml-2"
                >
                  {copiedKey === "txSuccess" ? <Check className="w-3.5 h-3.5 text-[#00875a]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {txError && (
            <div className="p-3.5 rounded-lg bg-[#fff0f0] border border-[#ffcccc] text-[#e00000] text-xs font-mono">
              {txError}
            </div>
          )}

          {/* TAB 1: ISSUE FORM */}
          {activeTab === "issue" && (
            <form onSubmit={handleIssueSubmit} className="bg-white border border-[#ebebeb] rounded-xl p-6 sm:p-7 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="border-b border-[#f2f2f2] pb-3">
                <h3 className="text-sm font-semibold text-[#171717]">
                  Penerbitan Kredensial Baru
                </h3>
                <p className="text-xs text-[#666666] mt-0.5">
                  Menyimpan sidik jari Keccak-256 PDF ke smart contract dengan status initial <strong>ACTIVE</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#171717]">Nomor / ID Ijazah *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: UNSIL/FT/IF/2026/001"
                    value={issueId}
                    onChange={(e) => setIssueId(e.target.value)}
                    className="w-full bg-white border border-[#ebebeb] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#171717] placeholder-[#a1a1a1] focus:outline-none focus:border-[#171717]"
                  />
                  {issueId && (
                    <p className="text-[10px] font-mono text-[#8f8f8f] truncate">
                      bytes32: {truncateHash(stringToBytes32(issueId))}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#171717]">NIM / Identitas Pemegang *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 237006127"
                    value={issueNim}
                    onChange={(e) => setIssueNim(e.target.value)}
                    className="w-full bg-white border border-[#ebebeb] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#171717] placeholder-[#a1a1a1] focus:outline-none focus:border-[#171717]"
                  />
                  {issueNim && (
                    <p className="text-[10px] font-mono text-[#8f8f8f] truncate">
                      holderRef: {truncateHash(stringToBytes32(issueNim))}
                    </p>
                  )}
                </div>
              </div>

              {/* Upload PDF */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#171717] flex items-center justify-between">
                  <span>Berkas PDF Ijazah Asli *</span>
                  <span className="text-[11px] font-mono text-[#666666]">Client Keccak-256</span>
                </label>
                <div
                  onClick={() => issueFileInputRef.current?.click()}
                  className="border border-dashed border-[#ebebeb] hover:border-[#cccccc] bg-[#fafafa] hover:bg-[#f5f5f5] rounded-lg p-5 text-center cursor-pointer transition-colors"
                >
                  <input
                    ref={issueFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files && handleIssuePdf(e.target.files[0])}
                  />
                  {issueFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-5 h-5 text-[#171717]" />
                      <div className="text-left font-mono">
                        <p className="text-xs font-medium text-[#171717]">{issueFile.name}</p>
                        <p className="text-[10px] text-[#8f8f8f] truncate max-w-sm">{issueHash}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#8f8f8f]">
                      <UploadCloud className="w-4 h-4 text-[#8f8f8f]" />
                      <span className="text-xs text-[#171717]">Pilih berkas PDF ijazah</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Validity */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#171717]">Masa Berlaku Dokumen</label>
                <div className="flex items-center gap-4 text-xs text-[#666666]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="validType"
                      checked={issueValidType === "forever"}
                      onChange={() => setIssueValidType("forever")}
                      className="accent-[#171717]"
                    />
                    <span className="text-[#171717]">Berlaku Selamanya (Ijazah Akademik)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="validType"
                      checked={issueValidType === "custom"}
                      onChange={() => setIssueValidType("custom")}
                      className="accent-[#171717]"
                    />
                    <span>Berbatas Waktu</span>
                  </label>
                </div>
                {issueValidType === "custom" && (
                  <input
                    type="datetime-local"
                    value={issueValidDate}
                    onChange={(e) => setIssueValidDate(e.target.value)}
                    className="mt-2 bg-white border border-[#ebebeb] rounded-md px-3 py-1.5 text-xs text-[#171717]"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={isTransacting || !issueHash || !issueId.trim()}
                className="w-full py-2.5 rounded-md font-medium text-xs sm:text-sm bg-[#171717] text-white hover:bg-[#333333] disabled:opacity-40 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isTransacting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengeksekusi Transaksi EVM...</span>
                  </>
                ) : (
                  <span>Terbitkan ke Blockchain</span>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: SUPERSEDE FORM (RALAT) */}
          {activeTab === "supersede" && (
            <form onSubmit={handleSupersedeSubmit} className="bg-white border border-[#ebebeb] rounded-xl p-6 sm:p-7 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="border-b border-[#f2f2f2] pb-3">
                <h3 className="text-sm font-semibold text-[#171717]">
                  Ralat Dokumen Berantai (Immutable Lineage)
                </h3>
                <p className="text-xs text-[#666666] mt-0.5">
                  Mengubah status dokumen lama menjadi <strong>SUPERSEDED</strong> dan menerbitkan dokumen baru berstatus <strong>ACTIVE</strong> dengan pointer keterhubungan permanen.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#171717]">Nomor ID Ijazah Lama (Yang Diralat) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: UNSIL/FT/IF/2026/001"
                    value={superOldId}
                    onChange={(e) => setSuperOldId(e.target.value)}
                    className="w-full bg-white border border-[#ebebeb] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#171717] placeholder-[#a1a1a1] focus:outline-none focus:border-[#171717]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#171717]">Nomor ID Ijazah Baru Pengganti *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: UNSIL/FT/IF/2026/001-REV1"
                    value={superNewId}
                    onChange={(e) => setSuperNewId(e.target.value)}
                    className="w-full bg-white border border-[#ebebeb] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#171717] placeholder-[#a1a1a1] focus:outline-none focus:border-[#171717]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#171717]">NIM / Identitas Pemegang (Koreksi) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 237006127"
                  value={superNewNim}
                  onChange={(e) => setSuperNewNim(e.target.value)}
                  className="w-full bg-white border border-[#ebebeb] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#171717] placeholder-[#a1a1a1] focus:outline-none focus:border-[#171717]"
                />
              </div>

              {/* Upload New PDF */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#171717]">Berkas PDF Hasil Ralat *</label>
                <div
                  onClick={() => superFileInputRef.current?.click()}
                  className="border border-dashed border-[#ebebeb] hover:border-[#cccccc] bg-[#fafafa] hover:bg-[#f5f5f5] rounded-lg p-5 text-center cursor-pointer transition-colors"
                >
                  <input
                    ref={superFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files && handleSuperPdf(e.target.files[0])}
                  />
                  {superFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-5 h-5 text-[#171717]" />
                      <div className="text-left font-mono">
                        <p className="text-xs font-medium text-[#171717]">{superFile.name}</p>
                        <p className="text-[10px] text-[#8f8f8f] truncate max-w-sm">{superHash}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[#8f8f8f]">
                      <UploadCloud className="w-4 h-4 text-[#8f8f8f]" />
                      <span className="text-xs text-[#171717]">Pilih berkas PDF hasil ralat</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isTransacting || !superHash || !superOldId.trim() || !superNewId.trim()}
                className="w-full py-2.5 rounded-md font-medium text-xs sm:text-sm bg-[#171717] text-white hover:bg-[#333333] disabled:opacity-40 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isTransacting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengeksekusi Lineage...</span>
                  </>
                ) : (
                  <span>Eksekusi Ralat Dokumen (Supersede)</span>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: REVOKE FORM */}
          {activeTab === "revoke" && (
            <form onSubmit={handleRevokeSubmit} className="bg-white border border-[#ebebeb] rounded-xl p-6 sm:p-7 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="border-b border-[#f2f2f2] pb-3">
                <h3 className="text-sm font-semibold text-[#171717]">
                  Pencabutan Kredensial Resmi (Revoke)
                </h3>
                <p className="text-xs text-[#666666] mt-0.5">
                  Mencabut ijazah secara permanen di buku besar on-chain dengan menyertakan alasan resmi.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#171717]">Nomor / ID Ijazah yang Dicabut *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: UNSIL/FT/IF/2026/001"
                    value={revokeId}
                    onChange={(e) => setRevokeId(e.target.value)}
                    className="w-full bg-white border border-[#ebebeb] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#171717] placeholder-[#a1a1a1] focus:outline-none focus:border-[#171717]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#171717]">Alasan Resmi Pencabutan *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Contoh: Berdasarkan SK Rektor No. 12/UNSIL/2026 terkait pelanggaran kode etik akademik."
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    className="w-full bg-white border border-[#ebebeb] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#171717] placeholder-[#a1a1a1] focus:outline-none focus:border-[#171717]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isTransacting || !revokeId.trim() || !revokeReason.trim()}
                className="w-full py-2.5 rounded-md font-medium text-xs sm:text-sm bg-[#e00000] hover:bg-[#c50000] text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isTransacting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mencabut Dokumen...</span>
                  </>
                ) : (
                  <span>Cabut Kredensial Permanen</span>
                )}
              </button>
            </form>
          )}

          {/* TAB 4: REGISTER ISSUER (ADMIN ONLY) */}
          {activeTab === "register" && isAdmin && (
            <form onSubmit={handleRegisterIssuerSubmit} className="bg-white border border-[#ebebeb] rounded-xl p-6 sm:p-7 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="border-b border-[#f2f2f2] pb-3">
                <h3 className="text-sm font-semibold text-[#171717]">
                  Otorisasi Issuer Baru (Super Admin)
                </h3>
                <p className="text-xs text-[#666666] mt-0.5">
                  Mendaftarkan alamat dompet fakultas atau unit kerja baru yang berwenang menerbitkan sertifikat.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#171717]">Alamat Wallet Penerbit (0x...) *</label>
                  <input
                    type="text"
                    required
                    placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                    value={newIssuerAddress}
                    onChange={(e) => setNewIssuerAddress(e.target.value)}
                    className="w-full bg-white border border-[#ebebeb] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#171717] placeholder-[#a1a1a1] focus:outline-none focus:border-[#171717] font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#171717]">Nama Lembaga / Fakultas *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Fakultas Teknik UNSIL - Dekanat"
                    value={newIssuerOrgName}
                    onChange={(e) => setNewIssuerOrgName(e.target.value)}
                    className="w-full bg-white border border-[#ebebeb] rounded-md px-3.5 py-2 text-xs sm:text-sm text-[#171717] placeholder-[#a1a1a1] focus:outline-none focus:border-[#171717]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isTransacting || !newIssuerAddress.trim() || !newIssuerOrgName.trim()}
                className="w-full py-2.5 rounded-md font-medium text-xs sm:text-sm bg-[#171717] text-white hover:bg-[#333333] disabled:opacity-40 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isTransacting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mendaftarkan Issuer...</span>
                  </>
                ) : (
                  <span>Otorisasi Wallet Issuer</span>
                )}
              </button>
            </form>
          )}

          {/* Vercel-Style Data Table: Activity Logs */}
          {history.length > 0 && (
            <div className="border border-[#ebebeb] bg-white rounded-xl overflow-hidden shadow-xs">
              <div className="px-5 py-3.5 border-b border-[#ebebeb] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-[#171717] font-medium">
                  <History className="w-3.5 h-3.5 text-[#8f8f8f]" />
                  <span>Riwayat Transaksi Lokal Peramban</span>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("unsil_credential_history");
                    setHistory([]);
                  }}
                  className="text-[11px] font-mono text-[#8f8f8f] hover:text-[#e00000] transition-colors"
                >
                  Bersihkan
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#171717]">
                  <thead className="text-[10px] font-mono uppercase tracking-wider text-[#8f8f8f] bg-[#fafafa] border-b border-[#ebebeb]">
                    <tr>
                      <th className="py-2.5 px-4">Operasi</th>
                      <th className="py-2.5 px-4">Nomor ID</th>
                      <th className="py-2.5 px-4">NIM Pemegang</th>
                      <th className="py-2.5 px-4">Tx Hash</th>
                      <th className="py-2.5 px-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2f2f2] font-mono text-[11px]">
                    {history.map((rec, i) => (
                      <tr key={i} className="hover:bg-[#fafafa] transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${
                              rec.action === "issue"
                                ? "bg-[#f0fdf4] text-[#00875a] border-[#bbf7d0]"
                                : rec.action === "supersede"
                                ? "bg-[#eff6ff] text-[#0070f3] border-[#bfdbfe]"
                                : "bg-[#fff0f0] text-[#e00000] border-[#ffcccc]"
                            }`}
                          >
                            {rec.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-[#171717]">{rec.idText}</td>
                        <td className="py-3 px-4 text-[#666666]">{rec.holderRefText}</td>
                        <td className="py-3 px-4 text-[#8f8f8f]">{truncateHash(rec.txHash, 8, 6)}</td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/?id=${encodeURIComponent(rec.idText)}`}
                            className="inline-flex items-center gap-1 font-sans text-xs text-[#0070f3] hover:underline"
                          >
                            <span>Verifikasi</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
