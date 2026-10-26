"use client";

import { useState, useRef, useEffect, ChangeEvent, DragEvent } from "react";
import {
  UploadCloud,
  FileText,
  Search,
  Copy,
  Check,
  RefreshCw,
  GitBranch,
  Shield,
} from "lucide-react";
import {
  getReadonlyContract,
  VerificationResult,
  RESULT_CONFIG,
  VerificationData,
  DEFAULT_RPC_URL,
  CONTRACT_ADDRESS,
} from "@/lib/contract";
import {
  hashFileKeccak256,
  stringToBytes32,
  truncateHash,
  formatUnixDate,
} from "@/lib/crypto";

export default function PublicVerifierPage() {
  const [credentialIdInput, setCredentialIdInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string>("");
  const [isHashing, setIsHashing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    data: VerificationData;
    idBytes32: string;
    verifiedHash: string;
    durationMs: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Instant client-side Keccak-256 calculation
  const processFile = async (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Format berkas tidak valid. Harap gunakan berkas PDF.");
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    setIsHashing(true);
    try {
      const startTime = performance.now();
      const hash = await hashFileKeccak256(file);
      setFileHash(hash);
      const took = Math.round(performance.now() - startTime);
      console.log(`Computed Keccak-256 in ${took}ms:`, hash);
    } catch (err: any) {
      console.error("Hashing error:", err);
      setErrorMsg("Gagal menghitung hash berkas: " + (err.message || String(err)));
    } finally {
      setIsHashing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const executeVerification = async (targetId: string, targetHash: string) => {
    if (!targetId.trim()) {
      setErrorMsg("Masukkan Nomor / ID Ijazah terlebih dahulu.");
      return;
    }
    if (!targetHash) {
      setErrorMsg("Pilih atau letakkan berkas PDF ijazah terlebih dahulu.");
      return;
    }

    setErrorMsg(null);
    setIsVerifying(true);
    setVerificationResult(null);

    const startTime = performance.now();

    try {
      const idBytes32 = stringToBytes32(targetId.trim());
      const contract = getReadonlyContract();

      const rawRes = await contract.verifyCredential(idBytes32, targetHash);
      const durationMs = Math.round(performance.now() - startTime);

      const parsedData: VerificationData = {
        result: Number(rawRes[0]) as VerificationResult,
        issuerAddress: rawRes[1],
        issuerOrg: rawRes[2],
        issuedAt: Number(rawRes[3]),
        validUntil: Number(rawRes[4]),
        relatedId: rawRes[5],
      };

      setVerificationResult({
        data: parsedData,
        idBytes32,
        verifiedHash: targetHash,
        durationMs,
      });
    } catch (err: any) {
      console.error("Verification error:", err);
      setErrorMsg(
        "Koneksi ke node EVM lokal gagal (RPC: " +
          DEFAULT_RPC_URL +
          "). " +
          (err.message || String(err))
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const loadPreset = (type: "valid" | "mismatch" | "not_found") => {
    if (type === "valid") {
      const id = "UNSIL/FT/IF/2026/001";
      const hash = "0xbc4b2372762655d368103e49ecc877018710b6171d4a1ec26d67a4f0961c9e4a";
      setCredentialIdInput(id);
      setSelectedFile(new File([new ArrayBuffer(4528)], "Ijazah_Asli_M_Zikri.pdf", { type: "application/pdf" }));
      setFileHash(hash);
      executeVerification(id, hash);
    } else if (type === "mismatch") {
      const id = "UNSIL/FT/IF/2026/001";
      const hash = "0x095df7b6f70de3b65593e9a59cfd7d56e9c1d04427513ff6230f81a700da6811";
      setCredentialIdInput(id);
      setSelectedFile(new File([new ArrayBuffer(4528)], "Ijazah_Palsu_Manipulasi.pdf", { type: "application/pdf" }));
      setFileHash(hash);
      executeVerification(id, hash);
    } else if (type === "not_found") {
      const id = "UNSIL/FT/IF/2026/999";
      const hash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      setCredentialIdInput(id);
      setSelectedFile(new File([new ArrayBuffer(2048)], "Dokumen_Fiktif.pdf", { type: "application/pdf" }));
      setFileHash(hash);
      executeVerification(id, hash);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("preset");
    if (preset === "valid" || preset === "mismatch" || preset === "not_found") {
      loadPreset(preset);
    }
  }, []);

  const handleVerify = async () => {
    executeVerification(credentialIdInput, fileHash);
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const resetForm = () => {
    setCredentialIdInput("");
    setSelectedFile(null);
    setFileHash("");
    setVerificationResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-12">
      {/* Vercel-Style Hero Header */}
      <section className="text-center space-y-3 pt-6 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.04em] text-[#171717]">
          Verifikasi Kredensial Akademik
        </h1>
        <p className="text-sm sm:text-base text-[#666666] font-normal leading-relaxed">
          Verifikasi integritas sertifikat terhadap ledger EVM secara instan. Berkas diproses lokal di peramban tanpa pernah diunggah ke server pihak ketiga.
        </p>

        {/* Quick Demo Presets */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <span className="text-xs text-[#8f8f8f] font-mono">Uji Coba Cepat:</span>
          <button
            onClick={() => loadPreset("valid")}
            className="text-xs px-2.5 py-1 rounded-full bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] hover:bg-[#dcfce7] transition-all font-medium flex items-center gap-1 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></span>
            Ijazah Asli (VALID)
          </button>
          <button
            onClick={() => loadPreset("mismatch")}
            className="text-xs px-2.5 py-1 rounded-full bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] hover:bg-[#fee2e2] transition-all font-medium flex items-center gap-1 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626]"></span>
            Manipulasi (MISMATCH)
          </button>
          <button
            onClick={() => loadPreset("not_found")}
            className="text-xs px-2.5 py-1 rounded-full bg-[#f5f5f5] text-[#525252] border border-[#e5e5e5] hover:bg-[#ebebeb] transition-all font-medium flex items-center gap-1 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#737373]"></span>
            Tidak Terdaftar (NOT FOUND)
          </button>
        </div>
      </section>

      {/* Main Verification Card */}
      <div className="max-w-xl mx-auto bg-white border border-[#ebebeb] rounded-xl p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="space-y-5">
          {/* Input 1: Credential ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-[#171717]">
              <label>Nomor Identitas Kredensial (ID)</label>
              <span className="text-[11px] font-mono text-[#8f8f8f]">Contoh: UNSIL/FT/IF/2026/001</span>
            </div>
            <input
              type="text"
              placeholder="Masukkan Nomor Ijazah..."
              value={credentialIdInput}
              onChange={(e) => setCredentialIdInput(e.target.value)}
              className="w-full bg-white border border-[#ebebeb] rounded-md px-3.5 py-2.5 text-sm text-[#171717] placeholder-[#a1a1a1] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-all"
            />
            {credentialIdInput && (
              <div className="text-[10px] font-mono text-[#8f8f8f] truncate pt-0.5">
                keccak256(id): {truncateHash(stringToBytes32(credentialIdInput), 12, 8)}
              </div>
            )}
          </div>

          {/* Input 2: Dropzone PDF */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-[#171717]">
              <label>Berkas PDF Ijazah Asli</label>
              <span className="text-[11px] font-mono text-[#666666]">Client Hashing (UU PDP)</span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-[#171717] bg-[#f5f5f5]"
                  : selectedFile
                  ? "border-[#d4d4d4] bg-[#fafafa]"
                  : "border-[#ebebeb] bg-[#fafafa] hover:border-[#cccccc] hover:bg-[#f5f5f5]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-10 h-10 rounded-md bg-white border border-[#ebebeb] text-[#171717] flex items-center justify-center shadow-xs">
                    <FileText className="w-5 h-5 text-[#171717]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#171717]">{selectedFile.name}</p>
                    <p className="text-[11px] font-mono text-[#8f8f8f]">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; Klik untuk mengganti berkas
                    </p>
                  </div>

                  {isHashing ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#0070f3] pt-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghitung sidik jari Keccak-256...</span>
                    </div>
                  ) : fileHash ? (
                    <div className="w-full bg-white border border-[#ebebeb] rounded p-2 text-left font-mono text-[11px] text-[#666666] break-all">
                      <span className="text-[#8f8f8f] block text-[9px] uppercase tracking-wider mb-0.5">
                        Client Keccak-256 Digest:
                      </span>
                      <span className="text-[#171717]">{fileHash}</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-3">
                  <div className="w-9 h-9 rounded-md bg-white border border-[#ebebeb] text-[#8f8f8f] flex items-center justify-center shadow-xs">
                    <UploadCloud className="w-4 h-4 text-[#8f8f8f]" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-[#171717]">
                      Tarik berkas PDF ke sini atau <span className="text-[#0070f3] underline underline-offset-2">pilih dari perangkat</span>
                    </p>
                    <p className="text-[11px] font-mono text-[#8f8f8f]">Maksimal ukuran 25 MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-md bg-[#fff0f0] border border-[#ffcccc] text-[#e00000] text-xs font-mono">
              {errorMsg}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              onClick={handleVerify}
              disabled={isVerifying || isHashing || !fileHash || !credentialIdInput.trim()}
              className="flex-1 py-2.5 px-4 rounded-md font-medium text-xs sm:text-sm bg-[#171717] hover:bg-[#333333] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengecek Consensus Ledger...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Verifikasi Keaslian</span>
                </>
              )}
            </button>

            {(selectedFile || credentialIdInput) && (
              <button
                onClick={resetForm}
                className="py-2.5 px-3.5 rounded-md border border-[#ebebeb] hover:bg-[#f5f5f5] text-[#666666] hover:text-[#171717] text-xs font-medium transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vercel Deployment-Style Result Card */}
      {verificationResult && (
        <section className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
          {(() => {
            const config = RESULT_CONFIG[verificationResult.data.result];
            const data = verificationResult.data;

            return (
              <div className="rounded-xl border border-[#ebebeb] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
                {/* Status Bar */}
                <div className="p-5 border-b border-[#ebebeb] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor} shrink-0`}></span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#171717]">
                          {config.label}
                        </span>
                        <span className="text-[10px] font-mono text-[#8f8f8f]">
                          &bull; {verificationResult.durationMs}ms response
                        </span>
                      </div>
                      <h2 className="text-sm font-medium text-[#4d4d4d] mt-0.5">
                        {config.title}
                      </h2>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#ebebeb] bg-[#fafafa] text-[#666666]">
                    0 Gas View
                  </span>
                </div>

                {/* Description */}
                <div className="px-5 py-3.5 bg-[#fafafa] text-xs text-[#666666] border-b border-[#ebebeb] leading-relaxed">
                  {config.description}
                </div>

                {/* Technical Key-Value Table */}
                {data.result !== VerificationResult.NOT_FOUND && (
                  <div className="divide-y divide-[#f2f2f2] text-xs font-mono">
                    <div className="px-5 py-3 flex items-center justify-between">
                      <span className="text-[#8f8f8f]">Lembaga Penerbit</span>
                      <span className="text-[#171717] font-sans font-medium text-right">
                        {data.issuerOrg || "Tidak Tercantum"}
                      </span>
                    </div>

                    <div className="px-5 py-3 flex items-center justify-between">
                      <span className="text-[#8f8f8f]">Waktu Penerbitan</span>
                      <span className="text-[#171717] text-right font-sans">
                        {data.issuedAt > 0 ? formatUnixDate(data.issuedAt) : "-"}
                      </span>
                    </div>

                    <div className="px-5 py-3 flex items-center justify-between">
                      <span className="text-[#8f8f8f]">Masa Berlaku</span>
                      <span className="text-[#171717] text-right font-sans">
                        {formatUnixDate(data.validUntil)}
                      </span>
                    </div>

                    <div className="px-5 py-3 flex items-center justify-between">
                      <span className="text-[#8f8f8f]">Issuer Wallet</span>
                      <div className="flex items-center gap-2 text-[#171717]">
                        <span>{truncateHash(data.issuerAddress, 8, 6)}</span>
                        <button
                          onClick={() => copyToClipboard(data.issuerAddress, "issuer")}
                          className="text-[#8f8f8f] hover:text-[#171717]"
                          title="Salin Wallet"
                        >
                          {copiedField === "issuer" ? <Check className="w-3 h-3 text-[#00875a]" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lineage Info for SUPERSEDED */}
                {data.result === VerificationResult.SUPERSEDED && data.relatedId && data.relatedId !== "0x0000000000000000000000000000000000000000000000000000000000000000" && (
                  <div className="p-4 bg-[#f0f7ff] border-t border-[#cce5ff] text-xs font-mono text-[#0070f3] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 shrink-0" />
                      <span>Ralat ID: {truncateHash(data.relatedId, 10, 8)}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(data.relatedId, "relatedId")}
                      className="text-[#0070f3] hover:underline"
                    >
                      Salin Pointer
                    </button>
                  </div>
                )}

                {/* Footer Metadata */}
                <div className="p-4 bg-[#fafafa] border-t border-[#ebebeb] text-[11px] font-mono text-[#8f8f8f] flex items-center justify-between">
                  <span>Contract: {truncateHash(CONTRACT_ADDRESS, 6, 4)}</span>
                  <span>Digest: {truncateHash(verificationResult.verifiedHash, 6, 4)}</span>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* Compliance Card */}
      <section className="max-w-xl mx-auto rounded-xl border border-[#ebebeb] bg-[#fafafa] p-5 text-xs text-[#666666] space-y-2 font-mono">
        <div className="flex items-center gap-2 text-[#171717] font-medium font-sans">
          <Shield className="w-4 h-4 text-[#666666]" />
          <span>UU Pelindungan Data Pribadi (UU No. 27/2022)</span>
        </div>
        <p className="leading-relaxed text-[11px] text-[#666666]">
          Sistem hanya memvalidasi sidik jari digital (Keccak-256) 32-byte pada smart contract. Data personal (Nama, NIK, NIM, Nilai) tidak disimpan atau ditransmisikan melalui jaringan publik.
        </p>
      </section>
    </div>
  );
}
