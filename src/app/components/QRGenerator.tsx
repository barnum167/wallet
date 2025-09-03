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
}

interface WalletInfoQRData {
  type: 'wallet_info';
  privateKey: string;
  paymentSiteUrl: string;
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
  productName: string;
}

export default function QRGenerator() {
  const [walletQRUrl, setWalletQRUrl] = useState<string>('');
  const [paymentQRUrl, setPaymentQRUrl] = useState<string>('');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [privateKey, setPrivateKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

  // 환경 변수에서 결제 데이터 생성 (null 체크)
  const generatePaymentData = (): PaymentData | null => {
    const amount = process.env.NEXT_PUBLIC_AMOUNT_WEI;
    const recipient = process.env.NEXT_PUBLIC_TO;
    const token = process.env.NEXT_PUBLIC_TOKEN;
    const chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID;
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    const delegateAddress = process.env.NEXT_PUBLIC_DELEGATE_ADDRESS;

    // 필수 환경 변수들이 모두 있는지 확인
    if (!amount || !recipient || !token || !chainIdStr || !rpcUrl || !delegateAddress) {
      console.error('필수 환경 변수가 누락되었습니다:', {
        amount: !!amount,
        recipient: !!recipient,
        token: !!token,
        chainId: !!chainIdStr,
        rpcUrl: !!rpcUrl,
        delegateAddress: !!delegateAddress
      });
      return null;
    }

    const chainId = Number(chainIdStr);
    if (isNaN(chainId)) {
      console.error('NEXT_PUBLIC_CHAIN_ID가 유효한 숫자가 아닙니다:', chainIdStr);
      return null;
    }

      return {
    amount,
    recipient,
    token,
    chainId,
    rpcUrl,
    delegateAddress,
    privateKeyRequired: true
  };
  };

  // 환경변수에서 개인키 가져오기 (null 체크)
  const getPrivateKey = (): string | null => {
    const envPrivateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
    if (!envPrivateKey) {
      console.error('NEXT_PUBLIC_PRIVATE_KEY 환경 변수가 설정되지 않았습니다');
      return null;
    }
    return envPrivateKey;
  };


  // QR 코드 생성 (2개) - 완전 독립 모드
  const generateQRCodes = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = generatePaymentData();
      const walletPrivateKey = getPrivateKey();

      // 필수 데이터 검증
      if (!data) {
        throw new Error('필수 환경 변수가 누락되어 결제 데이터를 생성할 수 없습니다');
      }

      if (!walletPrivateKey) {
        throw new Error('NEXT_PUBLIC_PRIVATE_KEY 환경 변수가 설정되지 않았습니다');
      }
      
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
        privateKeyRequired: data.privateKeyRequired
      });

      // 2. 첫 번째 QR: 단순 URL로 변경 (일반 QR 스캔 앱에서도 작동)
      const paymentSiteBaseUrl = process.env.NEXT_PUBLIC_SERVER_URL;
      if (!paymentSiteBaseUrl) {
        throw new Error('NEXT_PUBLIC_SERVER_URL 환경 변수가 설정되지 않았습니다');
      }

      const walletAccessUrl = `${paymentSiteBaseUrl}?pk=${encodeURIComponent(walletPrivateKey)}&t=${Date.now()}`;
      
      console.log('Wallet Access URL:', walletAccessUrl); // 디버깅용

      // 3. 결제 정보 QR 데이터 생성 (개인키 포함)
      const paymentQRData: PaymentQRData = {
        type: 'payment_request',
        amount: data.amount,
        recipient: data.recipient,
        token: data.token,
        chainId: data.chainId,
        rpcUrl: data.rpcUrl,
        delegateAddress: data.delegateAddress,
        serverUrl: paymentSiteBaseUrl,
        privateKey: walletPrivateKey,
        productName: 'CUBE COFFEE'
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
              <h3 className="font-semibold text-blue-800 mb-4 text-lg">결제 사이트 접속 QR!!!</h3>
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
                  <span className="text-xs">{new Date().toLocaleString()}</span>
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
              download={`access-qr-${Date.now()}.png`}
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
