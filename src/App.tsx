import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import ModularDashboard from "./pages/ModularDashboard";
import { PolkadotProvider } from "@/lib/polkadot-provider.dedot";

export default function App() {
  return (
    <PolkadotProvider appName="Intran3t">
      <BrowserRouter>
        <div className="min-h-screen bg-[#fafafa]">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<ModularDashboard />} />
          </Routes>
        </div>
      </BrowserRouter>
    </PolkadotProvider>
  );
}
