/**
 * Loading spinner components for consistent loading states
 * Provides various loading indicators for different use cases
 */

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function LoadingSpinner({ 
  size = 'md', 
  className,
  text 
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={cn('animate-spin', sizeClasses[size])} />
        {text && (
          <p className="text-sm text-slate-600 animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
}

interface LoadingCardProps {
  className?: string;
  text?: string;
  height?: string;
}

export function LoadingCard({ 
  className, 
  text = 'Loading...',
  height = 'h-32'
}: LoadingCardProps) {
  return (
    <div className={cn(
      'flex items-center justify-center border border-slate-200 rounded-lg bg-slate-50',
      height,
      className
    )}>
      <LoadingSpinner text={text} />
    </div>
  );
}

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingTable({ 
  rows = 5, 
  columns = 4, 
  className 
}: LoadingTableProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Header skeleton */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded animate-pulse" />
        ))}
      </div>
      
      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-4 bg-slate-100 rounded animate-pulse"
              style={{ 
                animationDelay: `${(rowIndex * columns + colIndex) * 0.1}s` 
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface LoadingPageProps {
  text?: string;
  className?: string;
}

export function LoadingPage({ 
  text = 'Loading...',
  className 
}: LoadingPageProps) {
  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center bg-slate-50',
      className
    )}>
      <div className="text-center">
        <LoadingSpinner size="xl" />
        <p className="mt-4 text-lg text-slate-600">{text}</p>
      </div>
    </div>
  );
}

interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function LoadingButton({ 
  loading, 
  children, 
  className,
  disabled,
  onClick,
  type = 'button'
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors',
        'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  text?: string;
  className?: string;
}

export function LoadingOverlay({ 
  loading, 
  children, 
  text = 'Loading...',
  className 
}: LoadingOverlayProps) {
  if (!loading) return <>{children}</>;

  return (
    <div className={cn('relative', className)}>
      {children}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-slate-600">{text}</p>
        </div>
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

export function Skeleton({ 
  className, 
  height = 'h-4',
  width = 'w-full'
}: SkeletonProps) {
  return (
    <div 
      className={cn(
        'animate-pulse bg-slate-200 rounded',
        height,
        width,
        className
      )} 
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ 
  lines = 3, 
  className 
}: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i}
          height="h-4"
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
}

