import QRGenerator from "./components/QRGenerator";

export default function Home() {
  return (
    <div className="font-sans min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
        </header>

        <main className="max-w-2xl mx-auto">
          <QRGenerator />
        </main>

        <footer className="text-center mt-12 py-8 border-t border-gray-200">
          <p className="text-gray-600">&copy; 2024 가스리스 결제 시스템 | EIP-7702 데모</p>
        </footer>
      </div>
    </div>
  );
}
