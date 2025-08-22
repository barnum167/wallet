# 🔐 디지털 서명 확인 도구

Context7을 활용한 이더리움 블록체인 기반의 디지털 서명 생성 및 검증 웹사이트입니다.

## ✨ 주요 기능

- **🦊 MetaMask 지갑 연결**: 브라우저 확장 프로그램을 통한 안전한 지갑 연결
- **✍️ 메시지 서명**: 원하는 메시지에 대한 암호화 서명 생성
- **🔍 서명 검증**: 기존 서명의 유효성 검증 및 서명자 주소 복구
- **🌐 네트워크 정보**: 연결된 네트워크 정보 및 잔액 표시
- **📊 상세 분석**: 서명의 기술적 구성요소 및 해시 정보 제공
- **📱 반응형 UI**: 모든 디바이스에서 최적화된 사용자 경험

## 🛠️ 기술 스택

- **Frontend**: Next.js 15.5.0, React 19, TypeScript
- **Styling**: TailwindCSS 4.0
- **Blockchain**: Ethers.js v6 (Context7 라이브러리 활용)
- **Cryptography**: CryptoJS (Context7 라이브러리 활용)
- **Standards**: EIP-191, ECDSA, secp256k1

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. 브라우저에서 확인

[http://localhost:3000](http://localhost:3000)을 열어 웹사이트를 확인하세요.

## 📖 사용법

### 1단계: MetaMask 연결
- "MetaMask 연결" 버튼을 클릭하여 지갑을 연결하세요
- 네트워크 정보와 잔액이 자동으로 표시됩니다

### 2단계: 메시지 서명
- 서명하고자 하는 메시지를 입력하세요
- "메시지 서명" 버튼을 클릭하여 MetaMask에서 서명하세요
- 생성된 서명이 자동으로 입력됩니다

### 3단계: 서명 검증
- "서명 검증" 버튼을 클릭하여 서명의 유효성을 확인하세요
- 서명자의 주소가 복구되어 표시됩니다
- 연결된 지갑과 서명자가 일치하는지 확인할 수 있습니다

### 4단계: 상세 정보 확인 (선택사항)
- "기술적 세부사항 보기"를 클릭하여 자세한 정보를 확인하세요
- 서명 구성요소(r, s, v), 해시 값, 사용된 표준 등을 볼 수 있습니다

## 🔧 주요 컴포넌트

### SignatureDetails
서명의 기술적 세부사항을 표시하는 컴포넌트입니다:
- 메시지 정보 (원본, 길이, SHA256/Keccak256 해시)
- 서명 구성요소 (r, s, v, yParity, compact 형식)
- 검증 정보 (복구된 주소, 체크섬 유효성)
- 사용된 표준 정보

### NetworkInfo
연결된 네트워크의 정보를 표시하는 컴포넌트입니다:
- 네트워크 이름 및 Chain ID
- 계정 잔액
- 테스트넷 여부 표시
- 네트워크 변경 자동 감지

## 🌐 지원 네트워크

- **Ethereum Mainnet** (Chain ID: 1)
- **Sepolia Testnet** (Chain ID: 11155111)
- **Goerli Testnet** (Chain ID: 5)
- **Polygon Mainnet** (Chain ID: 137)
- **Mumbai Testnet** (Chain ID: 80001)
- **BSC Mainnet** (Chain ID: 56)
- **BSC Testnet** (Chain ID: 97)

## 🔒 보안 고려사항

- 모든 서명 작업은 클라이언트 사이드에서 수행됩니다
- 개인키는 MetaMask에서만 관리되며 서버로 전송되지 않습니다
- EIP-191 표준을 준수하여 안전한 메시지 서명을 제공합니다
- 서명 검증은 수학적 알고리즘(ECDSA)을 통해 수행됩니다

## 📚 암호화 표준

이 도구는 다음 표준을 사용합니다:

- **EIP-191**: 서명된 데이터 표준
- **ECDSA**: 타원곡선 디지털 서명 알고리즘
- **secp256k1**: 비트코인/이더리움에서 사용하는 타원곡선
- **Keccak-256**: 이더리움의 해시 함수

## 🤝 기여하기

1. 이 저장소를 Fork하세요
2. 새로운 feature 브랜치를 생성하세요 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 Push하세요 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성하세요

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🙏 Context7 활용

이 프로젝트는 Context7을 통해 제공되는 다음 라이브러리들을 활용합니다:

- **Ethers.js v6**: 이더리움 블록체인 상호작용 및 서명 처리
- **CryptoJS**: 암호화 해시 함수 및 다양한 암호화 알고리즘

Context7의 최신 문서와 코드 예제들이 이 프로젝트의 개발에 큰 도움이 되었습니다.
