import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import Layout from "@/components/layout";
import OverviewPage from "@/pages/overview";
import GrantSystemsPage from "@/pages/grant-systems";
import QueryBuilderPage from "@/pages/query-builder";
import EndpointsPage from "@/pages/endpoints";
import ContributorsPage from "@/pages/contributors";
import HealthPage from "@/pages/health";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Layout><OverviewPage /></Layout>} />
      <Route path="/grant-systems" component={() => <Layout><GrantSystemsPage /></Layout>} />
      <Route path="/query-builder" component={() => <Layout><QueryBuilderPage /></Layout>} />
      <Route path="/endpoints" component={() => <Layout><EndpointsPage /></Layout>} />
      <Route path="/contributors" component={() => <Layout><ContributorsPage /></Layout>} />
      <Route path="/health" component={HealthPage} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
