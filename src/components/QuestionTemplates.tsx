import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Layout,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Search,
  Filter,
  Star,
  Globe,
  Lock,
  Code,
  FileQuestion,
  Mic,
  Upload,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import EnhancedQuestionBuilders from "./EnhancedQuestionBuilders";

interface QuestionTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  question_type: 'coding' | 'mcq' | 'subjective' | 'file_upload' | 'audio';
  template_config: any;
  creator_id: string;
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_CATEGORIES = [
  'Programming',
  'Mathematics', 
  'Science',
  'Language Arts',
  'Business',
  'Engineering',
  'Design',
  'General',
];

const getQuestionTypeIcon = (type: string) => {
  switch (type) {
    case 'coding':
      return <Code className="h-4 w-4" />;
    case 'mcq':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'subjective':
      return <FileQuestion className="h-4 w-4" />;
    case 'audio':
      return <Mic className="h-4 w-4" />;
    case 'file_upload':
      return <Upload className="h-4 w-4" />;
    default:
      return <FileQuestion className="h-4 w-4" />;
  }
};

export default function QuestionTemplates() {
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuestionTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'General',
    question_type: 'mcq' as QuestionTemplate['question_type'],
    template_config: {},
    is_public: false,
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user, showPublicOnly]);

  const fetchTemplates = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('question_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (showPublicOnly) {
        query = query.eq('is_public', true);
      } else {
        query = query.or(`creator_id.eq.${user.id},is_public.eq.true`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTemplates(data || []);
      
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!user || !formData.name.trim()) return;

    try {
      const { error } = await supabase
        .from('question_templates')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          question_type: formData.question_type,
          template_config: formData.template_config,
          creator_id: user.id,
          is_public: formData.is_public,
        });

      if (error) throw error;

      toast({
        title: "Template Created",
        description: `"${formData.name}" template has been created successfully`,
      });

      setShowCreateModal(false);
      resetForm();
      await fetchTemplates();
      
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const updateTemplate = async (id: string, updates: Partial<QuestionTemplate>) => {
    try {
      const { error } = await supabase
        .from('question_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Template Updated",
        description: "Template has been updated successfully",
      });

      await fetchTemplates();
      
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the template "${name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('question_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Template Deleted",
        description: `"${name}" template has been deleted successfully`,
      });

      await fetchTemplates();
      
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const duplicateTemplate = async (template: QuestionTemplate) => {
    try {
      const { error } = await supabase
        .from('question_templates')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          question_type: template.question_type,
          template_config: template.template_config,
          creator_id: user!.id,
          is_public: false,
        });

      if (error) throw error;

      toast({
        title: "Template Duplicated",
        description: `Created a copy of "${template.name}"`,
      });

      await fetchTemplates();
      
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  const useTemplate = (template: QuestionTemplate) => {
    // This would integrate with question creation - for now just show success
    toast({
      title: "Template Applied",
      description: `Using template "${template.name}" for new question`,
    });
    
    // Increment usage count
    updateTemplate(template.id, {
      usage_count: template.usage_count + 1
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'General',
      question_type: 'mcq',
      template_config: {},
      is_public: false,
    });
    setSelectedTemplate(null);
  };

  const filteredTemplates = templates.filter(template => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        template.name.toLowerCase().includes(searchLower) ||
        template.description?.toLowerCase().includes(searchLower) ||
        template.category.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && template.category !== categoryFilter) {
      return false;
    }

    // Type filter
    if (typeFilter !== 'all' && template.question_type !== typeFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Templates</h1>
          <p className="text-muted-foreground">
            Create and manage reusable question templates for consistent assessments
          </p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Template name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when and how to use this template"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select 
                    value={formData.question_type} 
                    onValueChange={(value: QuestionTemplate['question_type']) => 
                      setFormData(prev => ({ ...prev, question_type: value, template_config: {} }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="coding">Coding</SelectItem>
                      <SelectItem value="subjective">Subjective</SelectItem>
                      <SelectItem value="file_upload">File Upload</SelectItem>
                      <SelectItem value="audio">Audio Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                  />
                  <Label htmlFor="is_public" className="flex items-center gap-2">
                    {formData.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {formData.is_public ? 'Public Template' : 'Private Template'}
                  </Label>
                </div>
              </div>

              {/* Template Configuration */}
              <div className="space-y-2">
                <Label>Template Configuration</Label>
                <div className="border rounded-lg p-4 bg-muted/30">
                  <EnhancedQuestionBuilders
                    questionType={formData.question_type}
                    config={formData.template_config}
                    onConfigChange={(config) => setFormData(prev => ({ ...prev, template_config: config }))}
                  />
                </div>
              </div>

              <Button onClick={createTemplate} className="w-full">
                {selectedTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {TEMPLATE_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="subjective">Subjective</SelectItem>
                  <SelectItem value="file_upload">File Upload</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={showPublicOnly}
                onCheckedChange={setShowPublicOnly}
              />
              <Label className="text-sm">Public templates only</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-16 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredTemplates.length > 0 ? (
          filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getQuestionTypeIcon(template.question_type)}
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{template.category}</Badge>
                      <Badge variant="secondary">{template.question_type}</Badge>
                      {template.is_public ? (
                        <Badge variant="outline" className="text-green-600">
                          <Globe className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600">
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => useTemplate(template)}>
                        <Layout className="mr-2 h-4 w-4" />
                        Use Template
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={() => duplicateTemplate(template)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      
                      {template.creator_id === user?.id && (
                        <>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTemplate(template);
                              setFormData({
                                name: template.name,
                                description: template.description || '',
                                category: template.category,
                                question_type: template.question_type,
                                template_config: template.template_config,
                                is_public: template.is_public,
                              });
                              setShowCreateModal(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => deleteTemplate(template.id, template.name)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Used {template.usage_count} times</span>
                  <span>{new Date(template.created_at).toLocaleDateString()}</span>
                </div>

                <Button
                  className="w-full mt-4"
                  onClick={() => useTemplate(template)}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Layout className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Templates Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {templates.length === 0 
                      ? "Create your first template to standardize question creation"
                      : "No templates match your current filters"
                    }
                  </p>
                  {templates.length === 0 && (
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Template
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}