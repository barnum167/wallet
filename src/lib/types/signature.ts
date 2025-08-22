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

// 테더 결제 관련 타입 정의
export interface TetherPaymentRequest {
  recipient: string;          // 수취인 주소
  amount: string;            // 결제 금액 (USDT)
  chainId: number;           // BNB 체인 ID (56 또는 97)
  tokenAddress: string;      // USDT 컨트랙트 주소
  nonce: number;            // 트랜잭션 논스
  deadline: number;         // 만료 시간 (timestamp)
  memo?: string;            // 결제 메모
  merchantId?: string;      // 가맹점 ID
  orderId?: string;         // 주문 ID
}

export interface QRPaymentData {
  type: 'tether_payment';
  version: '1.0';
  chainId: number;
  payment: TetherPaymentRequest;
  metadata: {
    createdAt: number;
    expiresAt: number;
    merchantName?: string;
    description?: string;
  };
}

export interface PaymentStatus {
  status: 'pending' | 'signed' | 'broadcasted' | 'confirmed' | 'failed' | 'expired';
  txHash?: string;
  signature?: string;
  timestamp: number;
  error?: string;
}

// BNB 체인 네트워크 정보
export const BNB_NETWORKS = {
  mainnet: {
    chainId: 56,
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed1.binance.org/',
    blockExplorerUrl: 'https://bscscan.com',
    usdtAddress: '0x55d398326f99059fF775485246999027B3197955' // BSC USDT
  },
  testnet: {
    chainId: 97,
    name: 'BNB Smart Chain Testnet',
    symbol: 'tBNB',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    blockExplorerUrl: 'https://testnet.bscscan.com',
    usdtAddress: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd' // BSC Testnet USDT
  }
} as const; 