import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileDown, 
  FileText, 
  Download, 
  BarChart3, 
  Mail,
  Calendar,
  Users,
  TrendingUp,
  Award,
  Clock,
  Target,
  Brain,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportConfig {
  assessmentIds: string[];
  dateRange: {
    start: string;
    end: string;
  };
  includeDetails: {
    participantInfo: boolean;
    questionBreakdown: boolean;
    aiAnalysis: boolean;
    timeTracking: boolean;
    skillsAssessment: boolean;
  };
  format: 'pdf' | 'csv' | 'excel';
  recipients?: string[];
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
  };
}

interface Assessment {
  id: string;
  title: string;
  participantCount: number;
  averageScore: number;
}

const AdvancedReportingSystem: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<Assessment[]>([
    { id: '1', title: 'JavaScript Fundamentals', participantCount: 45, averageScore: 78 },
    { id: '2', title: 'React Development', participantCount: 32, averageScore: 82 },
    { id: '3', title: 'Python Algorithms', participantCount: 28, averageScore: 75 }
  ]);
  
  const [config, setConfig] = useState<ReportConfig>({
    assessmentIds: [],
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    includeDetails: {
      participantInfo: true,
      questionBreakdown: true,
      aiAnalysis: false,
      timeTracking: true,
      skillsAssessment: false
    },
    format: 'pdf',
    recipients: [],
    schedule: {
      enabled: false,
      frequency: 'weekly',
      time: '09:00'
    }
  });

  const [emailRecipients, setEmailRecipients] = useState('');

  const updateConfig = (updates: Partial<ReportConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateIncludeDetails = (key: keyof ReportConfig['includeDetails'], value: boolean) => {
    setConfig(prev => ({
      ...prev,
      includeDetails: {
        ...prev.includeDetails,
        [key]: value
      }
    }));
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      // Call edge function to generate report
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          config,
          assessmentIds: config.assessmentIds,
          dateRange: config.dateRange,
          includeDetails: config.includeDetails
        }
      });

      if (error) throw error;

      // Handle PDF download
      if (config.format === 'pdf') {
        const blob = new Blob([new Uint8Array(data.pdf)], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessment-report-${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Handle CSV/Excel download
        const blob = new Blob([data.content], { 
          type: config.format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assessment-report-${new Date().toISOString().split('T')[0]}.${config.format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Report generated successfully",
        description: `${config.format.toUpperCase()} report has been downloaded.`
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Report generation failed",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const scheduleReport = async () => {
    try {
      const { error } = await supabase.functions.invoke('schedule-report', {
        body: {
          config,
          recipients: emailRecipients.split(',').map(email => email.trim()).filter(Boolean)
        }
      });

      if (error) throw error;

      toast({
        title: "Report scheduled successfully",
        description: `Report will be sent ${config.schedule?.frequency} to specified recipients.`
      });

    } catch (error) {
      console.error('Error scheduling report:', error);
      toast({
        title: "Failed to schedule report",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  };

  const sendReport = async () => {
    if (!emailRecipients.trim()) {
      toast({
        title: "No recipients specified",
        description: "Please enter email addresses.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.functions.invoke('send-report', {
        body: {
          config,
          recipients: emailRecipients.split(',').map(email => email.trim()).filter(Boolean)
        }
      });

      if (error) throw error;

      toast({
        title: "Report sent successfully",
        description: "Report has been emailed to specified recipients."
      });

    } catch (error) {
      console.error('Error sending report:', error);
      toast({
        title: "Failed to send report",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Reporting</h2>
          <p className="text-muted-foreground">Generate comprehensive assessment reports</p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Reports</TabsTrigger>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Report Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Assessment Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Assessments</Label>
                  <div className="space-y-2">
                    {assessments.map(assessment => (
                      <div key={assessment.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={assessment.id}
                          checked={config.assessmentIds.includes(assessment.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateConfig({
                                assessmentIds: [...config.assessmentIds, assessment.id]
                              });
                            } else {
                              updateConfig({
                                assessmentIds: config.assessmentIds.filter(id => id !== assessment.id)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={assessment.id} className="text-sm">
                          {assessment.title} ({assessment.participantCount} participants)
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={config.dateRange.start}
                      onChange={(e) => updateConfig({
                        dateRange: { ...config.dateRange, start: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={config.dateRange.end}
                      onChange={(e) => updateConfig({
                        dateRange: { ...config.dateRange, end: e.target.value }
                      })}
                    />
                  </div>
                </div>

                {/* Report Format */}
                <div className="space-y-2">
                  <Label>Report Format</Label>
                  <Select value={config.format} onValueChange={(value: 'pdf' | 'csv' | 'excel') => updateConfig({ format: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                      <SelectItem value="csv">CSV Export</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Include Details */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Include in Report</Label>
                  <div className="space-y-2">
                    {[
                      { key: 'participantInfo', label: 'Participant Information', icon: Users },
                      { key: 'questionBreakdown', label: 'Question Breakdown', icon: Target },
                      { key: 'aiAnalysis', label: 'AI Analysis Results', icon: Brain },
                      { key: 'timeTracking', label: 'Time Tracking Data', icon: Clock },
                      { key: 'skillsAssessment', label: 'Skills Assessment', icon: Award }
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={config.includeDetails[key as keyof typeof config.includeDetails]}
                          onCheckedChange={(checked) => 
                            updateIncludeDetails(key as keyof typeof config.includeDetails, checked as boolean)
                          }
                        />
                        <Label htmlFor={key} className="text-sm flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Report Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-medium mb-3">Report Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Selected Assessments:</span>
                      <span>{config.assessmentIds.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date Range:</span>
                      <span>{config.dateRange.start} to {config.dateRange.end}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Format:</span>
                      <span>{config.format.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sections:</span>
                      <span>{Object.values(config.includeDetails).filter(Boolean).length}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Email Recipients (Optional)</Label>
                  <Textarea
                    placeholder="Enter email addresses separated by commas..."
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={generateReport} 
                    disabled={loading || config.assessmentIds.length === 0}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {loading ? 'Generating...' : 'Generate Report'}
                  </Button>
                  
                  {emailRecipients.trim() && (
                    <Button 
                      variant="outline" 
                      onClick={sendReport}
                      disabled={loading}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send via Email
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Automated Report Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-schedule"
                  checked={config.schedule?.enabled}
                  onCheckedChange={(checked) => updateConfig({
                    schedule: { ...config.schedule!, enabled: checked as boolean }
                  })}
                />
                <Label htmlFor="enable-schedule">Enable automated reporting</Label>
              </div>

              {config.schedule?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select 
                      value={config.schedule.frequency} 
                      onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                        updateConfig({
                          schedule: { ...config.schedule!, frequency: value }
                        })
                      }
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
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={config.schedule.time}
                      onChange={(e) => updateConfig({
                        schedule: { ...config.schedule!, time: e.target.value }
                      })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Recipients</Label>
                <Textarea
                  placeholder="Enter email addresses for scheduled reports..."
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                />
              </div>

              {config.schedule?.enabled && (
                <Button onClick={scheduleReport} className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Reports
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="w-5 h-5" />
                Report Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { 
                    name: 'Executive Summary', 
                    description: 'High-level overview for stakeholders',
                    icon: TrendingUp,
                    color: 'text-blue-600'
                  },
                  { 
                    name: 'Detailed Analysis', 
                    description: 'Comprehensive breakdown with AI insights',
                    icon: Brain,
                    color: 'text-purple-600'
                  },
                  { 
                    name: 'Compliance Report', 
                    description: 'Security and compliance focused',
                    icon: Shield,
                    color: 'text-green-600'
                  }
                ].map((template, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <template.icon className={`w-6 h-6 ${template.color}`} />
                        <h3 className="font-medium">{template.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                      <Button variant="outline" size="sm" className="w-full">
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReportingSystem;