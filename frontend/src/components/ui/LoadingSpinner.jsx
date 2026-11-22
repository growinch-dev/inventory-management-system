const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
  xl: 'h-16 w-16 border-4',
};

const LoadingSpinner = ({
  size = 'md',
  className = '',
  fullScreen = false,
  text,
}) => {
  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`
          animate-spin rounded-full border-primary border-t-transparent
          ${sizes[size]}
        `}
      />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// Skeleton loader for content
const Skeleton = ({ className = '', variant = 'text' }) => {
  const variants = {
    text: 'h-4 rounded',
    title: 'h-6 w-48 rounded',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24 rounded-lg',
    card: 'h-32 rounded-xl',
    image: 'h-48 rounded-lg',
  };

  return (
    <div
      className={`
        bg-gray-200 animate-pulse
        ${variants[variant]}
        ${className}
      `}
    />
  );
};

// Full page loader
const Page = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner size="lg" text={text} />
  </div>
);

// Container loader for sections (used inline within cards/sections)
const Container = ({ className = '', text }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <LoadingSpinner size="lg" text={text} />
  </div>
);

LoadingSpinner.Skeleton = Skeleton;
LoadingSpinner.Page = Page;
LoadingSpinner.Container = Container;

export default LoadingSpinner;
