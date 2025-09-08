import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  className?: string;
  children?: React.ReactNode;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  className,
  children 
}) => {
  return (
    <div 
      className={cn(
        "animate-pulse bg-muted rounded-md",
        className
      )}
    >
      {children}
    </div>
  );
};

export const EvaluationSkeletonCard = () => (
  <div className="bg-card border rounded-lg p-6 space-y-4">
    <div className="flex items-center justify-between">
      <SkeletonLoader className="h-6 w-32" />
      <SkeletonLoader className="h-4 w-16" />
    </div>
    <SkeletonLoader className="h-4 w-full" />
    <SkeletonLoader className="h-2 w-full" />
    <div className="flex justify-between">
      <SkeletonLoader className="h-4 w-20" />
      <SkeletonLoader className="h-4 w-16" />
    </div>
  </div>
);

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("border rounded-lg p-6 space-y-4", className)}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
};

export const SkeletonList: React.FC<{ 
  count?: number; 
  className?: string;
}> = ({ count = 3, className }) => {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export const SkeletonTable: React.FC<{ 
  rows?: number; 
  cols?: number;
  className?: string;
}> = ({ rows = 5, cols = 4, className }) => {
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <div className="border-b p-4 bg-muted/50">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-3/4" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b last:border-b-0 p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};