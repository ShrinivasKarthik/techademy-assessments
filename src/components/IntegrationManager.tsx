import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Globe, 
  Key, 
  Webhook, 
  Activity, 
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  endpoint: string;
  apiKey?: string;
  lastSync?: string;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
}

const IntegrationManager = () => {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: '1',
      name: 'Learning Management System',
      type: 'LMS',
      status: 'active',
      endpoint: 'https://api.lms.example.com',
      lastSync: '2 minutes ago'
    },
    {
      id: '2', 
      name: 'Student Information System',
      type: 'SIS',
      status: 'inactive',
      endpoint: 'https://api.sis.example.com',
      lastSync: '1 hour ago'
    }
  ]);

  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    {
      id: '1',
      name: 'Assessment Completion',
      url: 'https://api.example.com/webhooks/assessment',
      events: ['assessment.completed', 'assessment.submitted'],
      active: true
    }
  ]);

  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    type: '',
    endpoint: '',
    apiKey: ''
  });

  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: ''
  });

  const handleAddIntegration = () => {
    if (!newIntegration.name || !newIntegration.endpoint) {
      toast({
        title: "Validation Error",
        description: "Name and endpoint are required",
        variant: "destructive"
      });
      return;
    }

    const integration: Integration = {
      id: Date.now().toString(),
      ...newIntegration,
      status: 'inactive'
    };

    setIntegrations([...integrations, integration]);
    setNewIntegration({ name: '', type: '', endpoint: '', apiKey: '' });
    
    toast({
      title: "Integration Added",
      description: `${newIntegration.name} has been configured successfully`
    });
  };

  const handleTestConnection = async (integration: Integration) => {
    toast({
      title: "Testing Connection",
      description: `Testing connection to ${integration.name}...`
    });

    // Simulate API test
    setTimeout(() => {
      const success = Math.random() > 0.3;
      setIntegrations(prev => prev.map(int => 
        int.id === integration.id 
          ? { ...int, status: success ? 'active' : 'error' }
          : int
      ));

      toast({
        title: success ? "Connection Successful" : "Connection Failed",
        description: success 
          ? `Successfully connected to ${integration.name}`
          : `Failed to connect to ${integration.name}. Please check your configuration.`,
        variant: success ? "default" : "destructive"
      });
    }, 2000);
  };

  const handleAddWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast({
        title: "Validation Error",
        description: "Name and URL are required",
        variant: "destructive"
      });
      return;
    }

    const webhook: WebhookConfig = {
      id: Date.now().toString(),
      ...newWebhook,
      active: true
    };

    setWebhooks([...webhooks, webhook]);
    setNewWebhook({ name: '', url: '', events: [], secret: '' });
    
    toast({
      title: "Webhook Added",
      description: `${newWebhook.name} webhook has been configured`
    });
  };

  const toggleWebhook = (id: string) => {
    setWebhooks(prev => prev.map(webhook => 
      webhook.id === id 
        ? { ...webhook, active: !webhook.active }
        : webhook
    ));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Integration Manager</h1>
            <p className="text-muted-foreground">Manage external system integrations and webhooks</p>
          </div>
        </div>

        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Integration
                </CardTitle>
                <CardDescription>
                  Connect to external systems for data synchronization
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="int-name">Integration Name</Label>
                  <Input 
                    id="int-name"
                    value={newIntegration.name}
                    onChange={(e) => setNewIntegration({...newIntegration, name: e.target.value})}
                    placeholder="LMS System"
                  />
                </div>
                <div>
                  <Label htmlFor="int-type">Type</Label>
                  <Input 
                    id="int-type"
                    value={newIntegration.type}
                    onChange={(e) => setNewIntegration({...newIntegration, type: e.target.value})}
                    placeholder="LMS, SIS, CRM"
                  />
                </div>
                <div>
                  <Label htmlFor="int-endpoint">API Endpoint</Label>
                  <Input 
                    id="int-endpoint"
                    value={newIntegration.endpoint}
                    onChange={(e) => setNewIntegration({...newIntegration, endpoint: e.target.value})}
                    placeholder="https://api.example.com"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddIntegration} className="w-full">
                    Add Integration
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Globe className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h3 className="font-semibold">{integration.name}</h3>
                            <p className="text-sm text-muted-foreground">{integration.endpoint}</p>
                          </div>
                        </div>
                        <Badge variant={
                          integration.status === 'active' ? 'default' :
                          integration.status === 'error' ? 'destructive' : 'secondary'
                        }>
                          {integration.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTestConnection(integration)}
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          Test
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {integration.lastSync && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last sync: {integration.lastSync}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Webhook
                </CardTitle>
                <CardDescription>
                  Configure webhooks for real-time event notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="webhook-name">Webhook Name</Label>
                  <Input 
                    id="webhook-name"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
                    placeholder="Assessment Completion"
                  />
                </div>
                <div>
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input 
                    id="webhook-url"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
                    placeholder="https://api.example.com/webhook"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddWebhook} className="w-full">
                    Add Webhook
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Webhook className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h3 className="font-semibold">{webhook.name}</h3>
                            <p className="text-sm text-muted-foreground">{webhook.url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={webhook.active}
                            onCheckedChange={() => toggleWebhook(webhook.id)}
                          />
                          <span className="text-sm">{webhook.active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {webhook.events.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-2">Events:</p>
                        <div className="flex gap-2 flex-wrap">
                          {webhook.events.map((event, index) => (
                            <Badge key={index} variant="outline">{event}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Key Management</CardTitle>
                <CardDescription>
                  Manage API keys for external system authentication
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Platform API Key</h4>
                      <p className="text-sm text-muted-foreground">
                        {showApiKey === 'platform' ? 'sk_test_1234567890abcdef' : '••••••••••••••••'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowApiKey(showApiKey === 'platform' ? null : 'platform')}
                      >
                        {showApiKey === 'platform' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm">
                        Regenerate
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Webhook Secret</h4>
                      <p className="text-sm text-muted-foreground">
                        {showApiKey === 'webhook' ? 'whsec_abcdef1234567890' : '••••••••••••••••'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowApiKey(showApiKey === 'webhook' ? null : 'webhook')}
                      >
                        {showApiKey === 'webhook' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm">
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default IntegrationManager;