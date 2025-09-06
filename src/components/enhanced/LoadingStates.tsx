import React from 'react';
import { LoadingCard, LoadingSpinner } from '@/components/ui/loading-spinner';
import { SkeletonList } from '@/components/ui/skeleton-loader';
import { Card, CardContent } from '@/components/ui/card';

export const QuestionBankLoading = () => (
  <div className="space-y-6">
    <LoadingCard 
      title="Loading Question Bank..." 
      description="Fetching your questions and analytics"
    />
    <SkeletonList count={5} />
  </div>
);

export const AssemblyProcessLoading = () => (
  <Card>
    <CardContent className="py-8">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-center space-y-2">
          <h3 className="font-semibold">AI Assembly in Progress</h3>
          <p className="text-sm text-muted-foreground">
            Analyzing questions and optimizing selection...
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const CollaborationLoading = () => (
  <div className="space-y-4">
    <LoadingCard 
      title="Connecting to Collaboration Session..." 
      description="Establishing real-time connection"
    />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LoadingCard title="Loading Collaborators" />
      <LoadingCard title="Loading Comments" />
    </div>
  </div>
);

export const CodeExecutionLoading = () => (
  <Card className="border-primary/20 bg-primary/5">
    <CardContent className="py-6">
      <LoadingSpinner 
        size="md" 
        text="Executing code and analyzing results..." 
      />
    </CardContent>
  </Card>
);