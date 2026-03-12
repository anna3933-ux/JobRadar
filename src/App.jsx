import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import VacanciesKanban from "@/pages/VacanciesKanban";
import VacanciesList from "@/pages/VacanciesList";
import VacancyDetail from "@/pages/VacancyDetail";
import SearchSettings from "@/pages/SearchSettings";
import ScraperLogs from "@/pages/ScraperLogs";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/Dashboard" replace />} />
          <Route element={<Layout />}>
            <Route path="/Dashboard" element={<Dashboard />} />
            <Route path="/VacanciesKanban" element={<VacanciesKanban />} />
            <Route path="/VacanciesList" element={<VacanciesList />} />
            <Route path="/VacancyDetail" element={<VacancyDetail />} />
            <Route path="/SearchSettings" element={<SearchSettings />} />
            <Route path="/ScraperLogs" element={<ScraperLogs />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
      <SonnerToaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;