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
  productName: string;
  // privateKey는 제거 - 첫 번째 QR에서 스캔한 개인키 사용
}

export default function QRGenerator() {
  const [walletQRUrl, setWalletQRUrl] = useState<string>('');
  const [paymentQRUrl, setPaymentQRUrl] = useState<string>(''); // 항상 표시
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [privateKey, setPrivateKey] = useState<string>('');
  const [privateKeyInput, setPrivateKeyInput] = useState<string>(''); // 사용자 입력용
  const [isLoadingWallet, setIsLoadingWallet] = useState(false); // 접속용 QR 로딩
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

  // 결제 정보 QR 생성 (항상 실행)
  const generatePaymentQR = async () => {
    try {
      const data = generatePaymentData();
      if (!data) {
        throw new Error('필수 환경 변수가 누락되어 결제 데이터를 생성할 수 없습니다');
      }

      const paymentSiteBaseUrl = process.env.NEXT_PUBLIC_SERVER_URL;
      if (!paymentSiteBaseUrl) {
        throw new Error('NEXT_PUBLIC_SERVER_URL 환경 변수가 설정되지 않았습니다');
      }

      // 결제 정보 QR 데이터 생성 (개인키 제외)
      const paymentQRData: PaymentQRData = {
        type: 'payment_request',
        amount: data.amount,
        recipient: data.recipient,
        token: data.token,
        chainId: data.chainId,
        rpcUrl: data.rpcUrl,
        delegateAddress: data.delegateAddress,
        serverUrl: paymentSiteBaseUrl,
        productName: 'CUBE COFFEE'
      };

      const qrOptions = {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const paymentQR = await QRCode.toDataURL(JSON.stringify(paymentQRData), qrOptions);
      setPaymentQRUrl(paymentQR);
      setPaymentData(data);
    } catch (err) {
      console.error('결제 정보 QR 생성 실패:', err);
      setError('결제 정보 QR 생성에 실패했습니다: ' + (err as Error).message);
    }
  };

  // 접속용 QR 생성 (개인키 입력 후)
  const generateWalletQR = async () => {
    if (!privateKeyInput.trim()) {
      setError('개인키를 입력해주세요');
      return;
    }

    setIsLoadingWallet(true);
    setError('');

    try {
      let walletPrivateKey = privateKeyInput.trim();
      
      // 0x 접두사 처리
      if (!walletPrivateKey.startsWith('0x')) {
        walletPrivateKey = '0x' + walletPrivateKey;
      }
      
      // 개인키 길이 검증 (0x + 64 hex chars = 66)
      if (walletPrivateKey.length !== 66) {
        throw new Error('개인키는 64자리 16진수여야 합니다');
      }

      const paymentSiteBaseUrl = process.env.NEXT_PUBLIC_SERVER_URL;
      if (!paymentSiteBaseUrl) {
        throw new Error('NEXT_PUBLIC_SERVER_URL 환경 변수가 설정되지 않았습니다');
      }

      const walletAccessUrl = `${paymentSiteBaseUrl}?pk=${encodeURIComponent(walletPrivateKey)}&t=${Date.now()}`;
      
      const qrOptions = {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const walletQR = await QRCode.toDataURL(walletAccessUrl, qrOptions);
      setWalletQRUrl(walletQR);
      setPrivateKey(walletPrivateKey);
    } catch (err) {
      console.error('접속용 QR 생성 실패:', err);
      setError('접속용 QR 생성에 실패했습니다: ' + (err as Error).message);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  // 컴포넌트 마운트 시 결제 정보 QR 자동 생성
  useEffect(() => {
    setIsMounted(true);
    generatePaymentQR(); // 결제 정보 QR은 항상 생성
  }, []);

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

      {!isMounted ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* 결제 정보 QR - 항상 표시 */}
          {paymentQRUrl && (
            <div className="text-center bg-green-50 p-6 rounded-lg border border-green-200 mx-auto max-w-md">
              <h3 className="font-semibold text-green-800 mb-4 text-lg">결제 정보 QR</h3>
              <p className="text-sm text-green-600 mb-4">개인키 접속 후 이 QR을 스캔해서 결제</p>
              <div className="mb-4">
                <img 
                  src={paymentQRUrl} 
                  alt="Payment Information QR Code" 
                  className="mx-auto border-2 border-green-300 rounded shadow-lg"
                />
              </div>
              <a
                href={paymentQRUrl}
                download={`payment-info-qr.png`}
                className="inline-block bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded text-center transition-colors"
              >
                결제 정보 QR 다운로드
              </a>
            </div>
          )}

          {/* 구분선 */}
          <div className="flex items-center justify-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">개인키 접속용 QR 생성</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* 개인키 입력 폼 */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">개인키 접속용 QR 생성</h2>
            
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700 mb-2">
                  개인키를 입력하세요
                </label>
                <input
                  id="privateKey"
                  type="password"
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  placeholder="개인키를 입력하세요 (0x 생략 가능)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoadingWallet}
                />
              </div>
              
              <button
                onClick={generateWalletQR}
                disabled={isLoadingWallet || !privateKeyInput.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded transition-colors"
              >
                {isLoadingWallet ? '생성 중...' : 'QR 생성'}
              </button>
            </div>

            {/* 로딩 상태 표시 */}
            {isLoadingWallet && (
              <div className="mt-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-blue-600">접속용 QR 코드 생성 중...</p>
              </div>
            )}
          </div>

          {/* 생성된 접속용 QR */}
          {walletQRUrl && (
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
              <div className="flex gap-2 justify-center">
                <a
                  href={walletQRUrl}
                  download={`access-qr-${Date.now()}.png`}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-center transition-colors"
                >
                  사이트 접속 QR 다운로드
                </a>
                <button
                  onClick={() => {
                    setWalletQRUrl('');
                    setPrivateKeyInput('');
                    setPrivateKey('');
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  다른 개인키로 생성
                </button>
              </div>
            </div>
          )}

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
                  <span className="text-gray-600">개인키:</span>
                  <span className="font-mono text-xs">{privateKey.substring(0, 8)}...{privateKey.substring(privateKey.length - 8)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">생성 시간:</span>
                  <span className="text-xs">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* 추가 기능 링크 */}
          <div className="text-center">
            <a
              href="/create-qr"
              className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-6 rounded transition-colors"
            >
              여러 개인키로 QR 생성하기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
