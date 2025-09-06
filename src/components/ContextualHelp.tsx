import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  HelpCircle, 
  Search, 
  Book, 
  Video, 
  FileText, 
  MessageCircle,
  ChevronRight,
  Star,
  Clock,
  Users,
  Play,
  Download,
  ExternalLink
} from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'article' | 'video' | 'tutorial' | 'faq';
  duration?: string;
  rating: number;
  views: number;
  lastUpdated: string;
  featured?: boolean;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
}

const ContextualHelp = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'Getting Started with Assessment Creation',
      description: 'Learn how to create your first assessment with multiple question types',
      category: 'Getting Started',
      type: 'tutorial',
      duration: '8 min',
      rating: 4.8,
      views: 1245,
      lastUpdated: '2024-01-15',
      featured: true
    },
    {
      id: '2',
      title: 'Understanding Question Types',
      description: 'Complete guide to all available question types and their best use cases',
      category: 'Questions',
      type: 'article',
      rating: 4.6,
      views: 892,
      lastUpdated: '2024-01-12'
    },
    {
      id: '3',
      title: 'Advanced Analytics Dashboard Walkthrough',
      description: 'Video tutorial on how to interpret and use analytics data',
      category: 'Analytics',
      type: 'video',
      duration: '12 min',
      rating: 4.9,
      views: 567,
      lastUpdated: '2024-01-10'
    },
    {
      id: '4',
      title: 'Setting Up Live Proctoring',
      description: 'Step-by-step guide to configure and use live proctoring features',
      category: 'Proctoring',
      type: 'tutorial',
      duration: '15 min',
      rating: 4.7,
      views: 334,
      lastUpdated: '2024-01-08'
    },
    {
      id: '5',
      title: 'Collaborative Assessment Building',
      description: 'How to work with team members on assessment creation and review',
      category: 'Collaboration',
      type: 'article',
      rating: 4.5,
      views: 456,
      lastUpdated: '2024-01-05'
    }
  ];

  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'How do I add multiple choice questions?',
      answer: 'To add multiple choice questions, click the "Add Question" button, select "Multiple Choice" from the question type dropdown, enter your question text, and add your answer options. You can mark the correct answer and set point values.',
      category: 'Questions',
      helpful: 45
    },
    {
      id: '2',
      question: 'Can I preview my assessment before publishing?',
      answer: 'Yes, you can preview your assessment at any time by clicking the "Preview" button in the assessment editor. This allows you to see exactly how students will experience the assessment.',
      category: 'Assessment',
      helpful: 38
    },
    {
      id: '3',
      question: 'How do I share an assessment with students?',
      answer: 'Once your assessment is published, you can share it by clicking the "Share" button to generate a unique link, or by adding students directly through the student management interface.',
      category: 'Sharing',
      helpful: 52
    },
    {
      id: '4',
      question: 'What analytics are available for my assessments?',
      answer: 'You have access to comprehensive analytics including completion rates, average scores, time spent, question-level performance, and detailed participant insights.',
      category: 'Analytics',
      helpful: 29
    }
  ];

  const categories = ['all', 'Getting Started', 'Questions', 'Analytics', 'Proctoring', 'Collaboration', 'Assessment', 'Sharing'];

  const filteredArticles = helpArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleStartTutorial = (articleId: string) => {
    toast({
      title: "Tutorial Started",
      description: "Opening interactive tutorial..."
    });
  };

  const handleContactSupport = () => {
    toast({
      title: "Support Contact",
      description: "Redirecting to support chat..."
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'tutorial':
        return <Play className="h-4 w-4" />;
      case 'article':
        return <FileText className="h-4 w-4" />;
      default:
        return <Book className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <HelpCircle className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Help & Support</h1>
            <p className="text-muted-foreground">Find answers, tutorials, and guidance</p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search help articles, tutorials, and FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'all' ? 'All Categories' : category}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Content */}
        {selectedCategory === 'all' && !searchQuery && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-warning" />
                Featured Content
              </CardTitle>
              <CardDescription>Popular tutorials and guides to get you started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {helpArticles.filter(article => article.featured).map(article => (
                  <div key={article.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getTypeIcon(article.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{article.title}</h4>
                        <p className="text-sm text-muted-foreground">{article.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {article.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {article.duration}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {article.rating}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {article.views}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleStartTutorial(article.id)}
                    >
                      Start Tutorial
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Help Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Help Articles & Tutorials
              </CardTitle>
              <CardDescription>
                {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredArticles.map(article => (
                  <div key={article.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(article.type)}
                          <h4 className="font-medium">{article.title}</h4>
                          <Badge variant="outline">{article.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{article.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {article.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {article.duration}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {article.rating}
                          </span>
                          <span>{article.views} views</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                {filteredFAQs.length} question{filteredFAQs.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredFAQs.map(faq => (
                  <div key={faq.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Badge variant="outline">{faq.category}</Badge>
                    </div>
                    <h4 className="font-medium mb-2">{faq.question}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{faq.answer}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {faq.helpful} people found this helpful
                      </span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          Helpful
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Support */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Still need help?</h3>
              <p className="text-muted-foreground">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={handleContactSupport}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Guide
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContextualHelp;