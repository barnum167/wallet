export enum SignatureType {
  EIP712 = 'eip712',
  EIP7702 = 'eip7702'
}

export interface SignatureInfo {
  signature: string;
  r: string;
  s: string;
  v: number;
  recoveryId: number;
  compact: string;
}

export interface VerificationResult {
  isValid: boolean;
  recoveredAddress: string;
  message?: string;
  signatureInfo?: SignatureInfo;
  signatureType?: SignatureType;
}

export interface WalletState {
  account: string;
  isConnected: boolean;
  chainId?: number;
  network?: string;
}

// EIP-712 타입 정의
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface EIP712Types {
  [key: string]: Array<{
    name: string;
    type: string;
  }>;
}

export interface EIP712Message {
  [key: string]: string | number | boolean | bigint;
}

// EIP-7702 타입 정의
export interface EIP7702Authorization {
  chainId: bigint;
  delegator: string;
  nonce: bigint;
} 