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
      </div>
    </div>
  );
}
