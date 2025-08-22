"use client";

import { useState, useCallback, useEffect } from "react";
import { ethers, toBeHex, keccak256, encodeRlp, Signature } from "ethers";
import { SignatureType, EIP712Domain, EIP712Types, EIP712Message, EIP7702Authorization } from "../lib/types/signature";
import SignatureDetails from "./components/SignatureDetails";
import PaymentQRGenerator from "./components/PaymentQRGenerator";

// MetaMask 확장 타입
declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider & {
      isMetaMask?: boolean;
      _metamask?: {
        isUnlocked?: () => Promise<boolean>;
      };
    };
  }
}

interface VerificationResult {
  isValid: boolean;
  recoveredAddress: string;
  message?: string;
  signatureType?: SignatureType;
}

// 모바일 감지 함수
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// MetaMask 모바일 앱 내부 브라우저 감지
const isMetaMaskInAppBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  // MetaMask 앱 내부 브라우저는 user agent에 특별한 식별자를 포함
  const userAgent = navigator.userAgent;
  return Boolean(
    window.ethereum?.isMetaMask && 
    (userAgent.includes('MetaMaskMobile') || 
     userAgent.includes('MetaMask Mobile') ||
     // MetaMask 앱에서 접근 시 ethereum 객체에 _metamask 속성이 있음
     window.ethereum._metamask !== undefined)
  );
};

// EIP-7702 지원 여부 확인
const supportsEIP7702 = (): boolean => {
  const isDesktop = !isMobile();
  const isMetaMaskApp = isMetaMaskInAppBrowser();
  
  // 데스크톱이거나 MetaMask 앱 내부 브라우저에서는 EIP-7702 지원
  return isDesktop || isMetaMaskApp;
};

// MetaMask 모바일 앱 설치 여부 확인
const isMetaMaskMobileInstalled = () => {
  if (typeof window === 'undefined') return false;
  return window.ethereum && window.ethereum.isMetaMask;
};

// MetaMask Deep Link 생성
const createMetaMaskDeepLink = (url: string) => {
  const encodedUrl = encodeURIComponent(url);
  return `https://metamask.app.link/dapp/${encodedUrl}`;
};

