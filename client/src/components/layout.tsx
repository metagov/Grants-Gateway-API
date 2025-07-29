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
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useThemeContext } from "@/components/ui/theme-provider";
import { Link, useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useThemeContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  const sidebarItems = [
    { id: "/", label: "Overview", icon: Building, path: "/" },

    { id: "/endpoints", label: "API Endpoints", icon: Target, path: "/endpoints" },
    { id: "/query-builder", label: "Query Builder", icon: Code, path: "/query-builder" },
    { id: "/health", label: "API Health", icon: Activity, path: "/health" },
    { id: "/contributors", label: "Contributors", icon: Heart, path: "/contributors" },
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
          
          {/* Integrations Section */}
          <div className="pt-6">
            <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Integrations
            </p>
            <div className="mt-3 space-y-3 px-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 cursor-help hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
                    <span>Octant (Type 1)</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Direct API integration with real-time data transformation to DAOIP-5 format</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 cursor-help hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
                    <span>Giveth (Type 1)</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>GraphQL API integration with quadratic funding round data transformation</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 cursor-help hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 flex-shrink-0"></div>
                    <span>Questbook (Type 3)</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Native DAOIP-5 endpoint at api.questbook.app/daoip-5 - health monitoring only</p>
                </TooltipContent>
              </Tooltip>
              
              <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Infrastructure</div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 cursor-help hover:text-gray-800 dark:hover:text-gray-100 transition-colors mb-1">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mr-2 flex-shrink-0"></div>
                      <span>Karma GAP</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Cross-platform project UIDs for seamless project identification</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 cursor-help hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
                      <div className="w-2 h-2 bg-amber-500 rounded-full mr-2 flex-shrink-0"></div>
                      <span>OSO</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Data lake infrastructure for developer activity and impact tracking</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-4"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold">OpenGrants Gateway API</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm font-medium">API Status: Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}