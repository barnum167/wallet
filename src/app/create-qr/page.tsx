import MultipleQRGenerator from "../components/MultipleQRGenerator";

export default function CreateQRPage() {
  return (
    <div className="font-sans min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">QR 코드 생성</h1>
          <p className="text-gray-600">개인키를 입력해서 여러개의 결제 사이트 접속 QR 코드를 생성할 수 있습니다</p>
        </header>

        <main>
          <MultipleQRGenerator />
        </main>
      </div>
    </div>
  );
}
