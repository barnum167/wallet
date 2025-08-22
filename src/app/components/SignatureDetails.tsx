"use client";

import { useState, useEffect } from "react";
import { SignatureType } from "../../lib/types/signature";

interface SignatureDetailsProps {
  message: string;
  signature: string;
  recoveredAddress: string;
  signatureType?: SignatureType;
}

// 모바일 감지 함수
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export default function SignatureDetails({ message, signature, recoveredAddress, signatureType }: SignatureDetailsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  if (!signature || !message) {
    return null;
  }

  const getSignatureTypeInfo = (type: SignatureType) => {
    switch (type) {
      case SignatureType.EIP712:
        return {
          icon: "📋",
          name: "EIP-712 Typed Data",
          shortName: "EIP-712",
          description: isMobileDevice 
            ? "구조화된 데이터 서명"
            : "구조화된 데이터 서명 (signTypedData 방식)",
          verificationSteps: [
            "도메인 및 타입 해시 계산",
            "구조화된 데이터 해시",
            "EIP-712 prefix 추가",
            "ECDSA 서명 복구"
          ]
        };
      case SignatureType.EIP7702:
        return {
          icon: "🔗",
          name: "EIP-7702 Authorization",
          shortName: "EIP-7702",
          description: isMobileDevice
            ? "권한 위임 서명"
            : "권한 위임 서명 (RLP 인코딩 → keccak256 → secp256k1)",
          verificationSteps: [
            "RLP 데이터 인코딩",
            "keccak256 다이제스트 계산",
            "secp256k1 서명 검증",
            "권한 위임 확인"
          ]
        };
      default:
        return {
          icon: "❓",
          name: "알 수 없음",
          shortName: "Unknown",
          description: "알 수 없는 서명 타입",
          verificationSteps: []
        };
    }
  };

  const typeInfo = signatureType ? getSignatureTypeInfo(signatureType) : null;

  // 주소 단축 함수
  const truncateAddress = (address: string, isMobile: boolean = false) => {
    if (isMobile) {
      return `${address.slice(0, 8)}...${address.slice(-6)}`;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 서명 단축 함수
  const truncateSignature = (sig: string, isMobile: boolean = false) => {
    if (isMobile) {
      return `${sig.slice(0, 10)}...${sig.slice(-8)}`;
    }
    return `${sig.slice(0, 12)}...${sig.slice(-10)}`;
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm w-full justify-center"
      >
        <span>{showDetails ? "🔽" : "▶️"}</span>
        상세 정보 {showDetails ? "숨기기" : "보기"}
      </button>

      {showDetails && (
        <div className="mt-3 space-y-3 bg-gray-50 p-3 rounded-lg">
          {/* 서명 타입 정보 */}
          {typeInfo && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center gap-1">
                🏷️ 서명 타입
              </h4>
              <div className="bg-white p-3 rounded border space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{typeInfo.icon}</span>
                  <span className="font-medium text-sm">
                    {isMobileDevice ? typeInfo.shortName : typeInfo.name}
                  </span>
                </div>
                <div className="text-xs text-gray-600">{typeInfo.description}</div>
                <div className="text-xs">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                    {signatureType?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 메시지 정보 */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center gap-1">
              📝 메시지
            </h4>
            <div className="text-xs space-y-2">
              <div className="bg-white p-2 rounded border">
                <span className="text-gray-600">내용:</span>
                <div className={`font-mono break-all mt-1 ${isMobileDevice ? 'text-xs' : ''}`}>
                  {isMobileDevice && message.length > 100 
                    ? `${message.slice(0, 100)}...` 
                    : message}
                </div>
                {isMobileDevice && message.length > 100 && (
                  <div className="text-xs text-gray-500 mt-1">
                    (총 {message.length}자 중 처음 100자만 표시)
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <div className="bg-white p-2 rounded border flex-1">
                  <span className="text-gray-600">길이:</span>
                  <span className="ml-2">{message.length} bytes</span>
                </div>
                {signatureType && (
                  <div className="bg-white p-2 rounded border flex-1">
                    <span className="text-gray-600">타입:</span>
                    <span className="ml-2">{typeInfo?.shortName}</span>
                  </div>
                )}
              </div>

              {/* 모바일에서는 더 간단한 팁 */}
              {signatureType === SignatureType.EIP712 && (
                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                  <span className="text-blue-700 text-xs">
                    💡 {isMobileDevice 
                      ? "구조화된 데이터로 안전하게 서명됩니다" 
                      : "EIP-712에서는 메시지가 도메인 및 타입 정보와 함께 구조화되어 서명됩니다."}
                  </span>
                </div>
              )}
              {signatureType === SignatureType.EIP7702 && (
                <div className="bg-purple-50 p-2 rounded border border-purple-200">
                  <span className="text-purple-700 text-xs">
                    💡 {isMobileDevice
                      ? "권한 위임을 위한 특별한 서명입니다"
                      : "EIP-7702에서는 메시지가 RLP 인코딩되고 keccak256으로 해시됩니다."}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 서명 정보 */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center gap-1">
              🔏 서명
            </h4>
            <div className="bg-white p-2 rounded border text-xs space-y-2">
              <div>
                <span className="text-gray-600">서명 값:</span>
                <div className="font-mono break-all mt-1 bg-gray-50 p-2 rounded">
                  {isMobileDevice ? truncateSignature(signature, true) : signature}
                  {isMobileDevice && (
                    <div className="text-xs text-gray-500 mt-1">
                      (전체 서명 길이: {signature.length}자)
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`flex ${isMobileDevice ? 'flex-col gap-1' : 'gap-4'}`}>
                <div>
                  <span className="text-gray-600">길이:</span>
                  <span className="ml-1">{signature.length} chars</span>
                </div>
                <div>
                  <span className="text-gray-600">바이트:</span>
                  <span className="ml-1">{(signature.length - 2) / 2} bytes</span>
                </div>
              </div>

              {signatureType === SignatureType.EIP7702 && (
                <div className="bg-purple-50 p-2 rounded border border-purple-200">
                  <span className="text-purple-700 text-xs">
                    💡 {isMobileDevice
                      ? "65바이트 표준 형식입니다"
                      : "EIP-7702 서명은 65바이트로 직렬화됩니다."}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 복구 정보 */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center gap-1">
              🔍 서명자
            </h4>
            <div className="bg-white p-2 rounded border text-xs space-y-2">
              <div>
                <span className="text-gray-600">복구된 주소:</span>
                <div className="font-mono break-all mt-1 bg-gray-50 p-2 rounded">
                  {isMobileDevice ? truncateAddress(recoveredAddress, true) : recoveredAddress}
                  {isMobileDevice && (
                    <div className="text-xs text-gray-500 mt-1">
                      (터치하여 전체 주소 복사 가능)
                    </div>
                  )}
                </div>
              </div>
              <div className="text-gray-600">
                {isMobileDevice 
                  ? "실제 서명자의 주소입니다"
                  : "이 주소가 실제 서명자의 Ethereum 주소입니다."}
              </div>
            </div>
          </div>

          {/* 검증 방식 정보 - 모바일에서는 간소화 */}
          {!isMobileDevice && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center gap-1">
                ✅ 검증 방식
              </h4>
              <div className="bg-white p-2 rounded border text-xs">
                {signatureType === SignatureType.EIP712 && (
                  <div className="space-y-1">
                    <div className="font-medium text-blue-700">EIP-712 검증:</div>
                    <div className="text-gray-600">
                      {typeInfo?.verificationSteps.map((step, index) => (
                        <div key={index}>{index + 1}. {step}</div>
                      ))}
                    </div>
                  </div>
                )}
                {signatureType === SignatureType.EIP7702 && (
                  <div className="space-y-1">
                    <div className="font-medium text-purple-700">EIP-7702 검증:</div>
                    <div className="text-gray-600">
                      {typeInfo?.verificationSteps.map((step, index) => (
                        <div key={index}>{index + 1}. {step}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 모바일에서만 간단한 검증 정보 */}
          {isMobileDevice && typeInfo?.verificationSteps.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm flex items-center gap-1">
                ✅ 검증 완료
              </h4>
              <div className="bg-green-50 p-2 rounded border border-green-200">
                <div className="text-green-700 text-xs">
                  ✓ {typeInfo.shortName} 표준에 따라 서명이 안전하게 검증되었습니다
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 