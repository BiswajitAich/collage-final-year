'use client';

import type { TimeSeriesDataPoint } from '@/lib/types';
import styles from './MiniChart.module.css';

interface MiniChartProps {
  data: TimeSeriesDataPoint[];
  color?: string;
  height?: number;
  showArea?: boolean;
}

export function MiniChart({ data, color = 'var(--accent-primary)', height = 48, showArea = true }: MiniChartProps) {
  if (!data || data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 160;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const lastPoint = points[points.length - 1];

  const areaPath = `M ${points[0]} L ${polyline} L ${lastPoint.split(',')[0]},${height} L 0,${height} Z`;

  return (
    <div className={styles.wrap}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`grad-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {showArea && (
          <path
            d={areaPath}
            fill={`url(#grad-${color.replace(/[^a-z]/gi, '')})`}
          />
        )}
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Last point dot */}
        <circle
          cx={lastPoint.split(',')[0]}
          cy={lastPoint.split(',')[1]}
          r="2.5"
          fill={color}
        />
      </svg>
    </div>
  );
}
