import { useState } from "react";
import { 
  Building, 
  Layers, 
  Target, 
  Code, 
  Activity,
  Heart, 
  Moon, 
  Sun,
  Menu,
  X,
  Key,
  Shield
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useThemeContext } from "@/components/ui/theme-provider";
import { Link, useLocation } from "wouter";
import IntegrationsSidebar from "@/components/integrations-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useThemeContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  // Check if user is admin
  const { data: adminStats, isLoading: adminLoading, error: adminError } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: !authLoading && !!user,
    retry: false,
    refetchOnWindowFocus: false
  });

  const isAdmin = !adminLoading && !!adminStats && !adminError;

  const sidebarItems = [
    { id: "/", label: "Overview", icon: Building, path: "/" },
    { id: "/endpoints", label: "API Endpoints", icon: Target, path: "/endpoints" },
    { id: "/query-builder", label: "Query Builder", icon: Code, path: "/query-builder" },
    { id: "/get-api-access", label: "Get API Access", icon: Key, path: "/get-api-access" },
    { id: "/health", label: "API Health", icon: Activity, path: "/health" },
    { id: "/contributors", label: "Contributors", icon: Heart, path: "/contributors" },
    ...(isAdmin ? [{ id: "/admin", label: "Admin Dashboard", icon: Shield, path: "/admin" }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 shadow-lg border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold">OpenGrants</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.id} href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={`w-full justify-start ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
          
          <IntegrationsSidebar />
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-4"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h1 className="text-lg sm:text-xl font-semibold hidden sm:block">OpenGrants Gateway API</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              
              <div className="hidden sm:flex items-center space-x-2 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm font-medium">API Status: Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}