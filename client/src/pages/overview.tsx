import { 
  Building, 
  Layers, 
  FileText, 
  Target, 
  Code, 
  Book, 
  Play, 
  Zap, 
  Star, 
  Check, 
  CheckCircle, 
  Heart, 
  GitBranch, 
  BookOpen,
  ExternalLink,
  Clock
} from "lucide-react";
import octantLogo from "@/assets/octant-logo.png";
import givethLogo from "@/assets/giveth-logo.png";
import stellarLogo from "@/assets/stellar-logo.png";
import karmaGapLogo from "@/assets/karma-gap-logo.png";
import questbookLogo from "@/assets/questbook-logo.png";
import osoLogo from "@/assets/oso-logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-2xl p-6 md:p-8">
        <div className="max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">OpenGrants Gateway API</h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6">
            A unified interface for accessing grant data across Ethereum Ecosystem using the DAOIP-5 metadata standard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => window.location.href = "/query-builder"} className="flex items-center justify-center">
              <Play className="h-4 w-4 mr-2" />
              Get Started
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/endpoints"} className="flex items-center justify-center">
              <Book className="h-4 w-4 mr-2" />
              API Documentation
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 text-primary mr-2" />
              Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CodeBlock
              code="GET /api/v1/systems"
              title="Get all grant systems (3 active integrations)"
              language="http"
            />
            <CodeBlock
              code="GET /api/v1/pools?system=octant"
              title="Get grant pools from Octant"
              language="http"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 text-primary mr-2" />
              Key Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-3" />
                <span>DAOIP-5 compliant responses</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-3" />
                <span>Multi-system data aggregation</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-3" />
                <span>Real-time query builder</span>
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-3" />
                <span>Automated field mapping</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Supported Systems - Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Layers className="h-5 w-5 text-primary mr-2" />
              Grant Systems Integration
            </span>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/endpoints"}
              className="flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View API Docs
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5 inline mr-2" />
                Active Integrations (2)
              </h3>
              <div className="space-y-2">
                <div className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <img src={octantLogo} alt="Octant" className="w-6 h-6 mr-3" />
                  <span className="font-medium">Octant</span>
                </div>
                <div className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <img src={givethLogo} alt="Giveth" className="w-6 h-6 mr-3" />
                  <span className="font-medium">Giveth</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-600 dark:text-blue-400">
                <Clock className="h-5 w-5 inline mr-2" />
                Coming Soon (4)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <img src={stellarLogo} alt="Stellar" className="w-5 h-5 mr-2" />
                  <span className="text-sm">Stellar</span>
                </div>
                <div className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <img src={karmaGapLogo} alt="KARMA GAP" className="w-5 h-5 mr-2" />
                  <span className="text-sm">KARMA GAP</span>
                </div>
                <div className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <img src={questbookLogo} alt="Questbook" className="w-5 h-5 mr-2" />
                  <span className="text-sm">Questbook</span>
                </div>
                <div className="flex items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <img src={osoLogo} alt="OSO" className="w-5 h-5 mr-2" />
                  <span className="text-sm">OSO</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Overview */}
      <Card>
        <CardHeader>
          <CardTitle>API Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">DAOIP-5 Entity Types</h3>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                  <Building className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <div className="font-medium">Grant Systems</div>
                    <div className="text-sm text-gray-500">Organizations managing grants</div>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                  <Layers className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <div className="font-medium">Grant Pools</div>
                    <div className="text-sm text-gray-500">Funding pools with specific criteria</div>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                  <FileText className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <div className="font-medium">Applications</div>
                    <div className="text-sm text-gray-500">Project applications to pools</div>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-950 rounded-lg">
                  <Target className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <div className="font-medium">Projects</div>
                    <div className="text-sm text-gray-500">Initiatives seeking funding</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Response Formats</h3>
              <CodeBlock
                code={`{
  "@context": "http://www.daostar.org/schemas",
  "name": "Grant System Name",
  "type": "DAO",
  "data": [...]
}`}
                title="Standard DAOIP-5 Response"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Code className="h-5 w-5 text-primary mr-2" />
            Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-3">Integration Guide</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                Step-by-step guide to integrate new grant systems into the API gateway.
              </p>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span>Complete file changes walkthrough</span>
                </div>
                <div className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span>API information gathering checklist</span>
                </div>
                <div className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  <span>Field mapping and testing procedures</span>
                </div>
              </div>
              <a
                href="https://github.com/metagov/Grants-Gateway-API/blob/main/docs/integration-guide.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                View Integration Guide
              </a>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-3">Documentation</h3>
              <div className="space-y-3">
                <a
                  href="https://docs.daostar.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <FileText className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <div className="font-medium text-sm">DAOstar Docs</div>
                    <div className="text-xs text-gray-500">API reference and guides</div>
                  </div>
                </a> 
                <a
                  href="https://github.com/metagov/daostar/blob/main/DAOIPs/daoip-5.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ExternalLink className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <div className="font-medium text-sm">DAOIP-5 Spec</div>
                    <div className="text-xs text-gray-500">Official specification</div>
                  </div>
                </a>
                <a
                  href="https://github.com/metagov/daostar/blob/main/DAOIPs/x-daoip-5.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <GitBranch className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <div className="font-medium text-sm">DAOIP-5 Extension</div>
                    <div className="text-xs text-gray-500">Append contextual fields to DAOIP-5</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}