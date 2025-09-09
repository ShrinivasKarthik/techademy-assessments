import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Edit, Trash2, Copy, Star, Code, HelpCircle, FileText, Upload, Mic } from 'lucide-react';

interface QuestionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  question_type: 'mcq' | 'coding' | 'subjective' | 'file_upload' | 'audio' | 'interview';
  template_config: any;
  usage_count: number;
  is_public: boolean;
  creator_id: string;
  created_at: string;
}

interface QuestionTemplateSelectorProps {
  onSelectTemplate: (template: QuestionTemplate) => void;
  selectedType?: string;
  mode?: 'select' | 'manage';
}

const questionTypeIcons = {
  mcq: HelpCircle,
  coding: Code,
  subjective: FileText,
  file_upload: Upload,
  audio: Mic,
};

const QuestionTemplateSelector: React.FC<QuestionTemplateSelectorProps> = ({
  onSelectTemplate,
  selectedType,
  mode = 'select'
}) => {
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<QuestionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuestionTemplate | null>(null);
  const { toast } = useToast();

  // Form state for creating/editing templates
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    question_type: 'mcq' as QuestionTemplate['question_type'],
    template_config: {},
    is_public: false
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, selectedCategory, selectedType]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('question_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (selectedType && ['mcq', 'coding', 'subjective', 'file_upload', 'audio'].includes(selectedType)) {
        query = query.eq('question_type', selectedType as QuestionTemplate['question_type']);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load question templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    if (selectedType) {
      filtered = filtered.filter(template => template.question_type === selectedType);
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateTemplate = async () => {
    try {
      if (!formData.name.trim() || !formData.category.trim()) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('question_templates')
        .insert([{
          ...formData,
          creator_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
      
      toast({
        title: "Success",
        description: "Question template created successfully",
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create question template",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const { data, error } = await supabase
        .from('question_templates')
        .update(formData)
        .eq('id', editingTemplate.id)
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? data : t));
      setEditingTemplate(null);
      resetForm();
      
      toast({
        title: "Success",
        description: "Question template updated successfully",
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update question template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('question_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      toast({
        title: "Success",
        description: "Question template deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete question template",
        variant: "destructive",
      });
    }
  };

  const handleUseTemplate = async (template: QuestionTemplate) => {
    try {
      // Increment usage count
      await supabase
        .from('question_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template.id);

      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, usage_count: t.usage_count + 1 } : t
      ));

      onSelectTemplate(template);
    } catch (error) {
      console.error('Error updating template usage:', error);
      // Still call onSelectTemplate even if usage count update fails
      onSelectTemplate(template);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      question_type: 'mcq',
      template_config: {},
      is_public: false
    });
  };

  const openEditModal = (template: QuestionTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      question_type: template.question_type,
      template_config: template.template_config,
      is_public: template.is_public
    });
  };

  const categories = [...new Set(templates.map(t => t.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Question Templates</h2>
          <p className="text-muted-foreground">
            Use pre-built templates to create questions faster
          </p>
        </div>
        {mode === 'manage' && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => {
          const IconComponent = questionTypeIcons[template.question_type];
          
          return (
            <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {template.is_public && (
                      <Star className="w-4 h-4 text-yellow-500" />
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {template.usage_count}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {template.question_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleUseTemplate(template)}
                    className="flex-1"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Use Template
                  </Button>
                  
                  {mode === 'manage' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditModal(template)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No templates found matching your criteria</p>
        </div>
      )}

      {/* Create/Edit Template Modal */}
      <Dialog 
        open={isCreateModalOpen || editingTemplate !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false);
            setEditingTemplate(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Template name"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category *</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Programming, Math, Science"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Question Type</label>
              <Select 
                value={formData.question_type} 
                onValueChange={(value: QuestionTemplate['question_type']) => 
                  setFormData(prev => ({ ...prev, question_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="subjective">Written Response</SelectItem>
                  <SelectItem value="file_upload">File Upload</SelectItem>
                  <SelectItem value="audio">Audio Response</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this template is for..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                />
                <label htmlFor="is_public" className="text-sm">
                  Make this template public
                </label>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingTemplate(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                  {editingTemplate ? 'Update' : 'Create'} Template
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionTemplateSelector;