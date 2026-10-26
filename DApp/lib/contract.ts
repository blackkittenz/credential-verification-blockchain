import { ethers } from "ethers";
import deployedInfo from "@/contracts/deployed-contract.json";

export const DEFAULT_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.prizftm.my.id";
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || deployedInfo.address;
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || deployedInfo.chainId || 31337;
export const NETWORK_NAME = process.env.NEXT_PUBLIC_NETWORK_NAME || "UNSIL Blockchain Private";
export const CONTRACT_ABI = deployedInfo.abi;

export enum VerificationResult {
  VALID = 0,
  HASH_MISMATCH = 1,
  REVOKED = 2,
  EXPIRED = 3,
  SUPERSEDED = 4,
  NOT_FOUND = 5,
}

export interface VerificationData {
  result: VerificationResult;
  issuerAddress: string;
  issuerOrg: string;
  issuedAt: number;
  validUntil: number;
  relatedId: string;
}

export const RESULT_CONFIG = {
  [VerificationResult.VALID]: {
    label: "VALID",
    title: "Ijazah Otentik & Terverifikasi Sah",
    dotColor: "bg-[#00875a]",
    badgeClass: "bg-white text-[#00875a] border-[#ebebeb]",
    borderClass: "border-[#ebebeb]",
    bgClass: "bg-white",
    description: "Sidik jari kriptografis dokumen PDF cocok 100% dengan catatan permanen di Local EVM Node.",
  },
  [VerificationResult.HASH_MISMATCH]: {
    label: "HASH MISMATCH",
    title: "Dokumen Terindikasi Manipulasi / Palsu",
    dotColor: "bg-[#e00000]",
    badgeClass: "bg-white text-[#e00000] border-[#ebebeb]",
    borderClass: "border-[#ebebeb]",
    bgClass: "bg-white",
    description: "Nomor ID terdaftar, namun berkas PDF yang disajikan memiliki sidik jari berbeda (Avalanche Effect).",
  },
  [VerificationResult.REVOKED]: {
    label: "REVOKED",
    title: "Kredensial Resmi Telah Dicabut",
    dotColor: "bg-[#d97706]",
    badgeClass: "bg-white text-[#d97706] border-[#ebebeb]",
    borderClass: "border-[#ebebeb]",
    bgClass: "bg-white",
    description: "Dokumen ini sebelumnya sah, namun telah dicabut secara permanen oleh institusi penerbit on-chain.",
  },
  [VerificationResult.EXPIRED]: {
    label: "EXPIRED",
    title: "Masa Berlaku Telah Kedaluwarsa",
    dotColor: "bg-[#d97706]",
    badgeClass: "bg-white text-[#d97706] border-[#ebebeb]",
    borderClass: "border-[#ebebeb]",
    bgClass: "bg-white",
    description: "Kredensial ini telah melampaui batas waktu validitas otomatis (block.timestamp > validUntil).",
  },
  [VerificationResult.SUPERSEDED]: {
    label: "SUPERSEDED",
    title: "Dokumen Telah Diralat ke Versi Baru",
    dotColor: "bg-[#0070f3]",
    badgeClass: "bg-white text-[#0070f3] border-[#ebebeb]",
    borderClass: "border-[#ebebeb]",
    bgClass: "bg-white",
    description: "Dokumen ini telah digantikan oleh versi ralat yang baru (Immutable Lineage Tracking).",
  },
  [VerificationResult.NOT_FOUND]: {
    label: "NOT FOUND",
    title: "ID Kredensial Tidak Terdaftar",
    dotColor: "bg-[#8f8f8f]",
    badgeClass: "bg-white text-[#666666] border-[#ebebeb]",
    borderClass: "border-[#ebebeb]",
    bgClass: "bg-white",
    description: "Nomor ID dokumen ini tidak pernah diterbitkan atau dicatat di buku besar blockchain.",
  },
};

/**
 * Public Read-Only Contract instance (0 Gas Fee, no wallet required).
 */
export function getReadonlyContract(): ethers.Contract {
  const provider = new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

/**
 * Signer Contract instance for mutations (requires MetaMask).
 */
export async function getSignerContract(): Promise<{ contract: ethers.Contract; signer: ethers.Signer; address: string }> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("MetaMask tidak terdeteksi. Silakan pasang ekstensi MetaMask di peramban Anda.");
  }

  // 1. Request account access explicitly to trigger MetaMask prompt
  await (window as any).ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider((window as any).ethereum);
  
  // 2. Switch network to UNSIL Blockchain Private (Chain ID 31337 / 0x7a69)
  try {
    await (window as any).ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${CHAIN_ID.toString(16)}`,
              chainName: NETWORK_NAME,
              rpcUrls: [DEFAULT_RPC_URL],
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            },
          ],
        });
      } catch (addError) {
        console.warn("Could not auto-add network:", addError);
      }
    } else {
      console.warn("Network switch warning:", switchError);
    }
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  return { contract, signer, address };
}
