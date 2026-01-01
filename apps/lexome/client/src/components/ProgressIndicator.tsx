interface ProgressIndicatorProps {
  currentPosition: number;
  totalLength: number;
  className?: string;
}

export default function ProgressIndicator({ currentPosition, totalLength, className = '' }: ProgressIndicatorProps) {
  const percentage = totalLength > 0 ? Math.min(100, (currentPosition / totalLength) * 100) : 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Progress Bar */}
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-600 dark:bg-primary-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Percentage Text */}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[4rem] text-right">
        {percentage.toFixed(1)}%
      </span>
    </div>
  );
}
