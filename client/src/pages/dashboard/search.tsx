import { Search, Filter, ChartBar, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SearchAndFilter() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Search & Filter</h1>
        <p className="text-gray-600">Advanced grant discovery and analysis</p>
      </div>

      {/* Coming Soon Card */}
      <Card className="border-2 border-dashed">
        <CardContent className="pt-12 pb-12">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#800020]/10 rounded-full mb-6">
              <Search className="h-10 w-10 text-[#800020]" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Coming Soon: Unified Grant Search
            </h2>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Soon you'll be able to search through the entire grant ecosystem in one place. 
              Discover funding opportunities, track applications, and analyze patterns across 
              all integrated systems using the power of DAOIP-5 standardization.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                  <Search className="h-6 w-6 text-gray-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Smart Search</h3>
                <p className="text-sm text-gray-600">
                  Search across all grant systems, pools, and applications simultaneously
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                  <Filter className="h-6 w-6 text-gray-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Advanced Filters</h3>
                <p className="text-sm text-gray-600">
                  Filter by funding amount, status, date range, and funding mechanism
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                  <ChartBar className="h-6 w-6 text-gray-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Real-time Analytics</h3>
                <p className="text-sm text-gray-600">
                  Get instant insights and trends from your search results
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}