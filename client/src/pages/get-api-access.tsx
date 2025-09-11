import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema, type RegistrationData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Key, Clock, Users } from "lucide-react";

interface RegistrationResponse {
  message: string;
  apiKey: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    orgName: string;
  };
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export default function GetApiAccess() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Type-safe user with proper properties
  const typedUser = user as User | undefined;

  const form = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      orgName: "",
      intentOfUse: "",
    },
  });

  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationData): Promise<RegistrationResponse> => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setApiKey(data.apiKey);
      toast({
        title: "Registration successful!",
        description: "Your API key has been generated. Please save it securely.",
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationData) => {
    registrationMutation.mutate(data);
  };

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast({
        title: "API Key copied",
        description: "Your API key has been copied to clipboard",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!typedUser || !typedUser.email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Authentication Required</CardTitle>
            <CardDescription>
              You need to log in to access API registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/api/login'} 
              className="w-full"
              data-testid="button-login"
            >
              Log in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (apiKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Key className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-400">
                Registration Complete!
              </CardTitle>
              <CardDescription>
                Your API key has been generated. Please save it securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Key className="w-4 h-4 mr-2" />
                  Your API Key
                </h3>
                <div className="flex items-center space-x-2">
                  <code 
                    className="flex-1 bg-white dark:bg-gray-900 p-2 rounded border text-sm font-mono break-all"
                    data-testid="text-api-key"
                  >
                    {apiKey}
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyApiKey}
                    data-testid="button-copy-api-key"
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Secure Storage</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Store this key securely. It cannot be recovered if lost.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Expires in 3 Months</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your key expires on {new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Using Your API Key</h3>
                <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono">
                  <div>curl -H "Authorization: Bearer {apiKey.slice(0, 20)}..." \</div>
                  <div className="ml-4">https://your-app.replit.app/api/octant/epochs</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button 
                  onClick={() => window.location.href = '/'} 
                  className="flex-1"
                  data-testid="button-dashboard"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/api/docs'} 
                  className="flex-1"
                  data-testid="button-api-docs"
                >
                  View API Docs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Get API Access</CardTitle>
            <CardDescription>
              Register for API access to the OpenGrants Gateway. Tell us about your organization and intended use.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold mb-2">Logged in as:</h3>
              <div className="flex items-center space-x-3">
                {typedUser.profileImageUrl && (
                  <img 
                    src={typedUser.profileImageUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{typedUser.firstName || ''} {typedUser.lastName || ''}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{typedUser.email}</p>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="orgName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your organization name"
                          {...field}
                          data-testid="input-org-name"
                        />
                      </FormControl>
                      <FormDescription>
                        The name of your organization or company
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="intentOfUse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intended Use</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe how you plan to use the OpenGrants Gateway API..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="input-intent"
                        />
                      </FormControl>
                      <FormDescription>
                        Please describe your intended use case for the API (minimum 10 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">API Key Terms</h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• API keys expire after 3 months</li>
                    <li>• Rate limits apply to protect external APIs</li>
                    <li>• Keys cannot be recovered if lost</li>
                    <li>• Use for legitimate research and development only</li>
                  </ul>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={registrationMutation.isPending}
                  data-testid="button-register"
                >
                  {registrationMutation.isPending ? "Generating API Key..." : "Generate API Key"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}