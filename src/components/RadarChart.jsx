import { useMemo } from 'react';

const SHORT_LABELS = {
  'Market Risk': { en: 'Market', zh: '市场' },
  'Financial Risk': { en: 'Financial', zh: '财务' },
  'Regulatory Risk': { en: 'Regulatory', zh: '监管' },
  'Environmental Risk': { en: 'Environ.', zh: '环境' },
  'Infrastructure Risk': { en: 'Infra.', zh: '基建' },
};

function scoreColor(score) {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#3b82f6';
  if (score >= 30) return '#f59e0b';
  return '#ef4444';
}

export default function RadarChart({ breakdown, size = 200, lang = 'en' }) {
  const n = breakdown.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 32;

  const geometry = useMemo(() => {
    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2;

    const axes = breakdown.map((item, i) => {
      const angle = startAngle + i * angleStep;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { angle, cos, sin, item };
    });

    // Grid polygons at 25%, 50%, 75%, 100%
    const gridLevels = [0.25, 0.5, 0.75, 1.0];
    const grids = gridLevels.map(level =>
      axes.map(a => `${cx + r * level * a.cos},${cy + r * level * a.sin}`).join(' ')
    );

    // Data polygon
    const dataPoints = axes.map(a => {
      const val = Math.max(0, Math.min(100, a.item.componentScore)) / 100;
      return {
        x: cx + r * val * a.cos,
        y: cy + r * val * a.sin,
      };
    });
    const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    // Labels
    const labels = axes.map(a => {
      const labelR = r + 22;
      const x = cx + labelR * a.cos;
      const y = cy + labelR * a.sin;
      const key = a.item.category;
      const text = SHORT_LABELS[key]?.[lang] || key.replace(' Risk', '');
      return { x, y, text, score: a.item.componentScore };
    });

    // Axis lines
    const axisLines = axes.map(a => ({
      x2: cx + r * a.cos,
      y2: cy + r * a.sin,
    }));

    return { grids, dataPolygon, dataPoints, labels, axisLines };
  }, [breakdown, n, cx, cy, r, lang]);

  if (n < 3) return null;

  const avgScore = breakdown.reduce((s, b) => s + b.componentScore, 0) / n;
  const fillColor = scoreColor(avgScore);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      {/* Grid */}
      {geometry.grids.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={i === 3 ? 1.5 : 0.8}
          strokeDasharray={i < 3 ? '3,3' : 'none'}
        />
      ))}

      {/* Axis lines */}
      {geometry.axisLines.map((line, i) => (
        <line key={i} x1={cx} y1={cy} x2={line.x2} y2={line.y2} stroke="#e2e8f0" strokeWidth={0.8} />
      ))}

      {/* Data polygon */}
      <polygon
        points={geometry.dataPolygon}
        fill={fillColor}
        fillOpacity={0.15}
        stroke={fillColor}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data points */}
      {geometry.dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={fillColor} stroke="white" strokeWidth={1.5} />
      ))}

      {/* Labels */}
      {geometry.labels.map((label, i) => (
        <text
          key={i}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[10px] font-medium"
          fill="#64748b"
        >
          {label.text}
        </text>
      ))}
    </svg>
  );
}
