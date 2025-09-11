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
import EcosystemOverview from "@/pages/dashboard/analysis-enhanced";
import GrantSystems from "@/pages/dashboard/systems";
import SystemProfile from "@/pages/dashboard/system-profile-enhanced";
import SearchAndFilter from "@/pages/dashboard/search";
import DashboardOverviewArchived from "@/pages/dashboard/overview-archived";
import GetApiAccess from "@/pages/get-api-access";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";
import MobileToast from "@/components/mobile-toast";

function Router() {
  return (
    <Switch>
      {/* Main API Documentation Routes */}
      <Route path="/" component={() => <Layout><OverviewPage /></Layout>} />
      <Route path="/query-builder" component={() => <Layout><QueryBuilderPage /></Layout>} />
      <Route path="/endpoints" component={() => <Layout><EndpointsPage /></Layout>} />
      <Route path="/get-api-access" component={() => <Layout><GetApiAccess /></Layout>} />
      <Route path="/admin" component={() => <Layout><AdminDashboard /></Layout>} />
      <Route path="/contributors" component={() => <Layout><ContributorsPage /></Layout>} />
      <Route path="/health" component={() => <Layout><HealthPage /></Layout>} />
      
      {/* Dashboard Routes */}
      <Route path="/dashboard" component={() => <DashboardLayout><EcosystemOverview /></DashboardLayout>} />
      <Route path="/dashboard/systems" component={() => <DashboardLayout><GrantSystems /></DashboardLayout>} />
      <Route path="/dashboard/systems/:systemName" component={() => <DashboardLayout><SystemProfile /></DashboardLayout>} />
      <Route path="/dashboard/search" component={() => <DashboardLayout><SearchAndFilter /></DashboardLayout>} />
      <Route path="/dashboard/overview-archived" component={() => <DashboardLayout><DashboardOverviewArchived /></DashboardLayout>} />
      
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
