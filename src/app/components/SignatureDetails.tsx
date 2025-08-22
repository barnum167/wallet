"use client";

import { useState } from "react";
import { SignatureType } from "../../lib/types/signature";

interface SignatureDetailsProps {
  message: string;
  signature: string;
  recoveredAddress: string;
  signatureType?: SignatureType;
}

export default function SignatureDetails({ message, signature, recoveredAddress, signatureType }: SignatureDetailsProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!signature || !message) {
    return null;
  }

  const getSignatureTypeInfo = (type: SignatureType) => {
    switch (type) {
      case SignatureType.EIP712:
        return {
          icon: "📋",
          name: "EIP-712 Typed Data",
          description: "구조화된 데이터 서명 (signTypedData 방식)"
        };
      case SignatureType.EIP7702:
        return {
          icon: "🔗",
          name: "EIP-7702 Authorization",
          description: "권한 위임 서명 (RLP 인코딩 → keccak256 → secp256k1)"
        };
      default:
        return {
          icon: "❓",
          name: "알 수 없음",
          description: "알 수 없는 서명 타입"
        };
    }
  };

  const typeInfo = signatureType ? getSignatureTypeInfo(signatureType) : null;

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
      >
        <span>{showDetails ? "🔽" : "▶️"}</span>
        상세 정보 {showDetails ? "숨기기" : "보기"}
      </button>

      {showDetails && (
        <div className="mt-3 space-y-3 bg-gray-50 p-3 rounded-lg">
          {/* 서명 타입 정보 */}
          {typeInfo && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2 text-sm">🏷️ 서명 타입</h4>
              <div className="bg-white p-3 rounded border space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{typeInfo.icon}</span>
                  <span className="font-medium text-sm">{typeInfo.name}</span>
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
            <h4 className="font-medium text-gray-700 mb-2 text-sm">📝 메시지</h4>
            <div className="text-xs space-y-1">
              <div className="bg-white p-2 rounded border">
                <span className="text-gray-600">내용:</span>
                <div className="font-mono break-all mt-1">{message}</div>
              </div>
              <div className="bg-white p-2 rounded border">
                <span className="text-gray-600">길이:</span>
                <span className="ml-2">{message.length} bytes</span>
              </div>
              {signatureType === SignatureType.EIP712 && (
                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                  <span className="text-blue-700 text-xs">
                    💡 EIP-712에서는 메시지가 도메인 및 타입 정보와 함께 구조화되어 서명됩니다.
                  </span>
                </div>
              )}
              {signatureType === SignatureType.EIP7702 && (
                <div className="bg-purple-50 p-2 rounded border border-purple-200">
                  <span className="text-purple-700 text-xs">
                    💡 EIP-7702에서는 메시지가 RLP 인코딩되고 keccak256으로 해시됩니다.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 서명 정보 */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm">🔏 서명</h4>
            <div className="bg-white p-2 rounded border text-xs space-y-2">
              <div>
                <span className="text-gray-600">서명 값:</span>
                <div className="font-mono break-all mt-1 bg-gray-50 p-2 rounded">
                  {signature}
                </div>
              </div>
              <div className="flex gap-4">
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
                    💡 EIP-7702 서명은 65바이트로 직렬화됩니다.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 복구 정보 */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm">🔍 서명자</h4>
            <div className="bg-white p-2 rounded border text-xs space-y-2">
              <div>
                <span className="text-gray-600">복구된 주소:</span>
                <div className="font-mono break-all mt-1 bg-gray-50 p-2 rounded">
                  {recoveredAddress}
                </div>
              </div>
              <div className="text-gray-600">
                이 주소가 실제 서명자의 Ethereum 주소입니다.
              </div>
            </div>
          </div>

          {/* 검증 방식 정보 */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 text-sm">✅ 검증 방식</h4>
            <div className="bg-white p-2 rounded border text-xs">
              {signatureType === SignatureType.EIP712 && (
                <div className="space-y-1">
                  <div className="font-medium text-blue-700">EIP-712 검증:</div>
                  <div className="text-gray-600">
                    1. 도메인 및 타입 해시 계산<br/>
                    2. 구조화된 데이터 해시<br/>
                    3. EIP-712 prefix 추가<br/>
                    4. ECDSA 서명 복구
                  </div>
                </div>
              )}
              {signatureType === SignatureType.EIP7702 && (
                <div className="space-y-1">
                  <div className="font-medium text-purple-700">EIP-7702 검증:</div>
                  <div className="text-gray-600">
                    1. RLP 데이터 인코딩<br/>
                    2. keccak256 다이제스트 계산<br/>
                    3. secp256k1 서명 검증<br/>
                    4. 권한 위임 확인
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 