"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface SalesData {
  name: string;
  total: number;
}

export default function SalesChart({ data }: { data: SalesData[] }) {
  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FDCB02" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#FDCB02" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#52525b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#52525b" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            // 🔥 El fix: tipamos 'value' como number
            tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #27272a', borderRadius: '12px' }}
            itemStyle={{ color: '#FDCB02', fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: '#71717a', fontSize: '10px', marginBottom: '4px' }}
          />
          <Area 
            type="monotone" 
            dataKey="total" 
            stroke="#FDCB02" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorTotal)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}