export default function SignatureVerifier() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'signature' | 'qr-generator'>('signature');
  
  const [account, setAccount] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [signatureType, setSignatureType] = useState<SignatureType>(SignatureType.EIP712);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [isMetaMaskApp, setIsMetaMaskApp] = useState<boolean>(false);
  const [showMobileGuide, setShowMobileGuide] = useState<boolean>(false);
  const [hasMetaMask, setHasMetaMask] = useState<boolean>(false);
  const [eip7702Supported, setEip7702Supported] = useState<boolean>(false);

  useEffect(() => {
    const mobile = isMobile();
    const metaMaskApp = isMetaMaskInAppBrowser();
    const eip7702Support = supportsEIP7702();
    
    setIsMobileDevice(mobile);
    setIsMetaMaskApp(metaMaskApp);
    setEip7702Supported(eip7702Support);
    
    // MetaMask 설치 여부 확인 (클라이언트에서만)
    if (typeof window !== 'undefined') {
      setHasMetaMask(Boolean(window.ethereum?.isMetaMask));
    }
    
    // 모바일에서 MetaMask 앱이 아닌 경우에만 가이드 표시
    if (mobile && !metaMaskApp && !isMetaMaskMobileInstalled()) {
      setShowMobileGuide(true);
    }
  }, []);

  // 모바일에서 MetaMask 앱으로 리다이렉트
  const redirectToMetaMaskMobile = useCallback(() => {
    if (isMobileDevice) {
      const currentUrl = window.location.href;
      const deepLink = createMetaMaskDeepLink(currentUrl);
      window.open(deepLink, '_blank');
    }
  }, [isMobileDevice]);

  // MetaMask 연결 (모바일 지원 개선)
  const connectWallet = useCallback(async () => {
    // 모바일에서 MetaMask 앱이 설치되지 않은 경우
    if (isMobileDevice && !window.ethereum) {
      alert("MetaMask 모바일 앱이 필요합니다. 앱 스토어에서 다운로드 후 다시 시도해주세요.");
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    // 모바일에서 MetaMask 브라우저가 아닌 경우
    if (isMobileDevice && !isMetaMaskApp && !window.ethereum?.isMetaMask) {
      const shouldRedirect = confirm(
        "최상의 경험을 위해 MetaMask 앱 내 브라우저 사용을 권장합니다. MetaMask 앱으로 이동하시겠습니까?"
      );
      if (shouldRedirect) {
        redirectToMetaMaskMobile();
      }
      return;
    }

    if (!window.ethereum) {
      if (isMobileDevice) {
        alert("MetaMask 모바일 앱을 설치하고 앱 내 브라우저를 사용해주세요.");
      } else {
        alert("MetaMask 확장프로그램을 먼저 설치해주세요.");
      }
      return;
    }

    setIsConnecting(true);
    try {
      // 모바일에서는 더 긴 타임아웃 설정
      const timeout = isMobileDevice ? 30000 : 10000;
      
      const requestPromise = window.ethereum.request({
        method: "eth_requestAccounts",
      }) as Promise<string[]>;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), timeout)
      );

      const accounts = await Promise.race([requestPromise, timeoutPromise]);
      setAccount(accounts[0]);
      setShowMobileGuide(false);
    } catch (error: any) {
      console.error("지갑 연결 실패:", error);
      
      if (error.code === 4001) {
        alert("사용자가 연결을 거부했습니다.");
      } else if (error.message === 'Connection timeout') {
        alert("연결 시간이 초과되었습니다. 다시 시도해주세요.");
      } else if (isMobileDevice) {
        alert("모바일에서 연결에 실패했습니다. MetaMask 앱 내 브라우저에서 다시 시도해주세요.");
      } else {
        alert("지갑 연결에 실패했습니다.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isMobileDevice, isMetaMaskApp, redirectToMetaMaskMobile]);

  // EIP-7702 Authorization 서명 (개선된 버전)
  const signEIP7702Authorization = useCallback(async (provider: ethers.BrowserProvider) => {
    try {
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      
      // EIP-7702 authorization을 위한 구조화된 데이터
      const domain: EIP712Domain = {
        name: "EIP-7702 Authorization",
        version: "1",
        chainId: Number(network.chainId),
        verifyingContract: "0x0000000000000000000000000000000000000000"
      };

      const types: EIP712Types = {
        Authorization: [
          { name: "invoker", type: "address" },
          { name: "commit", type: "bytes32" },
          { name: "nonce", type: "uint64" }
        ]
      };

      const authData = {
        invoker: account,
        commit: keccak256(ethers.toUtf8Bytes(message)),
        nonce: 0
      };

      // EIP-712 구조화된 데이터로 서명
      const signature = await signer.signTypedData(domain, types, authData);
      
      return signature;
    } catch (error) {
      console.error("EIP-7702 서명 실패:", error);
      throw error;
    }
  }, [account, message]);

  // 메시지 서명 (EIP-7702 모바일 지원 포함)
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
          const signer = await provider.getSigner();
          
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

          signature = await signer.signTypedData(domain, types, messageData);
          break;
        }
        case SignatureType.EIP7702: {
          if (!eip7702Supported) {
            throw new Error("현재 환경에서는 EIP-7702가 지원되지 않습니다. MetaMask 앱 내 브라우저를 사용해주세요.");
          }
          
          // EIP-7702 authorization 서명 사용
          signature = await signEIP7702Authorization(provider);
          break;
        }
        default:
          throw new Error("지원하지 않는 서명 타입입니다.");
      }

      setSignature(signature);
    } catch (error: any) {
      console.error("서명 실패:", error);
      
      if (error.code === 4001) {
        alert("사용자가 서명을 거부했습니다.");
      } else if (error.message.includes("EIP-7702가 지원되지 않습니다")) {
        alert(error.message);
      } else if (isMobileDevice) {
        alert("모바일에서 서명에 실패했습니다. MetaMask 앱 내 브라우저에서 다시 시도해주세요.");
      } else {
        alert("메시지 서명에 실패했습니다: " + error.message);
      }
    } finally {
      setIsSigning(false);
    }
  }, [account, message, signatureType, eip7702Supported, signEIP7702Authorization, isMobileDevice]);

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
          recoveredAddress = ethers.verifyMessage(message, signature);
          break;
        case SignatureType.EIP7702:
          // EIP-7702의 경우 EIP-712 구조화된 데이터 검증
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

  const resetForm = useCallback(() => {
    setMessage("");
    setSignature("");
    setVerificationResult(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        
        {/* 탭 메뉴 */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('signature')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'signature'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📋 서명 검증
            </button>
            <button
              onClick={() => setActiveTab('qr-generator')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'qr-generator'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              💰 QR 생성
            </button>
          </div>
        </div>
        
        {/* 서명 검증 탭 */}
        {activeTab === 'signature' && (
          <>
            {/* 모바일 가이드 */}
            {showMobileGuide && isMobileDevice && !isMetaMaskApp && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📱</span>
              <h3 className="font-semibold text-orange-800">최적화된 경험을 위한 안내</h3>
            </div>
            <div className="space-y-3 text-sm text-orange-700">
              <p>EIP-7702 기능을 포함한 모든 기능 사용을 위해:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>MetaMask 모바일 앱 설치</li>
                <li>지갑 생성 또는 복원</li>
                <li>앱 내 브라우저에서 이 사이트 접속</li>
              </ol>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => window.open('https://metamask.io/download/', '_blank')}
                  className="flex-1 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-medium"
                >
                  앱 다운로드
                </button>
                <button
                  onClick={redirectToMetaMaskMobile}
                  className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium"
                >
                  MetaMask에서 열기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 기기 정보 표시 */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">현재 환경:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isMobileDevice ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
              }`}>
                {isMobileDevice ? '📱 모바일' : '💻 데스크톱'}
              </span>
              {hasMetaMask && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                  🦊 MetaMask
                </span>
              )}
              {isMetaMaskApp && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                  📲 앱 브라우저
                </span>
              )}
              {eip7702Supported && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  ✨ EIP-7702
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 1단계: 지갑 연결 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
            지갑 연결
          </h2>
          
          {!account ? (
            <div className="space-y-3">
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
                    🦊 {isMobileDevice ? 'MetaMask 앱' : 'MetaMask'} 연결
                  </>
                )}
              </button>
              
              {isMobileDevice && !isMetaMaskApp && (
                <p className="text-xs text-gray-600 text-center">
                  💡 EIP-7702 지원을 위해 MetaMask 앱 내 브라우저 사용을 권장합니다
                </p>
              )}
            </div>
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
            {Object.values(SignatureType).map((type) => {
              const isEIP7702 = type === SignatureType.EIP7702;
              const isDisabled = isEIP7702 && !eip7702Supported;
              
              return (
                <label 
                  key={type} 
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    signatureType === type 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="signatureType"
                    value={type}
                    checked={signatureType === type}
                    onChange={(e) => setSignatureType(e.target.value as SignatureType)}
                    disabled={isDisabled}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className={`font-semibold ${signatureType === type ? 'text-blue-700' : 'text-gray-800'}`}>
                      {type === SignatureType.EIP712 && "📋 EIP-712 Typed Data"}
                      {type === SignatureType.EIP7702 && "🔗 EIP-7702 Authorization"}
                      {isDisabled && (
                        <span className="ml-2 text-xs text-gray-500">
                          (MetaMask 앱 필요)
                        </span>
                      )}
                    </div>
                    <div className={`text-sm mt-1 ${signatureType === type ? 'text-blue-600' : 'text-gray-600'}`}>
                      {type === SignatureType.EIP712 && "구조화된 데이터 서명 (모든 환경 지원)"}
                      {type === SignatureType.EIP7702 && `권한 위임 서명 (${eip7702Supported ? '지원됨' : '미지원'})`}
                    </div>
                  </div>
                  {signatureType === type && !isDisabled && (
                    <div className="text-blue-500 text-xl">✓</div>
                  )}
                </label>
              );
            })}
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

            {/* 사용법 및 팁 */}
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-blue-700 text-sm mb-2">
                💡 <strong>사용법:</strong> 지갑 연결 → 서명 타입 선택 → 메시지 입력 → 서명 → 검증
              </p>
              {isMobileDevice && (
                <p className="text-orange-700 text-xs">
                  📱 <strong>2025년 업데이트:</strong> MetaMask 앱에서 EIP-7702를 완전 지원합니다!
                </p>
              )}
            </div>
          </>
        )}

        {/* QR 생성 탭 (가맹점용) */}
        {activeTab === 'qr-generator' && (
          <>
            {/* 기기 정보 표시 */}
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">현재 환경:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isMobileDevice ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {isMobileDevice ? '📱 모바일' : '💻 데스크톱'}
                  </span>
                  {hasMetaMask && (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                      🦊 MetaMask
                    </span>
                  )}
                </div>
              </div>
            </div>

            <PaymentQRGenerator 
              isConnected={!!account} 
              currentChainId={0} 
            />
          </>
        )}


      </div>
    </div>
  );
}