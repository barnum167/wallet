"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";

interface NetworkInfo {
  chainId: number;
  name: string;
  symbol: string;
  isTestnet: boolean;
}

interface NetworkInfoProps {
  account: string;
}

const NETWORK_NAMES: Record<number, NetworkInfo> = {
  1: { chainId: 1, name: "Ethereum", symbol: "ETH", isTestnet: false },
  5: { chainId: 5, name: "Goerli", symbol: "GoerliETH", isTestnet: true },
  11155111: { chainId: 11155111, name: "Sepolia", symbol: "SepoliaETH", isTestnet: true },
  137: { chainId: 137, name: "Polygon", symbol: "MATIC", isTestnet: false },
  80001: { chainId: 80001, name: "Mumbai", symbol: "MATIC", isTestnet: true },
  56: { chainId: 56, name: "BSC", symbol: "BNB", isTestnet: false },
  97: { chainId: 97, name: "BSC Testnet", symbol: "tBNB", isTestnet: true },
};

// 모바일 감지 함수
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export default function NetworkInfo({ account }: NetworkInfoProps) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  useEffect(() => {
    const getNetworkInfo = async () => {
      if (!window.ethereum || !account) return;

      setIsLoading(true);
      setError("");

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        
        // 모바일에서는 더 긴 타임아웃 설정
        const timeout = isMobileDevice ? 15000 : 8000;
        
        // 잔액 조회 with timeout
        const balancePromise = provider.getBalance(account);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Balance fetch timeout')), timeout)
        );

        try {
          const balanceWei = await Promise.race([balancePromise, timeoutPromise]);
          const balanceEth = ethers.formatEther(balanceWei);
          setBalance(parseFloat(balanceEth).toFixed(4));
        } catch (balanceError) {
          console.warn("잔액 조회 실패:", balanceError);
          setBalance("조회 실패");
        }

        const networkData = NETWORK_NAMES[chainId] || {
          chainId,
          name: `Network ${chainId}`,
          symbol: "ETH",
          isTestnet: false
        };

        setNetworkInfo(networkData);
      } catch (error) {
        console.error("네트워크 정보 조회 실패:", error);
        setError(isMobileDevice ? "모바일에서 네트워크 정보 조회 실패" : "네트워크 정보 조회 실패");
      } finally {
        setIsLoading(false);
      }
    };

    getNetworkInfo();

    // 네트워크 변경 감지
    const handleChainChanged = () => {
      getNetworkInfo();
    };

    // 계정 변경 감지
    const handleAccountsChanged = () => {
      getNetworkInfo();
    };

    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [account, isMobileDevice]);

  if (!account) {
    return null;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm p-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (isLoading || !networkInfo) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">네트워크 정보 로딩 중...</span>
          </div>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
      <div className={`flex items-center ${isMobileDevice ? 'flex-col gap-2' : 'justify-between'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${networkInfo.isTestnet ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          <span className="text-sm font-medium text-gray-800">{networkInfo.name}</span>
          {networkInfo.isTestnet && (
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
              테스트넷
            </span>
          )}
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            ID: {networkInfo.chainId}
          </span>
        </div>
        
        <div className={`${isMobileDevice ? 'w-full flex justify-between items-center' : 'text-right'}`}>
          <div className={`${isMobileDevice ? '' : 'text-xs text-gray-500'}`}>
            {isMobileDevice && <span className="text-xs text-gray-500">잔액: </span>}
            {!isMobileDevice && <div className="text-xs text-gray-500">잔액</div>}
          </div>
          <div className="text-sm font-mono font-medium">
            {balance === "조회 실패" ? (
              <span className="text-red-600 text-xs">조회 실패</span>
            ) : (
              `${balance} ${networkInfo.symbol}`
            )}
          </div>
        </div>
      </div>
      
      {/* 모바일에서 추가 정보 표시 */}
      {isMobileDevice && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex justify-between items-center text-xs text-gray-600">
            <span>환경: 모바일</span>
            <span>MetaMask: {typeof window !== 'undefined' && window.ethereum?.isMetaMask ? '연결됨' : '미연결'}</span>
          </div>
        </div>
      )}
    </div>
  );
} 