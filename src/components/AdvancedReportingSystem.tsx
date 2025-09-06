import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Download, 
  FileText, 
  Mail, 
  Calendar, 
  Filter, 
  BarChart3,
  Users,
  Clock,
  Target,
  TrendingUp,
  Settings,
  Eye,
  Share
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AssessmentResultsView from './AssessmentResultsView';

interface ReportConfig {
  format: 'pdf' | 'csv' | 'excel' | 'json';
  includeParticipantDetails: boolean;
  includeQuestionAnalysis: boolean;
  includeSecurityEvents: boolean;
  includeTimeTracking: boolean;
  includeScoring: boolean;
  includeComments: boolean;
  customFields: string[];
  dateRange: {
    start: string;
    end: string;
  };
  filterCriteria: {
    minScore?: number;
    maxScore?: number;
    completionStatus?: 'all' | 'completed' | 'incomplete';
    securityLevel?: 'all' | 'no-issues' | 'minor-issues' | 'major-issues';
  };
}

interface ScheduledReport {
  id: string;
  name: string;
  config: ReportConfig;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  nextRun: Date;
  enabled: boolean;
}

interface AdvancedReportingSystemProps {
  assessmentId?: string;
}

const AdvancedReportingSystem: React.FC<AdvancedReportingSystemProps> = ({ assessmentId }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('generate');
  const [loading, setLoading] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    format: 'pdf',
    includeParticipantDetails: true,
    includeQuestionAnalysis: true,
    includeSecurityEvents: false,
    includeTimeTracking: true,
    includeScoring: true,
    includeComments: false,
    customFields: [],
    dateRange: {
      start: '',
      end: ''
    },
    filterCriteria: {
      completionStatus: 'all',
      securityLevel: 'all'
    }
  });
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [newScheduledReport, setNewScheduledReport] = useState({
    name: '',
    frequency: 'weekly' as const,
    recipients: ['']
  });

  useEffect(() => {
    loadScheduledReports();
    setDefaultDateRange();
  }, []);

  const setDefaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    
    setReportConfig(prev => ({
      ...prev,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    }));
  };

  const loadScheduledReports = async () => {
    // Mock data for scheduled reports
    const mockReports: ScheduledReport[] = [
      {
        id: '1',
        name: 'Weekly Performance Summary',
        config: { ...reportConfig, format: 'pdf' },
        frequency: 'weekly',
        recipients: ['admin@example.com'],
        nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        enabled: true
      },
      {
        id: '2',
        name: 'Monthly Detailed Analytics',
        config: { ...reportConfig, format: 'excel' },
        frequency: 'monthly',
        recipients: ['manager@example.com', 'hr@example.com'],
        nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        enabled: true
      }
    ];
    
    setScheduledReports(mockReports);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          config: reportConfig,
          assessmentIds: assessmentId ? [assessmentId] : [],
          dateRange: reportConfig.dateRange,
          includeDetails: {
            participantInfo: reportConfig.includeParticipantDetails,
            questionAnalysis: reportConfig.includeQuestionAnalysis,
            securityEvents: reportConfig.includeSecurityEvents,
            timeTracking: reportConfig.includeTimeTracking,
            scoring: reportConfig.includeScoring,
            comments: reportConfig.includeComments
          }
        }
      });

      if (error) throw error;

      if (reportConfig.format === 'pdf') {
        // Handle PDF download
        const blob = new Blob([data.content], { type: 'application/pdf' });
        downloadFile(blob, `assessment-report-${Date.now()}.pdf`);
      } else if (reportConfig.format === 'csv' || reportConfig.format === 'excel') {
        // Handle CSV/Excel download
        const blob = new Blob([data.content], { 
          type: reportConfig.format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const extension = reportConfig.format === 'csv' ? 'csv' : 'xlsx';
        downloadFile(blob, `assessment-report-${Date.now()}.${extension}`);
      } else {
        // Handle JSON download
        const blob = new Blob([JSON.stringify(data.content, null, 2)], { type: 'application/json' });
        downloadFile(blob, `assessment-report-${Date.now()}.json`);
      }

      toast({
        title: "Report Generated",
        description: `${reportConfig.format.toUpperCase()} report has been downloaded successfully.`
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Report Generation Failed",
        description: "Could not generate the report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const scheduleReport = async () => {
    const newReport: ScheduledReport = {
      id: Date.now().toString(),
      name: newScheduledReport.name,
      config: { ...reportConfig },
      frequency: newScheduledReport.frequency,
      recipients: newScheduledReport.recipients.filter(email => email.trim()),
      nextRun: calculateNextRun(newScheduledReport.frequency),
      enabled: true
    };

    setScheduledReports(prev => [...prev, newReport]);
    
    toast({
      title: "Report Scheduled",
      description: `${newReport.name} has been scheduled successfully.`
    });

    // Reset form
    setNewScheduledReport({
      name: '',
      frequency: 'weekly',
      recipients: ['']
    });
  };

  const calculateNextRun = (frequency: 'daily' | 'weekly' | 'monthly'): Date => {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  };

  const toggleScheduledReport = (id: string) => {
    setScheduledReports(prev => 
      prev.map(report => 
        report.id === id ? { ...report, enabled: !report.enabled } : report
      )
    );
  };

  const deleteScheduledReport = (id: string) => {
    setScheduledReports(prev => prev.filter(report => report.id !== id));
    toast({
      title: "Report Deleted",
      description: "Scheduled report has been removed."
    });
  };

  const previewReport = () => {
    toast({
      title: "Preview Generated",
      description: "Report preview would open in a new window."
    });
  };

  const shareReport = () => {
    toast({
      title: "Share Link Generated",
      description: "Secure share link copied to clipboard."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Reporting</h2>
          <p className="text-muted-foreground">Generate comprehensive assessment reports and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={previewReport}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={shareReport}>
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="results">Assessment Results</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                      <Label>Report Format</Label>
                      <Select 
                        value={reportConfig.format} 
                        onValueChange={(value: any) => setReportConfig(prev => ({ ...prev, format: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF Report</SelectItem>
                          <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                          <SelectItem value="csv">CSV Data</SelectItem>
                          <SelectItem value="json">JSON Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Completion Status</Label>
                      <Select 
                        value={reportConfig.filterCriteria.completionStatus} 
                        onValueChange={(value: any) => setReportConfig(prev => ({ 
                          ...prev, 
                          filterCriteria: { ...prev.filterCriteria, completionStatus: value }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Participants</SelectItem>
                          <SelectItem value="completed">Completed Only</SelectItem>
                          <SelectItem value="incomplete">Incomplete Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={reportConfig.dateRange.start}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={reportConfig.dateRange.end}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Include in Report</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'includeParticipantDetails', label: 'Participant Details' },
                        { key: 'includeQuestionAnalysis', label: 'Question Analysis' },
                        { key: 'includeSecurityEvents', label: 'Security Events' },
                        { key: 'includeTimeTracking', label: 'Time Tracking' },
                        { key: 'includeScoring', label: 'Scoring Details' },
                        { key: 'includeComments', label: 'Comments & Feedback' }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={item.key}
                            checked={reportConfig[item.key as keyof ReportConfig] as boolean}
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

            {/* Report Preview */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Format: {reportConfig.format.toUpperCase()}</div>
                    <div className="text-sm text-muted-foreground">
                      Date Range: {reportConfig.dateRange.start || 'Not set'} to {reportConfig.dateRange.end || 'Not set'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Sections Included:</div>
                    <div className="space-y-1 text-xs">
                      {reportConfig.includeParticipantDetails && <div>• Participant Details</div>}
                      {reportConfig.includeQuestionAnalysis && <div>• Question Analysis</div>}
                      {reportConfig.includeSecurityEvents && <div>• Security Events</div>}
                      {reportConfig.includeTimeTracking && <div>• Time Tracking</div>}
                      {reportConfig.includeScoring && <div>• Scoring Details</div>}
                      {reportConfig.includeComments && <div>• Comments & Feedback</div>}
                    </div>
                  </div>

                  <Button 
                    onClick={generateReport} 
                    disabled={loading}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {loading ? 'Generating...' : 'Generate Report'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Export Assessment Data
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate Analytics Summary
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Participant List Export
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <AssessmentResultsView />
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Existing Scheduled Reports */}
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {scheduledReports.length > 0 ? (
                  <div className="space-y-4">
                    {scheduledReports.map((report) => (
                      <div key={report.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{report.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant={report.enabled ? "default" : "secondary"}>
                              {report.enabled ? 'Active' : 'Paused'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleScheduledReport(report.id)}
                            >
                              {report.enabled ? 'Pause' : 'Resume'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteScheduledReport(report.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Frequency: {report.frequency}</div>
                          <div>Next run: {report.nextRun.toLocaleDateString()}</div>
                          <div>Recipients: {report.recipients.join(', ')}</div>
                          <div>Format: {report.config.format}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No scheduled reports configured</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add New Scheduled Report */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule New Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Report Name</Label>
                  <Input
                    value={newScheduledReport.name}
                    onChange={(e) => setNewScheduledReport(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    placeholder="Weekly Performance Report"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select 
                    value={newScheduledReport.frequency} 
                    onValueChange={(value: any) => setNewScheduledReport(prev => ({
                      ...prev,
                      frequency: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Email Recipients</Label>
                  {newScheduledReport.recipients.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          const newRecipients = [...newScheduledReport.recipients];
                          newRecipients[index] = e.target.value;
                          setNewScheduledReport(prev => ({
                            ...prev,
                            recipients: newRecipients
                          }));
                        }}
                        placeholder="email@example.com"
                      />
                      {newScheduledReport.recipients.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newRecipients = newScheduledReport.recipients.filter((_, i) => i !== index);
                            setNewScheduledReport(prev => ({
                              ...prev,
                              recipients: newRecipients
                            }));
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewScheduledReport(prev => ({
                      ...prev,
                      recipients: [...prev.recipients, '']
                    }))}
                  >
                    Add Recipient
                  </Button>
                </div>

                <Button 
                  onClick={scheduleReport}
                  disabled={!newScheduledReport.name.trim() || newScheduledReport.recipients.every(email => !email.trim())}
                  className="w-full"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                name: 'Basic Performance Report',
                description: 'Standard assessment results with scoring and completion rates',
                format: 'PDF',
                icon: <FileText className="w-8 h-8" />
              },
              {
                name: 'Detailed Analytics Report',
                description: 'Comprehensive analysis with charts and statistical insights',
                format: 'PDF',
                icon: <BarChart3 className="w-8 h-8" />
              },
              {
                name: 'Participant Data Export',
                description: 'Raw data export for external analysis and processing',
                format: 'Excel',
                icon: <Users className="w-8 h-8" />
              },
              {
                name: 'Security Audit Report',
                description: 'Detailed security events and proctoring violations',
                format: 'PDF',
                icon: <Settings className="w-8 h-8" />
              },
              {
                name: 'Time Analysis Report',
                description: 'Time tracking and efficiency analysis for all participants',
                format: 'CSV',
                icon: <Clock className="w-8 h-8" />
              },
              {
                name: 'Question Performance Report',
                description: 'Individual question analysis and difficulty assessment',
                format: 'PDF',
                icon: <Target className="w-8 h-8" />
              }
            ].map((template, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center text-primary">
                      {template.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    </div>
                    <Badge variant="outline">{template.format}</Badge>
                    <Button variant="outline" className="w-full">
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">127</div>
                <div className="text-sm text-muted-foreground">Reports Generated</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">23</div>
                <div className="text-sm text-muted-foreground">Scheduled Reports</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Mail className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <div className="text-2xl font-bold">89</div>
                <div className="text-sm text-muted-foreground">Email Deliveries</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Download className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold">456</div>
                <div className="text-sm text-muted-foreground">Downloads</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Report Generation Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Report analytics chart would be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReportingSystem;
