import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";

function Home() {
  const [health, setHealth] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3000/api/health")
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Ticket System</h1>
        <p className="mt-2 text-gray-500">Full-stack app is running.</p>
        <p className="mt-4 text-sm font-medium">
          {error ? (
            <span className="text-red-500">Server unreachable</span>
          ) : health === null ? (
            <span className="text-gray-400">Checking server...</span>
          ) : (
            <span className="text-green-600">Server status: {health}</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
