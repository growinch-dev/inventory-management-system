import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Card from './Card';

const iconBgColors = {
  primary: 'bg-gradient-to-br from-primary to-primary-600',
  success: 'bg-gradient-to-br from-success to-green-600',
  warning: 'bg-gradient-to-br from-warning to-yellow-600',
  danger: 'bg-gradient-to-br from-danger to-red-600',
  info: 'bg-gradient-to-br from-info to-sky-600',
  secondary: 'bg-gradient-to-br from-secondary-600 to-secondary-700',
  gray: 'bg-gradient-to-br from-secondary-400 to-secondary-500',
  grey: 'bg-gradient-to-br from-secondary-400 to-secondary-500',
  default: 'bg-gradient-to-br from-secondary-400 to-secondary-500',
  // Support legacy bg-* classes
  'bg-primary': 'bg-gradient-to-br from-primary to-primary-600',
  'bg-success': 'bg-gradient-to-br from-success to-green-600',
  'bg-warning': 'bg-gradient-to-br from-warning to-yellow-600',
  'bg-danger': 'bg-gradient-to-br from-danger to-red-600',
  'bg-info': 'bg-gradient-to-br from-info to-sky-600',
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  iconColor = 'primary',
  trend,
  trendLabel,
  href,
  format = 'number',
  prefix,
  suffix,
  className = '',
  loading = false,
}) => {
  const formatValue = (val) => {
    if (loading) return '—';
    if (val === null || val === undefined) return '—';
    // Already-formatted text (e.g. '₹3,84,000') is shown as-is.
    if (typeof val === 'string' && Number.isNaN(Number(val))) return val;
    if (format === 'currency') {
      return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
    if (format === 'percentage') {
      return `${val}%`;
    }
    return Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const getTrendIcon = () => {
    if (trend === 0) return <Minus size={14} className="text-secondary-400" />;
    if (trend > 0) return <TrendingUp size={14} className="text-success" />;
    return <TrendingDown size={14} className="text-danger" />;
  };

  const getTrendColor = () => {
    if (trend === 0) return 'text-secondary-500';
    if (trend > 0) return 'text-success-dark';
    return 'text-danger-dark';
  };

  // Unknown names fall back to grey so the icon never renders on an invisible tile.
  const bgColor = iconBgColors[iconColor] || (String(iconColor).startsWith('bg-') ? iconColor : iconBgColors.gray);

  const content = (
    <Card
      padding="default"
      hover={Boolean(href)}
      className={`group ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-secondary-500 leading-snug line-clamp-2" title={typeof title === 'string' ? title : undefined}>{title}</p>
          <p className={`text-2xl sm:text-3xl font-heading font-bold text-secondary mt-1.5 tabular-nums ${loading ? 'animate-pulse' : ''}`}>
            {prefix}
            {formatValue(value)}
            {suffix}
          </p>
          {trend !== undefined && !loading && (
            <div className="flex items-center gap-1.5 mt-2.5">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium ${
                trend > 0 ? 'bg-success-light' : trend < 0 ? 'bg-danger-light' : 'bg-secondary-100'
              }`}>
                {getTrendIcon()}
                <span className={getTrendColor()}>{Math.abs(trend)}%</span>
              </span>
              {trendLabel && (
                <span className="text-xs text-secondary-500">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={`w-11 h-11 ${bgColor} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform group-hover:scale-105`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
    </Card>
  );

  if (href) {
    return <Link to={href} className="block">{content}</Link>;
  }

  return content;
};

export default StatCard;
