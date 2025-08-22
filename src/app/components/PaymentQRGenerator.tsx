"use client";

import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { TetherPaymentRequest, QRPaymentData, BNB_NETWORKS } from "../../lib/types/signature";

interface PaymentQRGeneratorProps {
  isConnected: boolean;
  currentChainId?: number;
}

// 모바일 감지 함수
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export default function PaymentQRGenerator({ isConnected, currentChainId }: PaymentQRGeneratorProps) {
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [paymentData, setPaymentData] = useState<QRPaymentData | null>(null);
  
  // 결제 폼 상태
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [memo, setMemo] = useState<string>("");
  const [merchantName, setMerchantName] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [isTestnet, setIsTestnet] = useState<boolean>(true);

  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  // 현재 네트워크 정보 가져오기
  const getCurrentNetwork = useCallback(() => {
    if (isTestnet) {
      return BNB_NETWORKS.testnet;
    }
    return BNB_NETWORKS.mainnet;
  }, [isTestnet]);

  // QR 코드 생성 함수
  const generatePaymentQR = useCallback(async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) {
      alert("수취인 주소와 유효한 금액을 입력해주세요.");
      return;
    }

    setIsGenerating(true);
    try {
      const network = getCurrentNetwork();
      const now = Date.now();
      const deadline = now + (30 * 60 * 1000); // 30분 후 만료

      const paymentRequest: TetherPaymentRequest = {
        recipient: recipient.trim(),
        amount: amount,
        chainId: network.chainId,
        tokenAddress: network.usdtAddress,
        nonce: Math.floor(Math.random() * 1000000),
        deadline: Math.floor(deadline / 1000),
        memo: memo.trim() || undefined,
        orderId: orderId.trim() || undefined
      };

      const qrData: QRPaymentData = {
        type: 'tether_payment',
        version: '1.0',
        chainId: network.chainId,
        payment: paymentRequest,
        metadata: {
          createdAt: Math.floor(now / 1000),
          expiresAt: Math.floor(deadline / 1000),
          merchantName: merchantName.trim() || undefined,
          description: memo.trim() || undefined
        }
      };

      // QR 코드 데이터를 JSON 문자열로 변환
      const qrString = JSON.stringify(qrData);
      
      // QR 코드 생성
      const qrUrl = await QRCode.toDataURL(qrString, {
        width: isMobileDevice ? 200 : 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M'
      });

      setQrCodeUrl(qrUrl);
      setPaymentData(qrData);
    } catch (error) {
      console.error("QR 코드 생성 실패:", error);
      alert("QR 코드 생성에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }, [recipient, amount, memo, merchantName, orderId, getCurrentNetwork, isMobileDevice]);

  // 폼 초기화
  const resetForm = useCallback(() => {
    setRecipient("");
    setAmount("");
    setMemo("");
    setMerchantName("");
    setOrderId("");
    setQrCodeUrl("");
    setPaymentData(null);
  }, []);

  // 샘플 데이터 입력
  const fillSampleData = useCallback(() => {
    setRecipient("0x742d35Cc6634C0532925a3b8D2bE0D4C7C4b4E46");
    setAmount("10.00");
    setMemo("테스트 결제");
    setMerchantName("테스트 상점");
    setOrderId(`ORDER-${Date.now()}`);
  }, []);

  const network = getCurrentNetwork();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">💰</span>
        테더 결제 QR 생성
      </h2>

      {/* 네트워크 선택 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          네트워크 선택
        </label>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="network"
              checked={isTestnet}
              onChange={() => setIsTestnet(true)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">BSC Testnet</span>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">테스트</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="network"
              checked={!isTestnet}
              onChange={() => setIsTestnet(false)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">BSC Mainnet</span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">실제</span>
          </label>
        </div>
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
          📡 {network.name} (Chain ID: {network.chainId})
        </div>
      </div>

      {/* 결제 정보 입력 폼 */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            수취인 주소 *
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            결제 금액 (USDT) *
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
        </div>

        <div className={`grid ${isMobileDevice ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-4'}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              가맹점명
            </label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="상점 이름"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              주문 ID
            </label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="ORDER-123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            결제 메모
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="결제 설명..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
            rows={2}
          />
        </div>
      </div>

      {/* 액션 버튼들 */}
      <div className="flex gap-2 mt-6">
        <button
          onClick={generatePaymentQR}
          disabled={!recipient || !amount || isGenerating}
          className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              생성 중...
            </>
          ) : (
            <>
              📱 QR 생성
            </>
          )}
        </button>
        
        <button
          onClick={fillSampleData}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 text-sm"
        >
          📝 샘플
        </button>
        
        <button
          onClick={resetForm}
          className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 text-sm"
        >
          🔄 초기화
        </button>
      </div>

      {/* QR 코드 표시 */}
      {qrCodeUrl && paymentData && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-medium text-gray-800 mb-3 text-center">
            💳 결제 QR 코드
          </h3>
          
          <div className="flex flex-col items-center space-y-3">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <img 
                src={qrCodeUrl} 
                alt="Payment QR Code" 
                className="max-w-full h-auto"
              />
            </div>
            
            <div className="text-center space-y-1">
              <div className="text-sm font-medium text-gray-800">
                💰 {paymentData.payment.amount} USDT
              </div>
              <div className="text-xs text-gray-600">
                👤 {paymentData.payment.recipient.slice(0, 8)}...{paymentData.payment.recipient.slice(-6)}
              </div>
              {paymentData.metadata.merchantName && (
                <div className="text-xs text-blue-600">
                  🏪 {paymentData.metadata.merchantName}
                </div>
              )}
              <div className="text-xs text-gray-500">
                ⏰ {new Date(paymentData.metadata.expiresAt * 1000).toLocaleString('ko-KR')} 만료
              </div>
            </div>
          </div>

          {/* 사용 안내 */}
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <div className="text-blue-700 text-xs">
              <div className="font-medium mb-1">📱 사용 방법:</div>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>고객이 지갑 앱으로 QR 코드 스캔</li>
                <li>결제 정보 확인 후 EIP-712 서명</li>
                <li>서명된 트랜잭션을 서버로 전송</li>
                <li>서버에서 가스비 대납하여 실행</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 