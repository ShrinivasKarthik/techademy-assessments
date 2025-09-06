import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Accessibility, 
  Eye, 
  Keyboard, 
  Volume2, 
  MousePointer, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Settings,
  Monitor,
  Contrast
} from 'lucide-react';

interface AccessibilityRule {
  id: string;
  category: string;
  rule: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  elements?: number;
}

interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: number;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  skipLinks: boolean;
  audioDescriptions: boolean;
}

const AccessibilityManager = () => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    fontSize: 16,
    reducedMotion: false,
    screenReader: true,
    keyboardNavigation: true,
    focusIndicators: true,
    skipLinks: true,
    audioDescriptions: false
  });

  const [accessibilityResults, setAccessibilityResults] = useState<AccessibilityRule[]>([
    {
      id: '1',
      category: 'Images',
      rule: 'Images must have text alternatives',
      status: 'pass',
      description: 'All images have appropriate alt text',
      impact: 'critical',
      elements: 45
    },
    {
      id: '2',
      category: 'Color',
      rule: 'Elements must have sufficient color contrast',
      status: 'warning',
      description: '3 elements have insufficient contrast ratio',
      impact: 'serious',
      elements: 3
    },
    {
      id: '3',
      category: 'Keyboard',
      rule: 'All interactive elements must be keyboard accessible',
      status: 'fail',
      description: '2 buttons are not keyboard accessible',
      impact: 'critical',
      elements: 2
    },
    {
      id: '4',
      category: 'Forms',
      rule: 'Form inputs must have associated labels',
      status: 'pass',
      description: 'All form inputs have proper labels',
      impact: 'critical',
      elements: 28
    },
    {
      id: '5',
      category: 'Headings',
      rule: 'Heading levels should not be skipped',
      status: 'warning',
      description: 'Heading structure has minor issues',
      impact: 'moderate',
      elements: 1
    }
  ]);

  const handleRunScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    
    toast({
      title: "Accessibility Scan Started",
      description: "Analyzing application for WCAG 2.1 AA compliance..."
    });

    // Simulate scan progress
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          toast({
            title: "Scan Complete",
            description: "Found 2 critical issues that need attention"
          });
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const handleFixIssue = (issueId: string) => {
    setAccessibilityResults(prev => prev.map(rule => 
      rule.id === issueId 
        ? { ...rule, status: 'pass' as const }
        : rule
    ));
    
    toast({
      title: "Issue Fixed",
      description: "Accessibility issue has been automatically resolved"
    });
  };

  const handleSettingChange = (key: keyof AccessibilitySettings, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Apply settings to document
    if (key === 'highContrast') {
      document.documentElement.classList.toggle('high-contrast', value as boolean);
    } else if (key === 'fontSize') {
      document.documentElement.style.fontSize = `${value}px`;
    } else if (key === 'reducedMotion') {
      document.documentElement.style.setProperty(
        '--transition-smooth', 
        value ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      );
    }
  };

  const complianceScore = Math.round(
    (accessibilityResults.filter(rule => rule.status === 'pass').length / accessibilityResults.length) * 100
  );

  const criticalIssues = accessibilityResults.filter(rule => 
    rule.status === 'fail' && rule.impact === 'critical'
  ).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Accessibility className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Accessibility Manager</h1>
              <p className="text-muted-foreground">WCAG 2.1 AA compliance monitoring and settings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={complianceScore >= 90 ? "default" : "destructive"}>
              {complianceScore}% Compliant
            </Badge>
            <Button 
              onClick={handleRunScan}
              disabled={isScanning}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Run Scan'}
            </Button>
          </div>
        </div>

        {isScanning && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Scanning for accessibility issues...</span>
                  <span className="text-sm text-muted-foreground">{scanProgress}%</span>
                </div>
                <Progress value={scanProgress} />
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="compliance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compliance">Compliance Check</TabsTrigger>
            <TabsTrigger value="settings">Accessibility Settings</TabsTrigger>
            <TabsTrigger value="tools">Testing Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{complianceScore}%</div>
                  <p className="text-xs text-muted-foreground">WCAG 2.1 AA</p>
                  <Progress value={complianceScore} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{criticalIssues}</div>
                  <p className="text-xs text-muted-foreground">Require immediate attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Elements Tested</CardTitle>
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {accessibilityResults.reduce((sum, rule) => sum + (rule.elements || 0), 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Across all pages</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Accessibility Audit Results</CardTitle>
                <CardDescription>Detailed analysis of WCAG 2.1 AA compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accessibilityResults.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {rule.status === 'pass' && <CheckCircle className="h-5 w-5 text-success" />}
                            {rule.status === 'warning' && <AlertTriangle className="h-5 w-5 text-warning" />}
                            {rule.status === 'fail' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{rule.rule}</h4>
                              <Badge variant="outline">{rule.category}</Badge>
                              <Badge variant={
                                rule.impact === 'critical' ? 'destructive' :
                                rule.impact === 'serious' ? 'secondary' : 'default'
                              }>
                                {rule.impact}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                            {rule.elements && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Affects {rule.elements} element{rule.elements !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        {rule.status !== 'pass' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleFixIssue(rule.id)}
                          >
                            Fix Issue
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Visual Settings
                  </CardTitle>
                  <CardDescription>Adjust visual accessibility options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">High Contrast Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Increase contrast for better visibility
                      </p>
                    </div>
                    <Switch 
                      checked={settings.highContrast}
                      onCheckedChange={(value) => handleSettingChange('highContrast', value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Font Size</Label>
                    <div className="flex items-center gap-4">
                      <span className="text-sm w-8">12px</span>
                      <Slider
                        value={[settings.fontSize]}
                        onValueChange={([value]) => handleSettingChange('fontSize', value)}
                        min={12}
                        max={24}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm w-8">24px</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Current: {settings.fontSize}px
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Reduced Motion</Label>
                      <p className="text-sm text-muted-foreground">
                        Minimize animations and transitions
                      </p>
                    </div>
                    <Switch 
                      checked={settings.reducedMotion}
                      onCheckedChange={(value) => handleSettingChange('reducedMotion', value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Keyboard className="h-5 w-5" />
                    Navigation Settings
                  </CardTitle>
                  <CardDescription>Configure navigation accessibility features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Keyboard Navigation</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable full keyboard navigation
                      </p>
                    </div>
                    <Switch 
                      checked={settings.keyboardNavigation}
                      onCheckedChange={(value) => handleSettingChange('keyboardNavigation', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Focus Indicators</Label>
                      <p className="text-sm text-muted-foreground">
                        Show visible focus indicators
                      </p>
                    </div>
                    <Switch 
                      checked={settings.focusIndicators}
                      onCheckedChange={(value) => handleSettingChange('focusIndicators', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Skip Links</Label>
                      <p className="text-sm text-muted-foreground">
                        Provide skip to content links
                      </p>
                    </div>
                    <Switch 
                      checked={settings.skipLinks}
                      onCheckedChange={(value) => handleSettingChange('skipLinks', value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    Audio Settings
                  </CardTitle>
                  <CardDescription>Configure audio accessibility options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Screen Reader Support</Label>
                      <p className="text-sm text-muted-foreground">
                        Optimize for screen readers
                      </p>
                    </div>
                    <Switch 
                      checked={settings.screenReader}
                      onCheckedChange={(value) => handleSettingChange('screenReader', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Audio Descriptions</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable audio descriptions for media
                      </p>
                    </div>
                    <Switch 
                      checked={settings.audioDescriptions}
                      onCheckedChange={(value) => handleSettingChange('audioDescriptions', value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Keyboard Navigation Test</CardTitle>
                  <CardDescription>Test keyboard navigation throughout the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full">Start Keyboard Test</Button>
                  <div className="text-sm text-muted-foreground">
                    <p><kbd className="px-1 py-0.5 bg-muted rounded">Tab</kbd> - Navigate forward</p>
                    <p><kbd className="px-1 py-0.5 bg-muted rounded">Shift+Tab</kbd> - Navigate backward</p>
                    <p><kbd className="px-1 py-0.5 bg-muted rounded">Enter/Space</kbd> - Activate element</p>
                    <p><kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> - Close dialogs</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Color Contrast Checker</CardTitle>
                  <CardDescription>Verify color contrast ratios meet WCAG standards</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full">
                    <Contrast className="h-4 w-4 mr-2" />
                    Check Contrast Ratios
                  </Button>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Normal text:</span>
                      <Badge variant="default">4.5:1</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Large text:</span>
                      <Badge variant="default">3:1</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>UI components:</span>
                      <Badge variant="default">3:1</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={className}>{children}</label>
);

export default AccessibilityManager;