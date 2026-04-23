import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#FF2D55', '#00D4FF', '#55EFAC', '#A0C9FF'];

const SubjectProgress = ({ subjectSummary }) => {
  const data = subjectSummary.map((item, index) => ({
    name: item.subject,
    value: item.knowledgeCount,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">📚 科目分布</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            innerRadius={60}
            fill="#8884d8"
            stroke="none"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: 'none'
            }} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const KnowledgeProgress = ({ knowledgeData }) => {
  const subjectCount = {};
  
  knowledgeData.forEach(k => {
    subjectCount[k.subject] = (subjectCount[k.subject] || 0) + 1;
  });

  const data = Object.entries(subjectCount).map(([subject, count]) => ({
    name: subject,
    knowledgePoints: count,
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">📊 知识点统计</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8E8E93', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8E8E93', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: 'none'
            }} 
          />
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
          />
          <Bar 
            dataKey="knowledgePoints" 
            name="知识点数量" 
            fill="#007AFF"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export { SubjectProgress, KnowledgeProgress };
