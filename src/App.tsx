import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import ModularDashboard from "./pages/ModularDashboard";
import Admin from "./pages/Admin";
import { PolkadotProvider } from "@/lib/polkadot-provider.dedot";
import { EVMProvider } from "./providers/EVMProvider";
import { PublicForm } from "./modules/forms";

export default function App() {
  return (
    <PolkadotProvider appName="Intran3t">
      <EVMProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-[#fafafa]">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/f/:formId" element={<PublicForm />} />
              <Route path="/dashboard" element={<ModularDashboard />} />
              <Route path="/profile/:address" element={<ModularDashboard />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </div>
        </BrowserRouter>
      </EVMProvider>
    </PolkadotProvider>
  );
}
