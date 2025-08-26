import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Building2, 
  Home, 
  Search,
  TrendingUp,
  Users,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  {
    name: "Ecosystem Overview",
    href: "/dashboard",
    icon: Home,
    description: "Ecosystem statistics and trends"
  },
  {
    name: "Grant Systems", 
    href: "/dashboard/systems",
    icon: Building2,
    description: "Individual grant system profiles"
  },
  {
    name: "Search & Filter",
    href: "/dashboard/search",
    icon: Search,
    description: "Advanced search across all systems"
  }
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <BarChart3 className="h-8 w-8 text-[#800020]" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Grant Ecosystem Analytics</h1>
              <p className="text-sm text-gray-600">Comprehensive dashboard for grant data insights</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                Back to API Docs
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-gray-200 min-h-[calc(100vh-81px)] overflow-y-auto">
          <div className="p-6">
            <nav className="space-y-2">
              {navigation.map((item) => {
                const isActive = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
                
                return (
                  <Link key={item.name} href={item.href}>
                    <div className={cn(
                      "group flex items-center justify-between p-4 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-[#800020] text-white shadow-md" 
                        : "text-gray-700 hover:bg-gray-100 hover:text-[#800020]"
                    )}>
                      <div className="flex items-center space-x-3">
                        <item.icon className={cn(
                          "h-5 w-5 transition-colors",
                          isActive ? "text-white" : "text-gray-500 group-hover:text-[#800020]"
                        )} />
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className={cn(
                            "text-xs",
                            isActive ? "text-white/80" : "text-gray-500"
                          )}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-white" : "text-gray-400 group-hover:text-[#800020]"
                      )} />
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}