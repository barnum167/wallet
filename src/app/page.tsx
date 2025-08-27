import QRGenerator from "./components/QRGenerator";

export default function Home() {
  return (
    <div className="font-sans min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🔗 가스리스 결제 시스템
          </h1>
          <p className="text-gray-600 text-lg">
            QR 코드를 생성하여 가스비 없이 안전한 토큰 전송을 경험해보세요
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* QR 코드 생성기 */}
          <div>
            <QRGenerator />
          </div>

          {/* 설명 및 정보 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🚀 어떻게 작동하나요?</h2>
              <ol className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                  <div>
                    <strong>QR 코드 생성:</strong> 환경 변수의 결제 정보를 바탕으로 QR 코드를 생성합니다.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                  <div>
                    <strong>QR 스캔:</strong> 모바일 기기로 QR 코드를 스캔하거나 스캐너 페이지에서 확인합니다.
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                  <div>
                    <strong>가스리스 전송:</strong> EIP-7702를 활용한 가스리스 방식으로 토큰을 전송합니다.
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🔒 보안 특징</h2>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  개인키는 QR 코드에 포함되지 않습니다
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  타임스탬프 기반 만료 시간 (10분)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  서버에서 안전한 개인키 요청
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  EIP-712 서명을 통한 거래 검증
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📱 사용 방법</h2>
              <div className="space-y-3 text-gray-700">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <strong>📲 모바일에서:</strong> QR 코드를 스캔하여 직접 결제 진행
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                  <strong>💻 웹에서:</strong> &ldquo;스캐너 페이지로 이동&rdquo; 버튼을 클릭하여 브라우저에서 테스트
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <strong>💾 저장:</strong> QR 코드를 이미지로 다운로드하여 나중에 사용
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 text-xl">⚠️</span>
                <div className="text-yellow-800">
                  <strong>주의사항:</strong><br />
                  이는 테스트넷(Sepolia)에서 동작하는 데모입니다. 
                  실제 메인넷에서 사용하기 전에 충분한 테스트를 진행하세요.
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="text-center mt-12 py-8 border-t border-gray-200">
          <p className="text-gray-600">&copy; 2024 가스리스 결제 시스템 | EIP-7702 데모</p>
        </footer>
      </div>
    </div>
  );
}
