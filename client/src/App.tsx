import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import DashboardLayout from "@/components/dashboard-layout";
import EcosystemOverview from "@/pages/dashboard/analysis-enhanced";
import GrantSystems from "@/pages/dashboard/systems";
import SystemProfile from "@/pages/dashboard/system-profile-enhanced";
import DashboardOverviewArchived from "@/pages/dashboard/overview-archived";
import MobileToast from "@/components/mobile-toast";

function Router() {
  return (
    <Switch>
      {/* Dashboard Routes - Now at Root */}
      <Route path="/" component={() => <DashboardLayout><EcosystemOverview /></DashboardLayout>} />
      <Route path="/systems" component={() => <DashboardLayout><GrantSystems /></DashboardLayout>} />
      <Route path="/systems/:systemName" component={() => <DashboardLayout><SystemProfile /></DashboardLayout>} />
      <Route path="/overview-archived" component={() => <DashboardLayout><DashboardOverviewArchived /></DashboardLayout>} />

      {/* 404 Route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <MobileToast />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;