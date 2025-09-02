'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface PaymentData {
  amount: string;
  recipient: string;
  token: string;
  chainId: number;
  rpcUrl: string;
  delegateAddress: string;
  privateKeyRequired: boolean;
  timestamp: number;
}

interface WalletInfoQRData {
  type: 'wallet_info';
  privateKey: string;
  paymentSiteUrl: string;
  timestamp: number;
}

interface PaymentQRData {
  type: 'payment_request';
  amount: string;
  recipient: string;
  token: string;
  chainId: number;
  rpcUrl: string;
  delegateAddress: string;
  serverUrl: string;
  privateKey: string;
  timestamp: number;
}

export default function QRGenerator() {
  const [walletQRUrl, setWalletQRUrl] = useState<string>('');
  const [paymentQRUrl, setPaymentQRUrl] = useState<string>('');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [privateKey, setPrivateKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

  // 환경 변수에서 결제 데이터 생성
  const generatePaymentData = (): PaymentData => {
    return {
      amount: process.env.NEXT_PUBLIC_AMOUNT_WEI || '5000000000000000',
      recipient: process.env.NEXT_PUBLIC_TO || '0xAD3512fF38270acF364b8c161EAcAD63C17e1124',
      token: process.env.NEXT_PUBLIC_TOKEN || '0xcb51DD86459AB5CA0cDB4BD91915D9de8e958677',
      chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 97,
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com',
      delegateAddress: process.env.NEXT_PUBLIC_DELEGATE_ADDRESS || '0xD1B4BBE7B6414Fe912B927E0DFD4E44ccbF38Cf6',
      privateKeyRequired: true,
      timestamp: Date.now()
    };
  };

  // 고정된 개인키 사용 (환경변수에서 미리 정의된 지갑 사용)
  const getOrCreatePrivateKey = (): string => {
    // 환경변수에서 미리 정의된 개인키 확인
    const envPrivateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
    if (envPrivateKey) {
      return envPrivateKey;
    }
    
    // 로컬 스토리지에서 기존 개인키 확인
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wallet_private_key');
      if (stored) {
        return stored;
      }
    }
    
    // 새로운 개인키 생성
    const newPrivateKey = generatePrivateKey();
    
    // 로컬 스토리지에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallet_private_key', newPrivateKey);
    }
    
    return newPrivateKey;
  };

  // 개인키 생성 (실제로는 더 안전한 방법 사용)
  const generatePrivateKey = (): string => {
    // 실제 구현에서는 암호학적으로 안전한 랜덤 생성기 사용
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return '0x' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  // QR 코드 생성 (2개) - 완전 독립 모드
  const generateQRCodes = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = generatePaymentData();
      const walletPrivateKey = getOrCreatePrivateKey();
      
      setPaymentData(data);
      setPrivateKey(walletPrivateKey);

      // 1. 클라이언트에서 독립적으로 QR 코드 생성
      console.log('완전 독립 모드: 세션 없이 QR 코드 생성');
      console.log('생성된 결제 데이터:', {
        amount: data.amount,
        recipient: data.recipient,
        token: data.token,
        chainId: data.chainId,
        rpcUrl: data.rpcUrl,
        delegateAddress: data.delegateAddress,
        privateKeyRequired: data.privateKeyRequired,
        timestamp: data.timestamp
      });

      // 2. 첫 번째 QR: 단순 URL로 변경 (일반 QR 스캔 앱에서도 작동)
      const paymentSiteBaseUrl = process.env.NEXT_PUBLIC_SERVER_URL;
      const walletAccessUrl = `${paymentSiteBaseUrl}?pk=${encodeURIComponent(walletPrivateKey)}&t=${Date.now()}`;
      
      console.log('Wallet Access URL:', walletAccessUrl); // 디버깅용

      // 3. 결제 정보 QR 데이터 생성 (개인키 포함, 고정 타임스탬프로 항상 동일한 QR 생성)
      const paymentQRData: PaymentQRData = {
        type: 'payment_request',
        amount: data.amount,
        recipient: data.recipient,
        token: data.token,
        chainId: data.chainId,
        rpcUrl: data.rpcUrl,
        delegateAddress: data.delegateAddress,
        serverUrl: process.env.NEXT_PUBLIC_SERVER_URL!,
        privateKey: walletPrivateKey,
        timestamp: 1704067200000 // 고정된 타임스탬프 (2024-01-01 00:00:00 UTC)
      };

      // QR 코드 생성 옵션
      const qrOptions = {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      // QR 코드 생성
      const [walletQR, paymentQR] = await Promise.all([
        QRCode.toDataURL(walletAccessUrl, qrOptions), // 첫 번째 QR: 단순 URL
        QRCode.toDataURL(JSON.stringify(paymentQRData), qrOptions) // 두 번째 QR: JSON 데이터
      ]);

      setWalletQRUrl(walletQR);
      setPaymentQRUrl(paymentQR);
    } catch (err) {
      console.error('QR 코드 생성 실패:', err);
      setError('QR 코드 생성에 실패했습니다: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 클라이언트 사이드 렌더링 활성화
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 클라이언트에서 마운트된 후 QR 코드 생성
  useEffect(() => {
    if (isMounted) {
      generateQRCodes();
    }
  }, [isMounted]);

  // 주소 줄이기 함수
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 금액을 읽기 쉬운 형태로 변환 (WEI -> BNB)
  const formatAmount = (weiAmount: string) => {
    const bnbAmount = Number(weiAmount) / Math.pow(10, 18);
    return `${bnbAmount} BNB (${weiAmount} WEI)`;
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          오류: {error}
        </div>
      )}

      {!isMounted || isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">QR 코드 생성 중...</p>
        </div>
      ) : walletQRUrl && paymentQRUrl ? (
        <div className="space-y-6">

          {/* QR 코드들 - 세로 배치로 충분한 간격 확보 */}
          <div className="space-y-12">
            {/* 첫 번째 QR 코드 - 결제 사이트 접속용 */}
            <div className="text-center bg-blue-50 p-6 rounded-lg border border-blue-200 mx-auto max-w-md">
              <h3 className="font-semibold text-blue-800 mb-4 text-lg">결제 사이트 접속 QR</h3>
              <p className="text-sm text-blue-600 mb-4">일반 QR 앱으로 스캔하면 바로 결제 사이트로 이동</p>
              <div className="mb-4">
                <img 
                  src={walletQRUrl} 
                  alt="Payment Site Access QR Code" 
                  className="mx-auto border-2 border-blue-300 rounded shadow-lg"
                />
              </div>
            </div>

            {/* 구분선 */}
            <div className="flex items-center justify-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* 두 번째 QR 코드 - 직접 결제용 (고정, 독립적) */}
            <div className="text-center bg-green-50 p-6 rounded-lg border border-green-200 mx-auto max-w-md">
              <h3 className="font-semibold text-green-800 mb-4 text-lg">직접 결제 QR (고정)</h3>
              <p className="text-sm text-green-600 mb-4">결제 사이트에서 스캔하면 즉시 결제</p>
              <div className="mb-4">
                <img 
                  src={paymentQRUrl} 
                  alt="Direct Payment QR Code" 
                  className="mx-auto border-2 border-green-300 rounded shadow-lg"
                />
              </div>
            </div>
          </div>

          {/* 결제 정보 */}
          {paymentData && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-gray-800 mb-3">결제 정보</h3>
              
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">금액:</span>
                  <span className="font-medium">{formatAmount(paymentData.amount)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">받는 주소:</span>
                  <span className="font-mono text-xs">{shortenAddress(paymentData.recipient)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">토큰:</span>
                  <span className="font-mono text-xs">{shortenAddress(paymentData.token)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">체인:</span>
                  <span className="font-medium">BSC Testnet ({paymentData.chainId})</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">지갑 주소:</span>
                  <span className="font-mono text-xs">{shortenAddress(privateKey)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">생성 시간:</span>
                  <span className="text-xs">{new Date(paymentData.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="grid md:grid-cols-3 gap-2">
            <button
              onClick={generateQRCodes}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              새 QR 코드 생성
            </button>
            
            <a
              href={walletQRUrl}
              download={`access-qr-${paymentData?.timestamp || 'qr'}.png`}
              className="block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-center transition-colors"
            >
              사이트 접속 QR 다운로드
            </a>
            
            <a
              href={paymentQRUrl}
              download={`payment-qr-fixed.png`}
              className="block bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded text-center transition-colors"
            >
              직접 결제 QR 다운로드
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
