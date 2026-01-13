import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PrivyAuthProvider } from "@/components/privy-provider";
import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Overview from "@/pages/overview";
import Endpoints from "@/pages/endpoints";
import QueryBuilder from "@/pages/query-builder";
import GetApiAccess from "@/pages/get-api-access";
import Health from "@/pages/health";
import Contributors from "@/pages/contributors";
import AdminDashboard from "@/pages/admin-dashboard";
import InternalAnalytics from "@/pages/internal-analytics";
import MobileToast from "@/components/mobile-toast";

function Router() {
  return (
    <Switch>
      {/* Hidden internal analytics route - not linked anywhere */}
      <Route path="/__internal/usage" component={InternalAnalytics} />
      
      {/* API Documentation Routes */}
      <Route path="/" component={() => <Layout><Overview /></Layout>} />
      <Route path="/endpoints" component={() => <Layout><Endpoints /></Layout>} />
      <Route path="/query-builder" component={() => <Layout><QueryBuilder /></Layout>} />
      <Route path="/get-api-access" component={() => <Layout><GetApiAccess /></Layout>} />
      <Route path="/health" component={() => <Layout><Health /></Layout>} />
      <Route path="/contributors" component={() => <Layout><Contributors /></Layout>} />
      <Route path="/admin" component={() => <Layout><AdminDashboard /></Layout>} />

      {/* 404 Route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <PrivyAuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <MobileToast />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </PrivyAuthProvider>
  );
}

export default App;