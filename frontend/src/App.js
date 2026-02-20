import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState("loading...");

  useEffect(() => {
    fetch("http://localhost:4000/health")
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus("api not reachable"));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Health Tracking Platform</h1>
      <p>API status: {status}</p>
    </div>
  );
}

export default App;