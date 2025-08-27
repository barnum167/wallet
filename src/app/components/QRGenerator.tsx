'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface PaymentData {
  amount: string;
  recipient: string;
  token: string;
  chainId: number;
  serverUrl: string;
  rpcUrl: string;
  delegateAddress: string;
  privateKeyRequired: boolean;
  timestamp: number;
}

interface PrivateKeyQRData {
  type: 'private_key_session';
  sessionId: string;
  privateKey: string;
  scanUrl: string;
  expiresAt: number;
  timestamp: number;
}

interface PaymentQRData {
  type: 'payment_request';
  sessionId: string;
  amount: string;
  recipient: string;
  token: string;
  chainId: number;
  serverUrl: string;
  rpcUrl: string;
  delegateAddress: string;
  timestamp: number;
}

export default function QRGenerator() {
  const [privateKeyQRUrl, setPrivateKeyQRUrl] = useState<string>('');
  const [paymentQRUrl, setPaymentQRUrl] = useState<string>('');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

  // 환경 변수에서 결제 데이터 생성
  const generatePaymentData = (): PaymentData => {
    return {
      amount: process.env.NEXT_PUBLIC_AMOUNT_WEI || '5000000000000000',
      recipient: process.env.NEXT_PUBLIC_TO || '0x3d17459bD7ea42aaA51f01F43309ADED2fb1522f',
      token: process.env.NEXT_PUBLIC_TOKEN || '0x68d23a0529eF2Fd3A0EC3be125A76c5D22a83e75',
      chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 11155111,
      serverUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'https://2d5aeee6ee5e.ngrok-free.app',
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      delegateAddress: process.env.NEXT_PUBLIC_DELEGATE_ADDRESS || '0x8ea3B7F221e883EF51175c24Fff469FE90D59669',
      privateKeyRequired: true,
      timestamp: Date.now()
    };
  };

  // 세션 ID 생성
  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 개인키 생성 (실제로는 더 안전한 방법 사용)
  const generatePrivateKey = (): string => {
    // 실제 구현에서는 암호학적으로 안전한 랜덤 생성기 사용
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return '0x' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  // QR 코드 생성 (2개)
  const generateQRCodes = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = generatePaymentData();
      const newSessionId = generateSessionId();
      const privateKey = generatePrivateKey();
      
      setPaymentData(data);
      setSessionId(newSessionId);

      // 1. 백엔드에 세션 정보 저장
      console.log('🔄 세션 생성 API 호출 시작');
      console.log('📊 세션 데이터:', {
        sessionId: newSessionId,
        serverUrl: data.serverUrl,
        paymentData: data
      });

      const sessionResponse = await fetch(`${data.serverUrl}/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: newSessionId,
          privateKey: privateKey,
          paymentData: data
        })
      });

      console.log('📡 API 응답 상태:', sessionResponse.status);

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        console.error('❌ 세션 생성 실패:', errorText);
        throw new Error(`세션 생성에 실패했습니다: ${sessionResponse.status} - ${errorText}`);
      }

      const sessionResult = await sessionResponse.json();
      console.log('✅ 세션 생성 성공:', sessionResult);
      console.log('🔗 생성된 스캔 URL:', sessionResult.scanUrl);

      // 2. 결제 정보 QR 데이터 생성 (개인키 제외)
      const paymentQRData: PaymentQRData = {
        type: 'payment_request',
        sessionId: newSessionId,
        amount: data.amount,
        recipient: data.recipient,
        token: data.token,
        chainId: data.chainId,
        serverUrl: data.serverUrl,
        rpcUrl: data.rpcUrl,
        delegateAddress: data.delegateAddress,
        timestamp: Date.now()
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

      // 1. 첫 번째 QR: 스캔 사이트 URL (세션 ID 포함)
      const scanUrl = `${data.serverUrl}/scan?session=${newSessionId}`;
      const [scanUrlQR, paymentQR] = await Promise.all([
        QRCode.toDataURL(scanUrl, qrOptions),
        QRCode.toDataURL(JSON.stringify(paymentQRData), qrOptions)
      ]);

      setPrivateKeyQRUrl(scanUrlQR);
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

  // 금액을 읽기 쉬운 형태로 변환 (WEI -> ETH)
  const formatAmount = (weiAmount: string) => {
    const ethAmount = Number(weiAmount) / Math.pow(10, 18);
    return `${ethAmount} ETH (${weiAmount} WEI)`;
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🔗 보안 강화된 2단계 가스리스 결제 QR</h2>
        <p className="text-gray-600">첫 번째 QR로 스캔 사이트에 접속한 후, 두 번째 QR로 안전하게 결제하세요</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          ❌ {error}
        </div>
      )}

      {!isMounted || isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">QR 코드 생성 중...</p>
        </div>
      ) : privateKeyQRUrl && paymentQRUrl ? (
        <div className="space-y-6">
          {/* QR 코드 순서 안내 */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">📋 스캔 순서</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1️⃣ <strong>스캔 사이트 링크 QR</strong>을 먼저 스캔합니다</li>
              <li>2️⃣ 스캔 사이트에서 <strong>결제정보 QR</strong>을 두 번째로 스캔합니다</li>
              <li>🔄 자동으로 결제가 처리됩니다</li>
            </ol>
          </div>

          {/* QR 코드들 - 세로 배치로 충분한 간격 확보 */}
          <div className="space-y-12">
            {/* 첫 번째 QR 코드 - 스캔 사이트 링크 */}
            <div className="text-center bg-blue-50 p-6 rounded-lg border border-blue-200 mx-auto max-w-md">
              <h3 className="font-semibold text-blue-800 mb-4 text-lg">1️⃣ 스캔 사이트 링크 QR (먼저 스캔)</h3>
              <div className="mb-4">
                <img 
                  src={privateKeyQRUrl} 
                  alt="Scan Site Link QR Code" 
                  className="mx-auto border-2 border-blue-300 rounded shadow-lg"
                />
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">
                  🔗 스캔 사이트로 이동하는 QR 코드
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  📱 스캔하면 바로 결제 사이트로 이동합니다
                </p>
              </div>
            </div>

            {/* 구분선 */}
            <div className="flex items-center justify-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <div className="px-4 text-gray-500 font-medium">⬇️ 첫 번째 QR 스캔 후 ⬇️</div>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* 두 번째 QR 코드 - 결제정보 */}
            <div className="text-center bg-green-50 p-6 rounded-lg border border-green-200 mx-auto max-w-md">
              <h3 className="font-semibold text-green-800 mb-4 text-lg">2️⃣ 결제정보 QR (두 번째 스캔)</h3>
              <div className="mb-4">
                <img 
                  src={paymentQRUrl} 
                  alt="Payment Data QR Code" 
                  className="mx-auto border-2 border-green-300 rounded shadow-lg"
                />
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <p className="text-sm text-green-700 font-medium">
                  💳 결제 정보가 포함된 QR 코드
                </p>
                <p className="text-xs text-green-600 mt-1">
                  ✅ 스캔 사이트에서 이 QR을 스캔하세요
                </p>
              </div>
            </div>
          </div>

          {/* 결제 정보 */}
          {paymentData && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-gray-800 mb-3">📋 결제 정보</h3>
              
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">💰 금액:</span>
                  <span className="font-medium">{formatAmount(paymentData.amount)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">📧 받는 주소:</span>
                  <span className="font-mono text-xs">{shortenAddress(paymentData.recipient)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">🪙 토큰:</span>
                  <span className="font-mono text-xs">{shortenAddress(paymentData.token)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">🔗 체인:</span>
                  <span className="font-medium">Sepolia ({paymentData.chainId})</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">🌐 서버:</span>
                  <span className="font-mono text-xs">{paymentData.serverUrl.replace('https://', '')}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">⏰ 생성 시간:</span>
                  <span className="text-xs">{new Date(paymentData.timestamp).toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">🆔 세션 ID:</span>
                  <span className="text-xs font-mono">{sessionId.substring(0, 20)}...</span>
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
              🔄 새 QR 코드 생성
            </button>
            
            <a
              href={privateKeyQRUrl}
              download={`scan-link-qr-${paymentData?.timestamp || 'qr'}.png`}
              className="block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-center transition-colors"
            >
              💾 스캔 링크 QR 다운로드
            </a>
            
            <a
              href={paymentQRUrl}
              download={`payment-qr-${paymentData?.timestamp || 'qr'}.png`}
              className="block bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded text-center transition-colors"
            >
              💾 결제정보 QR 다운로드
            </a>
          </div>

          {/* 스캔 링크 */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">📱 직접 스캔하기:</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={paymentData ? `${paymentData.serverUrl}/scan` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
              >
                🔍 기존 스캐너
              </a>
              <a
                href={paymentData ? `${paymentData.serverUrl}/scan-v2` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
              >
                🔐 2단계 스캐너
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              2단계 스캐너는 개인키와 결제정보를 분리하여 더욱 안전합니다
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
