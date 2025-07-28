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
                <CodeBlock 
                  text={`curl -X GET "https://api.opengrants.com/api/v1/systems" \\
  -H "Accept: application/json"`}
                  id="systems-curl"
                >
                  <pre className="text-sm overflow-x-auto">
                    <code>{`curl -X GET "https://api.opengrants.com/api/v1/systems" \\
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
                  <CodeBlock 
                    text={`curl -X GET "https://api.opengrants.com/api/v1/pools?system=octant" \\
  -H "Accept: application/json"`}
                    id="pools-curl"
                  >
                    <pre className="text-sm overflow-x-auto">
                      <code>{`curl -X GET "https://api.opengrants.com/api/v1/pools?system=octant" \\
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

              <CodeBlock 
                text={`curl -X GET "https://api.opengrants.com/api/v1/projects?system=giveth&search=impact" \\
  -H "Accept: application/json"`}
                id="projects-curl"
              >
                <pre className="text-sm overflow-x-auto">
                  <code>{`curl -X GET "https://api.opengrants.com/api/v1/projects?system=giveth&search=impact" \\
  -H "Accept: application/json"`}</code>
                </pre>
              </CodeBlock>
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

              <CodeBlock 
                text={`curl -X GET "https://api.opengrants.com/api/v1/applications?system=octant" \\
  -H "Accept: application/json"`}
                id="applications-curl"
              >
                <pre className="text-sm overflow-x-auto">
                  <code>{`curl -X GET "https://api.opengrants.com/api/v1/applications?system=octant" \\
  -H "Accept: application/json"`}</code>
                </pre>
              </CodeBlock>
            </div>
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