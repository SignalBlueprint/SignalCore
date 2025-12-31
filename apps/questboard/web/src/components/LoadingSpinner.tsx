interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export default function LoadingSpinner({ size = 'medium', message }: LoadingSpinnerProps) {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60,
  };

  const spinnerSize = sizeMap[size];

  return (
    <div className="loading-container">
      <div
        className="loading-spinner"
        style={{
          width: spinnerSize,
          height: spinnerSize,
        }}
      />
      {message && (
        <p style={{ color: '#666', fontSize: '16px', marginTop: '8px' }}>
          {message}
        </p>
      )}
    </div>
  );
}
