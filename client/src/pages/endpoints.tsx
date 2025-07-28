import { useState } from "react";
import { 
  Building, 
  Layers, 
  FileText, 
  Target,
  Copy,
  Check
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function EndpointsPage() {
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const CodeBlock = ({ children, text, id }: { children: React.ReactNode; text: string; id: string }) => {
    const isCopied = copiedStates[id];
    
    return (
      <div className="relative bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
        <Button
          variant="ghost"
          size="sm"
          className={`absolute top-2 right-2 h-8 w-8 p-0 transition-colors ${
            isCopied ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
          }`}
          onClick={() => copyToClipboard(text, id)}
        >
          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
        {children}
      </div>
    );
  };
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">API Endpoints</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Complete reference for all available API endpoints with DAOIP-5 compliant responses.
        </p>
      </div>

      {/* Pagination Documentation */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">Pagination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            All collection endpoints support pagination. Use these parameters to control response size and navigate through results.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium mb-3 text-blue-900 dark:text-blue-100">Query Parameters</h5>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <code className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded mr-3 min-w-[60px]">limit</code>
                  <span className="text-blue-700 dark:text-blue-300">Number of items per page (default: 10, max: 100)</span>
                </div>
                <div className="flex">
                  <code className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded mr-3 min-w-[60px]">offset</code>
                  <span className="text-blue-700 dark:text-blue-300">Number of items to skip (default: 0)</span>
                </div>
                <div className="flex">
                  <code className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded mr-3 min-w-[60px]">page</code>
                  <span className="text-blue-700 dark:text-blue-300">Page number (alternative to offset, starts at 1)</span>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium mb-3 text-blue-900 dark:text-blue-100">Response Format</h5>
              <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
                <pre className="text-xs text-blue-800 dark:text-blue-200 overflow-x-auto">
{`{
  "@context": "http://www.daostar.org/schemas",
  "data": [...],
  "pagination": {
    "totalCount": 25,
    "totalPages": 3,
    "currentPage": 1,
    "limit": 10,
    "offset": 0,
    "hasNext": true,
    "hasPrevious": false
  }
}`}
                </pre>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <h5 className="font-medium mb-2 text-blue-900 dark:text-blue-100">Example Usage</h5>
            <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-3">
              <code className="text-xs text-blue-800 dark:text-blue-200">
                GET /api/v1/systems?limit=5&offset=10<br/>
                GET /api/v1/pools?limit=20&page=2<br/>
                GET /api/v1/applications?system=octant&limit=50
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

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
            
            <div className="mb-4">
              <h5 className="font-medium mb-2">Query Parameters</h5>
              <div className="text-sm space-y-1">
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">limit</code> - Items per page (default: 10, max: 100)</div>
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">offset</code> - Items to skip (default: 0)</div>
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">page</code> - Page number (alternative to offset)</div>
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
                <CodeBlock 
                  text={`# Get all systems
curl -X GET "https://grants.daostar.org/api/v1/systems" \\
  -H "Accept: application/json"

# Get systems with pagination
curl -X GET "https://grants.daostar.org/api/v1/systems?limit=5&offset=0" \\
  -H "Accept: application/json"`}
                  id="systems-curl"
                >
                  <pre className="text-sm overflow-x-auto">
                    <code>{`# Get all systems
curl -X GET "https://grants.daostar.org/api/v1/systems" \\
  -H "Accept: application/json"

# Get systems with pagination
curl -X GET "https://grants.daostar.org/api/v1/systems?limit=5&offset=0" \\
  -H "Accept: application/json"`}</code>
                  </pre>
                </CodeBlock>
              </TabsContent>
              
              <TabsContent value="javascript">
                <CodeBlock 
                  text={`const response = await fetch('/api/v1/systems');
const systems = await response.json();
console.log(systems);`}
                  id="systems-javascript"
                >
                  <pre className="text-sm overflow-x-auto">
                    <code>{`const response = await fetch('/api/v1/systems');
const systems = await response.json();
console.log(systems);`}</code>
                  </pre>
                </CodeBlock>
              </TabsContent>
              
              <TabsContent value="typescript">
                <CodeBlock 
                  text={`interface GrantSystem {
  "@context": string;
  type: string;
  name: string;
  description: string;
}

const response: Response = await fetch('/api/v1/systems');
const systems: GrantSystem[] = await response.json();`}
                  id="systems-typescript"
                >
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
                </CodeBlock>
              </TabsContent>
              
              <TabsContent value="python">
                <CodeBlock 
                  text={`import requests

response = requests.get('/api/v1/systems')
systems = response.json()
print(systems)`}
                  id="systems-python"
                >
                  <pre className="text-sm overflow-x-auto">
                    <code>{`import requests

response = requests.get('/api/v1/systems')
systems = response.json()
print(systems)`}</code>
                  </pre>
                </CodeBlock>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Response Format</h4>
            <CodeBlock 
              text={`{
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
}`}
              id="systems-response"
            >
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
            </CodeBlock>
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
            
            <div className="mb-4">
              <h5 className="font-medium mb-2">Query Parameters</h5>
              <div className="text-sm space-y-1">
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">system</code> - Filter by grant system (octant, giveth)</div>
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">isOpen</code> - Filter by pool status (true for open pools)</div>
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">limit</code> - Items per page (default: 10, max: 100)</div>
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">offset</code> - Items to skip (default: 0)</div>
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">page</code> - Page number (alternative to offset)</div>
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
                  <CodeBlock 
                    text={`# Get all pools
curl -X GET "https://grants.daostar.org/api/v1/pools" \\
  -H "Accept: application/json"

# Get pools with filters and pagination
curl -X GET "https://grants.daostar.org/api/v1/pools?system=octant&limit=5&page=1" \\
  -H "Accept: application/json"`}
                    id="pools-curl"
                  >
                    <pre className="text-sm overflow-x-auto">
                      <code>{`# Get all pools
curl -X GET "https://grants.daostar.org/api/v1/pools" \\
  -H "Accept: application/json"

# Get pools with filters and pagination
curl -X GET "https://grants.daostar.org/api/v1/pools?system=octant&limit=5&page=1" \\
  -H "Accept: application/json"`}</code>
                    </pre>
                  </CodeBlock>
                </TabsContent>
                
                <TabsContent value="javascript">
                  <CodeBlock 
                    text={`const response = await fetch('/api/v1/pools?system=octant');
const pools = await response.json();
console.log(pools);`}
                    id="pools-javascript"
                  >
                    <pre className="text-sm overflow-x-auto">
                      <code>{`const response = await fetch('/api/v1/pools?system=octant');
const pools = await response.json();
console.log(pools);`}</code>
                    </pre>
                  </CodeBlock>
                </TabsContent>
                
                <TabsContent value="typescript">
                  <CodeBlock 
                    text={`interface GrantPool {
  "@context": string;
  name: string;
  description: string;
  amount: string;
}

const response: Response = await fetch('/api/v1/pools?system=octant');
const pools: GrantPool[] = await response.json();`}
                    id="pools-typescript"
                  >
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
                  </CodeBlock>
                </TabsContent>
                
                <TabsContent value="python">
                  <CodeBlock 
                    text={`import requests

response = requests.get('/api/v1/pools?system=octant')
pools = response.json()
print(pools)`}
                    id="pools-python"
                  >
                    <pre className="text-sm overflow-x-auto">
                      <code>{`import requests

response = requests.get('/api/v1/pools?system=octant')
pools = response.json()
print(pools)`}</code>
                    </pre>
                  </CodeBlock>
                </TabsContent>
              </Tabs>
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
            
            <div className="mb-4">
              <h5 className="font-medium mb-2">Query Parameters</h5>
              <div className="text-sm space-y-1">
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">poolId</code> - Specific grant pool ID (defaults to latest)</div>
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">system</code> - Filter by grant system (octant, giveth)</div>
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">search</code> - Search applications by project name</div>
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">limit</code> - Items per page (default: 10, max: 100)</div>
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">offset</code> - Items to skip (default: 0)</div>
                <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">page</code> - Page number (alternative to offset)</div>
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
                <CodeBlock 
                  text={`# Get all applications
curl -X GET "https://grants.daostar.org/api/v1/applications" \\
  -H "Accept: application/json"

# Get applications with filters and pagination
curl -X GET "https://grants.daostar.org/api/v1/applications?system=octant&limit=20&page=1" \\
  -H "Accept: application/json"

# Get applications for specific pool with search
curl -X GET "https://grants.daostar.org/api/v1/applications?poolId=daoip5:octant:grantPool:7&search=protocol" \\
  -H "Accept: application/json"`}
                  id="applications-curl"
                >
                  <pre className="text-sm overflow-x-auto">
                    <code>{`# Get all applications
curl -X GET "https://grants.daostar.org/api/v1/applications" \\
  -H "Accept: application/json"

# Get applications with filters and pagination
curl -X GET "https://grants.daostar.org/api/v1/applications?system=octant&limit=20&page=1" \\
  -H "Accept: application/json"

# Get applications for specific pool with search
curl -X GET "https://grants.daostar.org/api/v1/applications?poolId=daoip5:octant:grantPool:7&search=protocol" \\
  -H "Accept: application/json"`}</code>
                  </pre>
                </CodeBlock>
              </TabsContent>
              
              <TabsContent value="javascript">
                <CodeBlock 
                  text={`// Get applications with pagination
const response = await fetch('/api/v1/applications?limit=20&page=1');
const applications = await response.json();
console.log(applications.data);
console.log('Total:', applications.pagination.totalCount);

// Get applications for specific system
const octantApps = await fetch('/api/v1/applications?system=octant');
const data = await octantApps.json();`}
                  id="applications-javascript"
                >
                  <pre className="text-sm overflow-x-auto">
                    <code>{`// Get applications with pagination
const response = await fetch('/api/v1/applications?limit=20&page=1');
const applications = await response.json();
console.log(applications.data);
console.log('Total:', applications.pagination.totalCount);

// Get applications for specific system
const octantApps = await fetch('/api/v1/applications?system=octant');
const data = await octantApps.json();`}</code>
                  </pre>
                </CodeBlock>
              </TabsContent>
              
              <TabsContent value="typescript">
                <CodeBlock 
                  text={`interface Application {
  id: string;
  grantPoolId: string;
  grantPoolName: string;
  projectName: string;
  fundsApproved: string;
  fundsApprovedInUSD: number;
  status: string;
}

interface PaginatedResponse<T> {
  "@context": string;
  data: T[];
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

const response: Response = await fetch('/api/v1/applications?limit=20');
const applications: PaginatedResponse<Application> = await response.json();`}
                  id="applications-typescript"
                >
                  <pre className="text-sm overflow-x-auto">
                    <code>{`interface Application {
  id: string;
  grantPoolId: string;
  grantPoolName: string;
  projectName: string;
  fundsApproved: string;
  fundsApprovedInUSD: number;
  status: string;
}

interface PaginatedResponse<T> {
  "@context": string;
  data: T[];
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

const response: Response = await fetch('/api/v1/applications?limit=20');
const applications: PaginatedResponse<Application> = await response.json();`}</code>
                  </pre>
                </CodeBlock>
              </TabsContent>
              
              <TabsContent value="python">
                <CodeBlock 
                  text={`import requests

# Get applications with pagination
response = requests.get('/api/v1/applications', params={
    'system': 'octant',
    'limit': 20,
    'page': 1
})
applications = response.json()
print(f"Found {applications['pagination']['totalCount']} applications")

# Get applications for specific pool
pool_response = requests.get('/api/v1/applications', params={
    'poolId': 'daoip5:octant:grantPool:7',
    'search': 'protocol'
})
pool_apps = pool_response.json()`}
                  id="applications-python"
                >
                  <pre className="text-sm overflow-x-auto">
                    <code>{`import requests

# Get applications with pagination
response = requests.get('/api/v1/applications', params={
    'system': 'octant',
    'limit': 20,
    'page': 1
})
applications = response.json()
print(f"Found {applications['pagination']['totalCount']} applications")

# Get applications for specific pool
pool_response = requests.get('/api/v1/applications', params={
    'poolId': 'daoip5:octant:grantPool:7',
    'search': 'protocol'
})
pool_apps = pool_response.json()`}</code>
                  </pre>
                </CodeBlock>
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Response Format</h4>
            <CodeBlock 
              text={`{
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
}`}
              id="applications-response"
            >
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
            </CodeBlock>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}