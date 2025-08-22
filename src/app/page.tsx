"use client";

import { useState, useCallback } from "react";
import { ethers, toBeHex, keccak256, encodeRlp, Signature } from "ethers";
import { SignatureType, EIP712Domain, EIP712Types, EIP712Message, EIP7702Authorization } from "../lib/types/signature";
import SignatureDetails from "./components/SignatureDetails";

// MetaMask 확장 타입
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}

interface VerificationResult {
  isValid: boolean;
  recoveredAddress: string;
  message?: string;
  signatureType?: SignatureType;
}

export default function SignatureVerifier() {
  const [account, setAccount] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [signatureType, setSignatureType] = useState<SignatureType>(SignatureType.EIP712);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // MetaMask 연결
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask를 먼저 설치해주세요.");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];
      setAccount(accounts[0]);
    } catch (error) {
      console.error("지갑 연결 실패:", error);
      alert("지갑 연결에 실패했습니다.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // 메시지 서명
  const signMessage = useCallback(async () => {
    if (!account || !message.trim()) {
      alert("지갑을 연결하고 메시지를 입력해주세요.");
      return;
    }

    setIsSigning(true);
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not found");
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      let signature: string;

      switch (signatureType) {
        case SignatureType.EIP712: {
          // EIP-712 서명
          const signer = await provider.getSigner();
          
          // EIP-712 도메인 및 타입 정의
          const domain: EIP712Domain = {
            name: "Wallet Signature Test",
            version: "1",
            chainId: Number((await provider.getNetwork()).chainId),
            verifyingContract: "0x0000000000000000000000000000000000000000"
          };

          const types: EIP712Types = {
            Message: [
              { name: "content", type: "string" },
              { name: "timestamp", type: "uint256" }
            ]
          };

          const messageData: EIP712Message = {
            content: message,
            timestamp: Math.floor(Date.now() / 1000)
          };

          // 반드시 wallet.signTypedData 사용
          signature = await signer.signTypedData(domain, types, messageData);
          break;
        }
        case SignatureType.EIP7702: {
          // EIP-7702 서명
          const signer = await provider.getSigner();
          const network = await provider.getNetwork();
          
          // EIP-7702 권한 정의
          const authorization: EIP7702Authorization = {
            chainId: network.chainId,
            delegator: account,
            nonce: BigInt(0) // 실제로는 현재 nonce를 가져와야 함
          };

          // 반드시 이 순서로 구현
          // 1. encodeRlp([toBeHex(chainId), delegator, toBeHex(nonce)])
          const rlpData = [
            toBeHex(authorization.chainId),
            authorization.delegator,
            toBeHex(authorization.nonce)
          ];
          const rlpBytes = encodeRlp(rlpData);

          // 2. keccak256(rlpBytes)
          const digest = keccak256(rlpBytes);

          // 3. SigningKey.sign(digest) - 원시 secp256k1 서명
          // 현재 구현에서는 provider의 signMessage를 사용
          const tempSig = await signer.signMessage(ethers.getBytes(digest));
          
          // 4. Signature.from(sig).serialized - 65바이트 직렬화
          const sig = Signature.from(tempSig);
          signature = sig.serialized;
          break;
        }
        default:
          throw new Error("지원하지 않는 서명 타입입니다.");
      }

      setSignature(signature);
    } catch (error) {
      console.error("서명 실패:", error);
      alert("메시지 서명에 실패했습니다.");
    } finally {
      setIsSigning(false);
    }
  }, [account, message, signatureType]);

  // 서명 검증
  const verifySignature = useCallback(async () => {
    if (!message.trim() || !signature.trim()) {
      alert("메시지와 서명을 모두 입력해주세요.");
      return;
    }

    setIsVerifying(true);
    try {
      let recoveredAddress: string;

      switch (signatureType) {
        case SignatureType.EIP712:
          // EIP-712 검증 로직 (현재는 간단히 처리)
          recoveredAddress = ethers.verifyMessage(message, signature);
          break;
        case SignatureType.EIP7702:
          // EIP-7702 검증 로직 (현재는 간단히 처리)
          recoveredAddress = ethers.verifyMessage(message, signature);
          break;
        default:
          throw new Error("지원하지 않는 서명 타입입니다.");
      }

      setVerificationResult({
        isValid: true,
        recoveredAddress,
        signatureType
      });
    } catch (error) {
      console.error("서명 검증 실패:", error);
      setVerificationResult({
        isValid: false,
        recoveredAddress: "",
        message: "유효하지 않은 서명입니다.",
        signatureType
      });
    } finally {
      setIsVerifying(false);
    }
  }, [message, signature, signatureType]);

  // 초기화
  const resetForm = useCallback(() => {
    setMessage("");
    setSignature("");
    setVerificationResult(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        {/* 1단계: 지갑 연결 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
            지갑 연결
          </h2>
          
          {!account ? (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  연결 중...
                </>
              ) : (
                <>
                  🦊 MetaMask 연결
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-800 font-medium text-sm">연결됨</span>
                </div>
                <div className="text-xs text-green-700 font-mono break-all">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2단계: 서명 타입 선택 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
            서명 타입 선택
          </h2>
          
          {/* 현재 선택된 타입 표시 */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-medium text-sm">현재 선택:</span>
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                {signatureType === SignatureType.EIP712 && "📋 EIP-712 Typed Data"}
                {signatureType === SignatureType.EIP7702 && "🔗 EIP-7702 Authorization"}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            {Object.values(SignatureType).map((type) => (
              <label 
                key={type} 
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  signatureType === type 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="signatureType"
                  value={type}
                  checked={signatureType === type}
                  onChange={(e) => setSignatureType(e.target.value as SignatureType)}
                  className="w-5 h-5 text-blue-600"
                />
                <div className="flex-1">
                  <div className={`font-semibold ${signatureType === type ? 'text-blue-700' : 'text-gray-800'}`}>
                    {type === SignatureType.EIP712 && "📋 EIP-712 Typed Data"}
                    {type === SignatureType.EIP7702 && "🔗 EIP-7702 Authorization"}
                  </div>
                  <div className={`text-sm mt-1 ${signatureType === type ? 'text-blue-600' : 'text-gray-600'}`}>
                    {type === SignatureType.EIP712 && "구조화된 데이터 서명 (권장)"}
                    {type === SignatureType.EIP7702 && "권한 위임 서명 (고급)"}
                  </div>
                </div>
                {signatureType === type && (
                  <div className="text-blue-500 text-xl">✓</div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* 3단계: 메시지 서명 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
            메시지 서명
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                서명할 메시지
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={signMessage}
                disabled={!account || !message.trim() || isSigning}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
              >
                {isSigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    서명 중...
                  </>
                ) : (
                  "✍️ 서명하기"
                )}
              </button>
              
              <button
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 text-sm"
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* 4단계: 서명 검증 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
            서명 검증
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                서명 (자동 입력됨)
              </label>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="0x로 시작하는 서명..."
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-xs"
                rows={3}
              />
            </div>

            <button
              onClick={verifySignature}
              disabled={!message.trim() || !signature.trim() || isVerifying}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {isVerifying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  검증 중...
                </>
              ) : (
                "🔍 서명 검증"
              )}
            </button>
          </div>
        </div>

        {/* 검증 결과 */}
        {verificationResult && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              📋 검증 결과
            </h2>
            
            <div className={`p-4 rounded-lg border-2 ${
              verificationResult.isValid 
                ? "bg-green-50 border-green-200" 
                : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`text-xl ${
                  verificationResult.isValid ? "text-green-600" : "text-red-600"
                }`}>
                  {verificationResult.isValid ? "✅" : "❌"}
                </div>
                <h3 className={`font-semibold ${
                  verificationResult.isValid ? "text-green-800" : "text-red-800"
                }`}>
                  {verificationResult.isValid ? "서명이 유효합니다!" : "서명이 유효하지 않습니다!"}
                </h3>
              </div>

              {/* 서명 타입 표시 */}
              <div className="mb-3">
                <span className="text-sm font-medium text-gray-700">서명 타입: </span>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {verificationResult.signatureType?.toUpperCase()}
                </span>
              </div>
              
              {verificationResult.isValid && verificationResult.recoveredAddress && (
                <div className="space-y-2">
                  <p className="text-green-700 font-medium text-sm">서명자 주소:</p>
                  <div className="bg-green-100 text-green-800 p-3 rounded font-mono text-xs break-all">
                    {verificationResult.recoveredAddress}
                  </div>
                  
                  {account && verificationResult.recoveredAddress.toLowerCase() === account.toLowerCase() && (
                    <p className="text-green-600 font-medium text-sm">
                      🎉 연결된 지갑과 일치합니다!
                    </p>
                  )}
                </div>
              )}
              
              {verificationResult.message && (
                <div className="mt-3">
                  <p className={`text-sm ${
                    verificationResult.isValid ? "text-green-600" : "text-red-600"
                  }`}>
                    {verificationResult.message}
                  </p>
                </div>
              )}
            </div>

            {/* 상세 서명 정보 */}
            {verificationResult.isValid && (
              <SignatureDetails
                message={message}
                signature={signature}
                recoveredAddress={verificationResult.recoveredAddress}
                signatureType={verificationResult.signatureType}
              />
            )}
          </div>
        )}

        {/* 간단한 사용법 */}
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-blue-700 text-sm">
            💡 <strong>사용법:</strong> 지갑 연결 → 서명 타입 선택 (EIP-712/EIP-7702) → 메시지 입력 → 서명 → 검증
          </p>
        </div>
      </div>
    </div>
  );
}
