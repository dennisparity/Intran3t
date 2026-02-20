import { HashRouter, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Start from "./pages/Start";
import ModularDashboard from "./pages/ModularDashboard";
import Admin from "./pages/Admin";
import AdminFormResults from "./pages/AdminFormResults";
import IdentityTest from "./pages/IdentityTest";
import { PolkadotProvider } from "@/lib/polkadot-provider.dedot";
import { EVMProvider } from "./providers/EVMProvider";
import { PublicForm } from "./modules/forms";

export default function App() {
  return (
    <PolkadotProvider appName="Intran3t">
      <EVMProvider>
        <HashRouter>
          <div className="dark min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/start" element={<Start />} />
              <Route path="/f/:formId" element={<PublicForm />} />
              <Route path="/dashboard" element={<ModularDashboard />} />
              <Route path="/profile/:address" element={<ModularDashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/forms/:formId" element={<AdminFormResults />} />
              <Route path="/identity-test" element={<IdentityTest />} />
            </Routes>
          </div>
        </HashRouter>
      </EVMProvider>
    </PolkadotProvider>
  );
}
