import { useMemo } from 'react';
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const EarningsChart = ({ data = [], title = 'Earnings Trend' }) => {
  const chartData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    return data.map(item => ({
      ...item,
      earnings: Math.round(item.earnings || 0),
      pending: Math.round(item.pending || 0)
    }));
  }, [data]);

  if (!chartData.length) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          <h2 className="text-xl font-semibold text-dark-50">{title}</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-dark-400">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-primary-500" />
        <h2 className="text-xl font-semibold text-dark-50">{title}</h2>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              style={{ fontSize: '0.875rem' }}
            />
            <YAxis stroke="#9ca3af" style={{ fontSize: '0.875rem' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#f3f4f6'
              }}
              formatter={(value) => `$${value.toFixed(2)}`}
            />
            <Area
              type="monotone"
              dataKey="earnings"
              stroke="#22c55e"
              fillOpacity={1}
              fill="url(#colorEarnings)"
              name="Earnings"
            />
            <Area
              type="monotone"
              dataKey="pending"
              stroke="#eab308"
              fillOpacity={1}
              fill="url(#colorPending)"
              name="Pending"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-6 mt-4 pt-4 border-t border-dark-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm text-dark-400">Confirmed Earnings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-sm text-dark-400">Pending</span>
        </div>
      </div>
    </div>
  );
};

export default EarningsChart;
