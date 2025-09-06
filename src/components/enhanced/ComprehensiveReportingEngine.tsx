import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Download, FileText, Mail, Calendar, Clock, Settings,
  BarChart3, Users, Target, Award, Filter, Share2,
  Play, Pause, Trash2, Edit, Eye, CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'executive' | 'instructor' | 'student' | 'administrative';
  format: 'pdf' | 'csv' | 'excel' | 'json';
  sections: string[];
  filters: any;
  isDefault: boolean;
  createdBy: string;
  lastUsed?: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  nextRun: Date;
  lastRun?: Date;
  enabled: boolean;
  parameters: any;
  deliveryMethod: 'email' | 'dashboard' | 'api';
}

interface ReportExecution {
  id: string;
  reportId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  progress: number;
  downloadUrl?: string;
  error?: string;
}

const ComprehensiveReportingEngine: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('generate');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [executions, setExecutions] = useState<ReportExecution[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [reportName, setReportName] = useState('');
  const [loading, setLoading] = useState(false);

  // Advanced report configuration
  const [reportConfig, setReportConfig] = useState({
    timeRange: '30d',
    assessmentIds: [] as string[],
    participantGroups: [] as string[],
    includeAnalytics: true,
    includeComparisons: true,
    includeRecommendations: true,
    customFilters: {},
    outputFormat: 'pdf' as 'pdf' | 'excel' | 'csv' | 'json',
    deliveryOptions: {
      email: false,
      dashboard: true,
      api: false
    }
  });

  useEffect(() => {
    loadReportTemplates();
    loadScheduledReports();
    loadReportExecutions();
  }, []);

  const loadReportTemplates = async () => {
    // Mock templates - in real implementation, load from database
    const mockTemplates: ReportTemplate[] = [
      {
        id: '1',
        name: 'Executive Summary',
        description: 'High-level overview of assessment performance and ROI metrics',
        category: 'executive',
        format: 'pdf',
        sections: ['summary', 'kpis', 'trends', 'recommendations'],
        filters: { timeRange: '90d', aggregationLevel: 'high' },
        isDefault: true,
        createdBy: 'system'
      },
      {
        id: '2',
        name: 'Instructor Performance Report',
        description: 'Detailed analysis of assessment quality and student outcomes',
        category: 'instructor',
        format: 'excel',
        sections: ['assessment_analytics', 'question_performance', 'student_insights', 'improvement_areas'],
        filters: { includeQuestionDetails: true, includeStudentBreakdown: true },
        isDefault: true,
        createdBy: 'system'
      },
      {
        id: '3',
        name: 'Student Progress Report',
        description: 'Individual or cohort progress tracking and skill development',
        category: 'student',
        format: 'pdf',
        sections: ['progress_overview', 'skill_development', 'achievement_badges', 'learning_path'],
        filters: { includeSkillGaps: true, includeRecommendations: true },
        isDefault: true,
        createdBy: 'system'
      },
      {
        id: '4',
        name: 'Administrative Compliance Report',
        description: 'Compliance tracking, security events, and system usage statistics',
        category: 'administrative',
        format: 'csv',
        sections: ['security_events', 'usage_statistics', 'compliance_metrics', 'system_health'],
        filters: { includeSecurity: true, includeAuditTrail: true },
        isDefault: true,
        createdBy: 'system'
      }
    ];

    setTemplates(mockTemplates);
  };

  const loadScheduledReports = async () => {
    // Mock scheduled reports
    const mockScheduled: ScheduledReport[] = [
      {
        id: '1',
        name: 'Weekly Executive Dashboard',
        templateId: '1',
        frequency: 'weekly',
        recipients: ['ceo@company.com', 'cto@company.com'],
        nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        enabled: true,
        parameters: { timeRange: '7d', includeComparisons: true },
        deliveryMethod: 'email'
      },
      {
        id: '2',
        name: 'Monthly Instructor Insights',
        templateId: '2',
        frequency: 'monthly',
        recipients: ['instructors@company.com'],
        nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        enabled: true,
        parameters: { timeRange: '30d', includeQuestionAnalytics: true },
        deliveryMethod: 'dashboard'
      }
    ];

    setScheduledReports(mockScheduled);
  };

  const loadReportExecutions = async () => {
    // Mock execution history
    const mockExecutions: ReportExecution[] = [
      {
        id: '1',
        reportId: 'manual-1',
        status: 'completed',
        startedAt: new Date(Date.now() - 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 55 * 60 * 1000),
        progress: 100,
        downloadUrl: '/reports/executive-summary-2024.pdf'
      },
      {
        id: '2',
        reportId: 'scheduled-1',
        status: 'processing',
        startedAt: new Date(Date.now() - 10 * 60 * 1000),
        progress: 65
      }
    ];

    setExecutions(mockExecutions);
  };

  const generateReport = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Template Required",
        description: "Please select a report template",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    // Create execution record
    const executionId = crypto.randomUUID();
    const newExecution: ReportExecution = {
      id: executionId,
      reportId: `manual-${Date.now()}`,
      status: 'processing',
      startedAt: new Date(),
      progress: 0
    };

    setExecutions(prev => [newExecution, ...prev]);

    try {

      // Simulate report generation with progress updates
      const template = templates.find(t => t.id === selectedTemplate);
      
      const { data, error } = await supabase.functions.invoke('enhanced-report-generator', {
        body: {
          templateId: selectedTemplate,
          templateName: template?.name,
          config: reportConfig,
          executionId: executionId,
          advanced: {
            includeMLInsights: true,
            includePredictiveAnalytics: true,
            includeComparativeBenchmarks: true,
            customizations: {
              branding: true,
              interactiveCharts: reportConfig.outputFormat === 'pdf',
              executiveSummary: template?.category === 'executive'
            }
          }
        }
      });

      if (error) throw error;

      // Simulate progress updates
      for (let progress = 10; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setExecutions(prev => 
          prev.map(exec => 
            exec.id === newExecution.id 
              ? { ...exec, progress }
              : exec
          )
        );
      }

      // Complete execution
      setExecutions(prev => 
        prev.map(exec => 
          exec.id === newExecution.id 
            ? { 
                ...exec, 
                status: 'completed', 
                progress: 100,
                completedAt: new Date(),
                downloadUrl: data?.downloadUrl || `/reports/${template?.name}-${Date.now()}.${template?.format}`
              }
            : exec
        )
      );

      toast({
        title: "Report Generated Successfully",
        description: `${template?.name} has been generated and is ready for download`,
      });

    } catch (error) {
      console.error('Report generation error:', error);
      
      // Mark execution as failed
      setExecutions(prev => 
        prev.map(exec => 
          exec.id === newExecution.id
            ? { 
                ...exec, 
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            : exec
        )
      );

      toast({
        title: "Report Generation Failed",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const scheduleReport = async () => {
    if (!selectedTemplate || !reportName) {
      toast({
        title: "Missing Information",
        description: "Please select a template and provide a report name",
        variant: "destructive"
      });
      return;
    }

    const newScheduled: ScheduledReport = {
      id: crypto.randomUUID(),
      name: reportName,
      templateId: selectedTemplate,
      frequency: 'weekly',
      recipients: [],
      nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      enabled: true,
      parameters: reportConfig,
      deliveryMethod: 'dashboard'
    };

    setScheduledReports(prev => [newScheduled, ...prev]);
    setReportName('');

    toast({
      title: "Report Scheduled",
      description: `${reportName} has been scheduled successfully`,
    });
  };

  const toggleScheduledReport = (id: string) => {
    setScheduledReports(prev => 
      prev.map(report => 
        report.id === id 
          ? { ...report, enabled: !report.enabled }
          : report
      )
    );
  };

  const deleteScheduledReport = (id: string) => {
    setScheduledReports(prev => prev.filter(report => report.id !== id));
    toast({
      title: "Report Deleted",
      description: "Scheduled report has been removed",
    });
  };

  const downloadReport = (execution: ReportExecution) => {
    if (execution.downloadUrl) {
      // Simulate download
      toast({
        title: "Download Started",
        description: "Your report download has begun",
      });
    }
  };

  const getStatusColor = (status: ReportExecution['status']) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      case 'queued': return 'outline';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: ReportTemplate['category']) => {
    switch (category) {
      case 'executive': return <BarChart3 className="w-4 h-4" />;
      case 'instructor': return <Users className="w-4 h-4" />;
      case 'student': return <Target className="w-4 h-4" />;
      case 'administrative': return <Settings className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comprehensive Reporting Engine</h1>
          <p className="text-muted-foreground">
            Advanced report generation with AI insights and automated scheduling
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            AI-Enhanced
          </Badge>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Configuration */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Report Template</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(template.category)}
                                {template.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Time Range</Label>
                      <Select 
                        value={reportConfig.timeRange} 
                        onValueChange={(value) => setReportConfig(prev => ({ ...prev, timeRange: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7d">Last 7 days</SelectItem>
                          <SelectItem value="30d">Last 30 days</SelectItem>
                          <SelectItem value="90d">Last 3 months</SelectItem>
                          <SelectItem value="1y">Last year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Output Format</Label>
                      <Select 
                        value={reportConfig.outputFormat} 
                        onValueChange={(value: any) => setReportConfig(prev => ({ ...prev, outputFormat: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF Report</SelectItem>
                          <SelectItem value="excel">Excel Workbook</SelectItem>
                          <SelectItem value="csv">CSV Data</SelectItem>
                          <SelectItem value="json">JSON Export</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Report Name (for scheduling)</Label>
                      <Input
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        placeholder="Enter report name"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Advanced Options</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'includeAnalytics', label: 'AI Analytics' },
                        { key: 'includeComparisons', label: 'Comparative Analysis' },
                        { key: 'includeRecommendations', label: 'AI Recommendations' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={item.key}
                            checked={reportConfig[item.key as keyof typeof reportConfig] as boolean}
                            onCheckedChange={(checked) => setReportConfig(prev => ({
                              ...prev,
                              [item.key]: checked
                            }))}
                          />
                          <Label htmlFor={item.key} className="text-sm">{item.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Report Preview & Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTemplate && (
                    <>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {templates.find(t => t.id === selectedTemplate)?.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {templates.find(t => t.id === selectedTemplate)?.description}
                        </div>
                        <Badge variant="outline">
                          {templates.find(t => t.id === selectedTemplate)?.category}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Includes:</div>
                        <div className="space-y-1 text-xs">
                          {templates.find(t => t.id === selectedTemplate)?.sections.map((section) => (
                            <div key={section}>• {section.replace('_', ' ').toUpperCase()}</div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={generateReport} 
                      disabled={loading || !selectedTemplate}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {loading ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={scheduleReport}
                      disabled={!selectedTemplate || !reportName}
                      className="flex-1"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Template
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Configuration
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Advanced Filters
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {getCategoryIcon(template.category)}
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{template.category}</Badge>
                    <Badge variant="secondary">{template.format.toUpperCase()}</Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-medium">Sections:</div>
                    <div className="text-xs text-muted-foreground">
                      {template.sections.slice(0, 3).join(', ')}
                      {template.sections.length > 3 && ` +${template.sections.length - 3} more`}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedTemplate(template.id);
                        setActiveTab('generate');
                      }}
                    >
                      Use Template
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="space-y-4">
            {scheduledReports.map((report) => (
              <Card key={report.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium">{report.name}</h4>
                          <div className="text-sm text-muted-foreground">
                            {templates.find(t => t.id === report.templateId)?.name} • {report.frequency}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Next run: {report.nextRun.toLocaleDateString()} • 
                            {report.recipients.length} recipients
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={report.enabled ? 'default' : 'secondary'}>
                        {report.enabled ? 'Active' : 'Paused'}
                      </Badge>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleScheduledReport(report.id)}
                      >
                        {report.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteScheduledReport(report.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="space-y-4">
            {executions.map((execution) => (
              <Card key={execution.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium">Report #{execution.reportId}</h4>
                          <div className="text-sm text-muted-foreground">
                            Started: {execution.startedAt.toLocaleString()}
                            {execution.completedAt && ` • Completed: ${execution.completedAt.toLocaleString()}`}
                          </div>
                          {execution.error && (
                            <div className="text-sm text-red-600">Error: {execution.error}</div>
                          )}
                        </div>
                      </div>
                      
                      {execution.status === 'processing' && (
                        <div className="mt-2">
                          <Progress value={execution.progress} className="w-full" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {execution.progress}% complete
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(execution.status)}>
                        {execution.status}
                      </Badge>
                      
                      {execution.status === 'completed' && execution.downloadUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadReport(execution)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComprehensiveReportingEngine;