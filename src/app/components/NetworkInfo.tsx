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

export default function NetworkInfo({ account }: NetworkInfoProps) {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [balance, setBalance] = useState<string>("0");

  useEffect(() => {
    const getNetworkInfo = async () => {
      if (!window.ethereum || !account) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        
        // 잔액 조회
        const balanceWei = await provider.getBalance(account);
        const balanceEth = ethers.formatEther(balanceWei);
        setBalance(parseFloat(balanceEth).toFixed(4));

        const networkData = NETWORK_NAMES[chainId] || {
          chainId,
          name: `Network ${chainId}`,
          symbol: "ETH",
          isTestnet: false
        };

        setNetworkInfo(networkData);
      } catch (error) {
        console.error("네트워크 정보 조회 실패:", error);
      }
    };

    getNetworkInfo();

    // 네트워크 변경 감지
    const handleChainChanged = () => {
      getNetworkInfo();
    };

    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
  }, [account]);

  if (!networkInfo || !account) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${networkInfo.isTestnet ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          <span className="text-sm font-medium text-gray-800">{networkInfo.name}</span>
          {networkInfo.isTestnet && (
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
              테스트넷
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">잔액</div>
          <div className="text-sm font-mono">{balance} {networkInfo.symbol}</div>
        </div>
      </div>
    </div>
  );
} 