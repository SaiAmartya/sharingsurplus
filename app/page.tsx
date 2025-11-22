import Header from "./components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-4">
        <div className="text-center mt-10">
          <h1 className="text-4xl font-bold mb-4">Welcome to Shurplus</h1>
          <p className="text-xl text-gray-600">
            Connecting surplus food distributors with the community.
          </p>
        </div>
      </main>
    </div>
  );
}
