import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Layout from "@/components/layout";
import DashboardLayout from "@/components/dashboard-layout";
import OverviewPage from "@/pages/overview";
import QueryBuilderPage from "@/pages/query-builder";
import EndpointsPage from "@/pages/endpoints";
import ContributorsPage from "@/pages/contributors";
import HealthPage from "@/pages/health";
import DashboardOverview from "@/pages/dashboard/overview";
import GrantSystems from "@/pages/dashboard/systems";
import SystemProfile from "@/pages/dashboard/system-profile-enhanced";
import SearchAndFilter from "@/pages/dashboard/search";
import CrossSystemAnalysis from "@/pages/dashboard/analysis";
import NotFound from "@/pages/not-found";
import MobileToast from "@/components/mobile-toast";

function Router() {
  return (
    <Switch>
      {/* Main API Documentation Routes */}
      <Route path="/" component={() => <Layout><OverviewPage /></Layout>} />
      <Route path="/query-builder" component={() => <Layout><QueryBuilderPage /></Layout>} />
      <Route path="/endpoints" component={() => <Layout><EndpointsPage /></Layout>} />
      <Route path="/contributors" component={() => <Layout><ContributorsPage /></Layout>} />
      <Route path="/health" component={HealthPage} />
      
      {/* Dashboard Routes */}
      <Route path="/dashboard" component={() => <DashboardLayout><DashboardOverview /></DashboardLayout>} />
      <Route path="/dashboard/systems" component={() => <DashboardLayout><GrantSystems /></DashboardLayout>} />
      <Route path="/dashboard/systems/:systemName" component={() => <DashboardLayout><SystemProfile /></DashboardLayout>} />
      <Route path="/dashboard/search" component={() => <DashboardLayout><SearchAndFilter /></DashboardLayout>} />
      <Route path="/dashboard/analysis" component={() => <DashboardLayout><CrossSystemAnalysis /></DashboardLayout>} />
      
      {/* Catch all */}
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
