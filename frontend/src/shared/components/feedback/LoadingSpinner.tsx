import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
  xl: 'h-16 w-16 border-4',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'lg',
  message = 'Loading...',
  fullScreen = false,
  className,
}) => {
  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-black border-t-transparent',
          sizeMap[size],
        )}
      />
      {message && (
        <p className="text-sm font-medium text-gray-500 animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 text-gray-900">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16">
      {spinner}
    </div>
  );
};
