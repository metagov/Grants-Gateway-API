import { 
  Building, 
  Layers, 
  FileText, 
  Target 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EndpointsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">API Endpoints</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Complete reference for all available API endpoints with DAOIP-5 compliant responses.
        </p>
      </div>

      {/* Grant Systems */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Grant Systems
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">GET /api/v1/systems</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Retrieve all available grant systems following DAOIP-5 specification.
            </p>
            
            <Tabs defaultValue="curl" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>
              
              <TabsContent value="curl">
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                  <pre className="text-sm overflow-x-auto">
                    <code>{`curl -X GET "https://api.opengrants.com/api/v1/systems" \\
  -H "Accept: application/json"`}</code>
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="javascript">
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                  <pre className="text-sm overflow-x-auto">
                    <code>{`const response = await fetch('/api/v1/systems');
const systems = await response.json();
console.log(systems);`}</code>
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="typescript">
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                  <pre className="text-sm overflow-x-auto">
                    <code>{`interface GrantSystem {
  "@context": string;
  type: string;
  name: string;
  description: string;
}

const response: Response = await fetch('/api/v1/systems');
const systems: GrantSystem[] = await response.json();`}</code>
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="python">
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                  <pre className="text-sm overflow-x-auto">
                    <code>{`import requests

response = requests.get('/api/v1/systems')
systems = response.json()
print(systems)`}</code>
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Response Format</h4>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <pre className="text-sm overflow-x-auto">
                <code>{`{
  "@context": "http://www.daostar.org/schemas",
  "data": [
    {
      "type": "DAO",
      "name": "Octant",
      "description": "Ethereum public goods funding platform",
      "uri": "daoip5:octant:grantSystem",
      "poolsURI": "/api/v1/pools?system=octant"
    }
  ]
}`}</code>
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grant Pools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Layers className="h-5 w-5 mr-2" />
            Grant Pools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">GET /api/v1/pools</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Retrieve grant pools with optional filtering by system.
            </p>
            
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">Query Parameters</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded mr-3 min-w-[80px]">system</code>
                    <span className="text-gray-600 dark:text-gray-300">Filter by grant system (octant, giveth)</span>
                  </div>
                  <div className="flex">
                    <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded mr-3 min-w-[80px]">limit</code>
                    <span className="text-gray-600 dark:text-gray-300">Number of results (default: 10, max: 100)</span>
                  </div>
                  <div className="flex">
                    <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded mr-3 min-w-[80px]">offset</code>
                    <span className="text-gray-600 dark:text-gray-300">Pagination offset (default: 0)</span>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="curl" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                </TabsList>
                
                <TabsContent value="curl">
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                    <pre className="text-sm overflow-x-auto">
                      <code>{`curl -X GET "https://api.opengrants.com/api/v1/pools?system=octant" \\
  -H "Accept: application/json"`}</code>
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="javascript">
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                    <pre className="text-sm overflow-x-auto">
                      <code>{`const response = await fetch('/api/v1/pools?system=octant');
const pools = await response.json();
console.log(pools);`}</code>
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="typescript">
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                    <pre className="text-sm overflow-x-auto">
                      <code>{`interface GrantPool {
  "@context": string;
  name: string;
  description: string;
  amount: string;
}

const response: Response = await fetch('/api/v1/pools?system=octant');
const pools: GrantPool[] = await response.json();`}</code>
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="python">
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                    <pre className="text-sm overflow-x-auto">
                      <code>{`import requests

response = requests.get('/api/v1/pools?system=octant')
pools = response.json()
print(pools)`}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">GET /api/v1/projects</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Retrieve projects from grant systems with search and filtering capabilities.
            </p>
            
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">Query Parameters</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded mr-3 min-w-[80px]">system</code>
                    <span className="text-gray-600 dark:text-gray-300">Filter by grant system</span>
                  </div>
                  <div className="flex">
                    <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded mr-3 min-w-[80px]">search</code>
                    <span className="text-gray-600 dark:text-gray-300">Search projects by name or description</span>
                  </div>
                  <div className="flex">
                    <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded mr-3 min-w-[80px]">limit</code>
                    <span className="text-gray-600 dark:text-gray-300">Number of results (default: 10, max: 100)</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                <pre className="text-sm overflow-x-auto">
                  <code>{`curl -X GET "https://api.opengrants.com/api/v1/projects?system=giveth&search=impact" \\
  -H "Accept: application/json"`}</code>
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">GET /api/v1/applications</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Retrieve grant applications with filtering by pool and system.
            </p>
            
            <div className="space-y-4">
              <div>
                <h5 className="font-medium mb-2">Query Parameters</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded mr-3 min-w-[100px]">poolId</code>
                    <span className="text-gray-600 dark:text-gray-300">Specific grant pool ID (defaults to latest)</span>
                  </div>
                  <div className="flex">
                    <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded mr-3 min-w-[100px]">system</code>
                    <span className="text-gray-600 dark:text-gray-300">Filter by grant system</span>
                  </div>
                  <div className="flex">
                    <code className="bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded mr-3 min-w-[100px]">limit</code>
                    <span className="text-gray-600 dark:text-gray-300">Number of results (default: 10, max: 100)</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                <pre className="text-sm overflow-x-auto">
                  <code>{`curl -X GET "https://api.opengrants.com/api/v1/applications?system=octant" \\
  -H "Accept: application/json"`}</code>
                </pre>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Response Format</h4>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <pre className="text-sm overflow-x-auto">
                <code>{`{
  "@context": "http://www.daostar.org/schemas",
  "data": [
    {
      "grantPoolId": "daoip5:octant:grantPool:7",
      "grantPoolName": "Octant Epoch 7",
      "projectId": "daoip5:protocol-guild:project:0x...",
      "projectName": "Protocol Guild",
      "fundsApproved": "50000000000000000000",
      "fundsApprovedInUSD": 150000,
      "status": "Approved"
    }
  ],
  "pagination": {
    "totalCount": 42,
    "totalPages": 5,
    "currentPage": 1,
    "hasNext": true,
    "hasPrevious": false
  }
}`}</code>
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}