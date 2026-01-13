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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Key, Clock, Users, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

interface ApiKeyInfo {
  id: string;
  preview: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  status: string;
}

export default function GetApiAccess() {
  const { user, isLoading: authLoading, login, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Type-safe user with proper properties
  const typedUser = user as User | undefined;

  // Fetch existing API keys
  const { data: keysData, isLoading: keysLoading } = useQuery<{ keys: ApiKeyInfo[] }>({
    queryKey: ['/api/auth/keys'],
    enabled: !!typedUser?.email,
  });

  // Delete/revoke API key mutation
  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await fetch(`/api/auth/keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to revoke key');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/keys'] });
      toast({
        title: "Key revoked",
        description: "The API key has been revoked and can no longer be used.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to revoke key",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['/api/auth/keys'] });
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
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!typedUser || !typedUser.email) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Authentication Required</CardTitle>
              <CardDescription>
                You need to log in to access API registration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => login()} 
                className="w-full"
                data-testid="button-login"
              >
                Log In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (apiKey) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Key className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-700">
                Registration Complete!
              </CardTitle>
              <CardDescription>
                Your API key has been generated. Please save it securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Key className="w-4 h-4 mr-2" />
                  Your API Key
                </h3>
                <div className="flex items-center space-x-2">
                  <code 
                    className="flex-1 bg-white p-2 rounded border text-sm font-mono break-all"
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
                  <Shield className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Secure Storage</h4>
                    <p className="text-sm text-gray-600">
                      Store this key securely. It cannot be recovered if lost.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Expires in 3 Months</h4>
                    <p className="text-sm text-gray-600">
                      Your key expires on {new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Using Your API Key</h3>
                <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto">
                  <div className="whitespace-nowrap">curl -H "Authorization: Bearer {apiKey}" \</div>
                  <div className="ml-4 whitespace-nowrap">{window.location.origin}/api/v1/grantSystems</div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(`curl -H "Authorization: Bearer ${apiKey}" ${window.location.origin}/api/v1/grantSystems`);
                    toast({ title: "Command copied", description: "curl command copied to clipboard" });
                  }}
                  data-testid="button-copy-curl"
                >
                  Copy curl command
                </Button>
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

  const existingKeys = keysData?.keys || [];
  const activeKeys = existingKeys.filter(k => k.status === 'active');

  const getExpirationStatus = (expiresAt: string) => {
    const expDate = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return { text: 'Expired', variant: 'destructive' as const };
    if (daysLeft <= 7) return { text: `${daysLeft}d left`, variant: 'destructive' as const };
    if (daysLeft <= 30) return { text: `${daysLeft}d left`, variant: 'secondary' as const };
    return { text: `${daysLeft}d left`, variant: 'outline' as const };
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Existing Keys Management */}
        {!keysLoading && existingKeys.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5" />
                Your API Keys
              </CardTitle>
              <CardDescription>
                Manage your existing API keys. {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {existingKeys.map((key) => {
                  const expStatus = getExpirationStatus(key.expiresAt);
                  const isExpired = key.status === 'revoked' || expStatus.text === 'Expired';
                  
                  return (
                    <div 
                      key={key.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${isExpired ? 'bg-gray-50 opacity-60' : 'bg-white'}`}
                      data-testid={`key-item-${key.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono">{key.preview}</code>
                          {key.status === 'revoked' ? (
                            <Badge variant="destructive" className="text-xs">Revoked</Badge>
                          ) : (
                            <Badge variant={expStatus.variant} className="text-xs">{expStatus.text}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{key.name}</p>
                        <div className="flex gap-3 text-xs text-gray-400 mt-1">
                          <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                          {key.lastUsedAt && (
                            <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      {key.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => revokeMutation.mutate(key.id)}
                          disabled={revokeMutation.isPending}
                          data-testid={`button-revoke-${key.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {activeKeys.length >= 3 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    You have {activeKeys.length} active keys. Consider revoking unused keys for better security.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Registration Form */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {existingKeys.length > 0 ? 'Generate New API Key' : 'Get API Access'}
            </CardTitle>
            <CardDescription>
              {existingKeys.length > 0 
                ? 'Generate an additional API key for your account.'
                : 'Register for API access to the OpenGrants Gateway. Tell us about your organization and intended use.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Logged in as:</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => logout()}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Log out
                </Button>
              </div>
              <div className="flex items-center space-x-3 mt-2">
                {typedUser.profileImageUrl && (
                  <img 
                    src={typedUser.profileImageUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{typedUser.firstName || ''} {typedUser.lastName || ''}</p>
                  <p className="text-sm text-gray-600">{typedUser.email}</p>
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