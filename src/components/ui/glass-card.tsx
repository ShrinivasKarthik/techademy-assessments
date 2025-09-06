import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary';
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default',
  hover = true
}) => {
  console.log('GlassCard: Rendering', { variant, className });
  const variants = {
    default: 'bg-white/10 border-white/20',
    primary: 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30',
    secondary: 'bg-gradient-to-br from-secondary/20 to-secondary/10 border-secondary/30'
  };

  return (
    <div
      className={cn(
        'backdrop-blur-md border rounded-xl shadow-xl transition-all duration-300',
        variants[variant],
        hover && 'hover:scale-[1.02] hover:shadow-2xl hover:bg-opacity-20',
        className
      )}
    >
      {children}
    </div>
  );
};