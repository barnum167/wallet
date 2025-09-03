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
}

interface QRCodeData {
  id: string;
  privateKey: string;
  qrUrl: string; // 개인키 접속용 QR만
  createdAt: Date;
}

export default function MultipleQRGenerator() {
  const [qrCodes, setQRCodes] = useState<QRCodeData[]>([]);
  const [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

  // 환경 변수에서 결제 데이터 생성
  const generatePaymentData = (): PaymentData | null => {
    const amount = process.env.NEXT_PUBLIC_AMOUNT_WEI;
    const recipient = process.env.NEXT_PUBLIC_TO;
    const token = process.env.NEXT_PUBLIC_TOKEN;
    const chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID;
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    const delegateAddress = process.env.NEXT_PUBLIC_DELEGATE_ADDRESS;

    if (!amount || !recipient || !token || !chainIdStr || !rpcUrl || !delegateAddress) {
      console.error('필수 환경 변수가 누락되었습니다');
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
      delegateAddress
    };
  };

  // 단일 QR 코드 생성 (개인키 접속용만)
  const generateSingleQR = async (privateKey: string): Promise<string> => {
    const paymentSiteBaseUrl = process.env.NEXT_PUBLIC_SERVER_URL;
    if (!paymentSiteBaseUrl) {
      throw new Error('NEXT_PUBLIC_SERVER_URL 환경 변수가 설정되지 않았습니다');
    }

    // 개인키 처리 (0x 접두사 자동 추가)
    let processedPrivateKey = privateKey.trim();
    if (!processedPrivateKey.startsWith('0x')) {
      processedPrivateKey = '0x' + processedPrivateKey;
    }

    const walletAccessUrl = `${paymentSiteBaseUrl}?pk=${encodeURIComponent(processedPrivateKey)}&t=${Date.now()}`;

    const qrOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    return await QRCode.toDataURL(walletAccessUrl, qrOptions);
  };

  // 새 QR 코드 추가
  const addQRCode = async () => {
    if (!privateKeyInput.trim()) {
      setError('개인키를 입력해주세요');
      return;
    }

    // 중복 개인키 확인
    const existingQR = qrCodes.find(qr => qr.privateKey === privateKeyInput.trim());
    if (existingQR) {
      setError('이미 같은 개인키로 생성된 QR 코드가 있습니다');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const qrUrl = await generateSingleQR(privateKeyInput.trim());
      const newQRCode: QRCodeData = {
        id: Date.now().toString(),
        privateKey: privateKeyInput.trim(),
        qrUrl,
        createdAt: new Date()
      };

      setQRCodes(prev => [...prev, newQRCode]);
      setPrivateKeyInput('');
    } catch (err) {
      console.error('QR 코드 생성 실패:', err);
      setError('QR 코드 생성에 실패했습니다: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // QR 코드 삭제
  const removeQRCode = (id: string) => {
    setQRCodes(prev => prev.filter(qr => qr.id !== id));
  };

  // 모든 QR 코드 삭제
  const clearAllQRCodes = () => {
    setQRCodes([]);
  };

  // 컴포넌트 마운트 시 결제 데이터 초기화
  useEffect(() => {
    setIsMounted(true);
    const data = generatePaymentData();
    if (data) {
      setPaymentData(data);
    } else {
      setError('환경 변수 설정을 확인해주세요');
    }
  }, []);

  // 주소 줄이기 함수
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 개인키 줄이기 함수 (보안을 위해)
  const shortenPrivateKey = (privateKey: string) => {
    return `${privateKey.slice(0, 8)}...${privateKey.slice(-8)}`;
  };

  // 금액을 읽기 쉬운 형태로 변환
  const formatAmount = (weiAmount: string) => {
    const bnbAmount = Number(weiAmount) / Math.pow(10, 18);
    return `${bnbAmount} BNB`;
  };

  if (!isMounted) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          오류: {error}
        </div>
      )}

      {/* QR 코드 생성 폼 */}
      <div className="mb-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">새 QR 코드 생성</h2>
        
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="privateKey" className="block text-sm font-medium text-gray-700 mb-2">
              개인키
            </label>
            <input
              id="privateKey"
              type="password"
              value={privateKeyInput}
              onChange={(e) => setPrivateKeyInput(e.target.value)}
              placeholder="개인키를 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
          
          <button
            onClick={addQRCode}
            disabled={isLoading || !privateKeyInput.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded transition-colors"
          >
            {isLoading ? '생성 중...' : 'QR 생성'}
          </button>
        </div>
      </div>

      {/* 결제 정보 표시 */}
      {paymentData && (
        <div className="mb-8 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3">결제 정보</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
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
          </div>
        </div>
      )}

      {/* QR 코드 관리 버튼들 */}
      {qrCodes.length > 0 && (
        <div className="mb-6 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            생성된 QR 코드 ({qrCodes.length}개)
          </h3>
          <button
            onClick={clearAllQRCodes}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
          >
            모두 삭제
          </button>
        </div>
      )}

      {/* QR 코드 목록 */}
      {qrCodes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>생성된 QR 코드가 없습니다</p>
          <p className="text-sm">개인키를 입력하고 QR 코드를 생성해보세요</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {qrCodes.map((qrCode) => (
            <div key={qrCode.id} className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="text-center mb-4">
                <h4 className="font-semibold text-blue-800 mb-2">결제 사이트 접속 QR</h4>
                <p className="text-xs text-blue-600 mb-3">
                  개인키: {shortenPrivateKey(qrCode.privateKey)}
                </p>
                
                <div className="mb-4">
                  <img 
                    src={qrCode.qrUrl} 
                    alt="Payment Site Access QR Code" 
                    className="mx-auto border-2 border-blue-300 rounded shadow-lg"
                  />
                </div>
                
                <p className="text-xs text-gray-500 mb-4">
                  생성 시간: {qrCode.createdAt.toLocaleString()}
                </p>
              </div>
              
              <div className="flex gap-2">
                <a
                  href={qrCode.qrUrl}
                  download={`access-qr-${qrCode.id}.png`}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded text-center text-sm transition-colors"
                >
                  다운로드
                </a>
                
                <button
                  onClick={() => removeQRCode(qrCode.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded text-sm transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 뒤로가기 버튼 */}
      <div className="mt-8 text-center">
        <a
          href="/"
          className="inline-block bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded transition-colors"
        >
          메인으로 돌아가기
        </a>
      </div>
    </div>
  );
}
