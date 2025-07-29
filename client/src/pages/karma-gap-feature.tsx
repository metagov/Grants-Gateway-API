import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, CheckCircle, GitBranch, Database, Zap } from "lucide-react";
import karmaGapLogo from "@/assets/karma-gap-logo.png";
import { CodeBlock } from "@/components/ui/code-block";

export default function KarmaGapFeaturePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">KarmaGAP Project Identity Matching</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Cross-platform project identification system that enables seamless project tracking across different grant systems and funding platforms.
        </p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <img src={karmaGapLogo} alt="KARMA GAP" className="w-8 h-8 mr-3" />
            What is KarmaGAP Integration?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            KarmaGAP is integrated as an infrastructure service that enhances every grant application with unique project identifiers (UIDs). 
            This enables developers and researchers to track projects across multiple funding platforms, understand project impact, 
            and build comprehensive analytics tools.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-200">Universal IDs</h4>
                <p className="text-sm text-green-700 dark:text-green-300">Every project gets a unique UID for cross-platform tracking</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <GitBranch className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200">Cross-Platform</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">Track the same project across Octant, Giveth, and more</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Database className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-purple-800 dark:text-purple-200">Impact Analytics</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">Build comprehensive impact measurement tools</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            How KarmaGAP Integration Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">1. Automatic Enhancement</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                When you request grant applications, our API automatically searches KarmaGAP for each project name 
                and includes the unique project UID in the response extensions.
              </p>
              
              <h4 className="font-semibold mb-3">2. Smart Caching</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Project UIDs are cached for 4 hours with intelligent refresh patterns to ensure fast API responses 
                while keeping data current.
              </p>
              
              <h4 className="font-semibold mb-3">3. Circuit Breaker</h4>
              <p className="text-gray-600 dark:text-gray-300">
                If KarmaGAP is temporarily unavailable, our circuit breaker ensures the API continues working 
                gracefully without project UIDs.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">API Response Format</h4>
              <CodeBlock
                code={`{
  "id": "daoip5:octant:grantPool:7:grantApplication:0x1234...",
  "grantPoolId": "daoip5:octant:grantPool:7",
  "projectName": "Protocol Guild",
  "payoutAddress": "0x1234567890123456789012345678901234567890",
  "fundsApproved": 50000,
  "fundsApprovedInUSD": 125000,
  "extensions": {
    "x-karmagap-uid": "0xe0177d40df99b2dd4c94735058a283b5e0d44f7a838223fe7d7e589d2e9013bd",
    "app.octant.epochNumber": 7,
    "app.octant.totalRewards": 125000
  }
}`}
                title="Grant Application with KarmaGAP UID"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Use Cases & Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-primary">For Developers</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Build cross-platform grant analytics dashboards
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Track project funding history across platforms
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Create unified project profiles and impact metrics
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Deduplicate projects in aggregation tools
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-primary">For Researchers</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Study funding patterns across different grant systems
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Analyze project success rates and impact metrics
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Map the public goods funding ecosystem
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Generate comprehensive funding reports
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Integration Details</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-medium">API Endpoint</span>
                  <Badge variant="secondary">gapapi.karmahq.xyz</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-medium">Cache Duration</span>
                  <Badge variant="secondary">4 hours</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-medium">Batch Size</span>
                  <Badge variant="secondary">3 projects</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="font-medium">Timeout</span>
                  <Badge variant="secondary">5 seconds</Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Performance Features</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Smart Cache with Stale-While-Revalidate</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Serves cached data while refreshing in background</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Circuit Breaker Pattern</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Fails gracefully when external service is down</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Request Batching</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Optimized for bulk project lookups</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}