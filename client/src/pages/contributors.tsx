import { 
  Building, 
  Heart, 
  Star, 
  Book, 
  CheckCircle, 
  CircleUserRound,
  Clock, 
  Database 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ContributorsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Contributors & Supporters</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Organizations and platforms powering the OpenGrants Gateway ecosystem.
        </p>
      </div>

      {/* Mission Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Heart className="h-5 w-5 text-red-500 mr-2" />
            Our Mission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            The OpenGrants Gateway API democratizes access to grant funding data across the Ethereum ecosystem. 
            By standardizing grant information through the DAOIP-5 specification, we enable developers, researchers, 
            and organizations to build innovative tools that strengthen public goods funding and enhance transparency 
            in decentralized grant distribution.
          </p>
        </CardContent>
      </Card>

      {/* Active Integrations */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Active Integrations</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Octant */}
          <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg mb-4 flex items-center justify-center">
              <Building className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Octant</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Ethereum public goods funding platform with quadratic funding
            </p>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Integrated
            </Badge>
          </div>

          {/* Giveth */}
          <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg mb-4 flex items-center justify-center">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Giveth</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Donation platform for public goods and social impact
            </p>
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Integrated
            </Badge>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Questbook */}
          <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg mb-4 flex items-center justify-center">
              <Book className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Questbook</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Decentralized grants orchestration platform
            </p>
            <Badge variant="secondary" className="bg-purple-100 text-yellow-800 dark:bg-purple-900 dark:text-yellow-200">
              <Clock className="h-3 w-3 mr-1" />
              Type 3 Integration
            </Badge>
          </div>

          {/* KarmaGAP */}
          <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg mb-4 flex items-center justify-center">
              <Book className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">KarmaGAP</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Grants Accountability Platform
            </p>
            <Badge variant="secondary" className="bg-purple-100 text-yellow-800 dark:bg-purple-900 dark:text-yellow-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Project Identity Provider
            </Badge>
          </div>

          {/* Stellar */}
          <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg mb-4 flex items-center justify-center">
              <Star className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Stellar</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Cross-border payments and financial inclusion platform
            </p>
            <Badge variant="secondary" className="bg-blue-100 text-yellow-800 dark:bg-blue-900 dark:text-yellow-200">
              <CircleUserRound className="h-3 w-3 mr-1" />
              Type 1 Integration
            </Badge>
          </div>

          {/* OSO */}
          <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg mb-4 flex items-center justify-center">
              <Database className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">OSO</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Open Source Observer for impact measurement
            </p>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              <Database className="h-3 w-3 mr-1" />
              Infrastructure Provider
            </Badge>
          </div>
        </div>
      </div>

      {/* Support the Project */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Heart className="h-5 w-5 text-red-500 mr-2" />
            Support the Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              OpenGrants Gateway is an open-source project that thrives on community contributions. 
              Whether you're a grant platform looking to integrate, a developer wanting to contribute code, 
              or an organization interested in supporting public goods infrastructure - there are many ways to get involved.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold">For Grant Platforms</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Integrate your platform with DAOIP-5 standard</li>
                  <li>• Increase discoverability of your grants</li>
                  <li>• Connect with the broader public goods ecosystem</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold">For Developers</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Build applications using standardized grant data</li>
                  <li>• Contribute to adapter development</li>
                  <li>• Help improve API documentation and tooling</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}