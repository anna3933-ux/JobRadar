import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard.jsx";
import VacanciesList from "@/pages/VacanciesList";
import VacancyDetail from "@/pages/VacancyDetail";
import SearchSettings from "@/pages/SearchSettings";
import ScraperLogs from "@/pages/ScraperLogs.jsx";

const queryClient = new QueryClient();

function AuthGate({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((auth) => {
      if (!auth) {
        base44.auth.redirectToLogin(window.location.href);
      } else {
        setReady(true);
      }
    });
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#6c63ff] rounded-full animate-spin" />
      </div>
    );
  }

  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/Dashboard" replace />} />
            <Route element={<Layout />}>
              <Route path="/Dashboard" element={<Dashboard />} />
                <Route path="/VacanciesList" element={<VacanciesList />} />
              <Route path="/VacancyDetail" element={<VacancyDetail />} />
              <Route path="/SearchSettings" element={<SearchSettings />} />
              <Route path="/ScraperLogs" element={<ScraperLogs />} />
            </Route>
          </Routes>
        </Router>
      </AuthGate>
      <Toaster />
      <SonnerToaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;