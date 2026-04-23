import React, { useState } from 'react';

const BehaviorAnalysis = () => {
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  
  const behaviorData = [
    { 
      项目: '学习专注度', 
      满分: 100, 
      实际: 85,
      details: '学生在学习时的专注程度，包括注意力集中时间和分心次数。'
    },
    { 
      项目: '任务完成率', 
      满分: 100, 
      实际: 78,
      details: '按时完成学习任务的比例，反映自律性和计划性。'
    },
    { 
      项目: '知识点理解', 
      满分: 100, 
      实际: 92,
      details: '对所学知识点的理解深度和掌握程度。'
    },
    { 
      项目: '复习频率', 
      满分: 100, 
      实际: 70,
      details: '定期复习的频率，影响知识的长期记忆效果。'
    },
    { 
      项目: '错误率控制', 
      满分: 100, 
      实际: 88,
      details: '对错误的识别和纠正能力，反映学习质量。'
    },
    { 
      项目: '学习效率', 
      满分: 100, 
      实际: 82,
      details: '单位时间内掌握知识的数量和质量。'
    },
  ];

  const timeDistribution = [
    { 时间段: '08:00-12:00', 学习时长: 120, name: '上午' },
    { 时间段: '14:00-18:00', 学习时长: 90, name: '下午' },
    { 时间段: '20:00-22:00', 学习时长: 60, name: '晚上' },
  ];

  const handleMetricClick = (metric) => {
    setSelectedMetric(metric);
    setShowDetail(true);
  };

  return (
    <div className="analysis-section">
      <h3 className="section-title">🔍 高级行为分析</h3>
      
      {/* 学习能力雷达图 */}
      <div className="chart-container">
        <h3 className="chart-title">📊 学习能力雷达图</h3>
        <div className="simple-radar">
          <div className="radar-container">
            {behaviorData.map((item, index) => (
              <div 
                key={index} 
                className="radar-row"
                onClick={() => handleMetricClick(item)}
                style={{ cursor: 'pointer' }}
              >
                <div className="radar-label">{item.项目}</div>
                <div className="radar-bar">
                  <div 
                    className="radar-fill" 
                    style={{ width: `${(item.实际 / item.满分) * 100}%` }}
                  ></div>
                </div>
                <div className="radar-value">{item.实际}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 学习时间分布 */}
      <div className="chart-container">
        <h3 className="chart-title">⏰ 学习时间分布</h3>
        <div className="simple-bar-chart">
          {timeDistribution.map((item, index) => (
            <div key={index} className="time-row">
              <div className="time-label">{item.时间段}</div>
              <div className="time-bar-container">
                <div 
                  className="time-bar" 
                  style={{ 
                    width: `${(item.学习时长 / 120) * 100}%`,
                    backgroundColor: index === 0 ? '#007AFF' : index === 1 ? '#34C759' : '#FF9500'
                  }}
                ></div>
              </div>
              <div className="time-value">{item.学习时长}分钟</div>
            </div>
          ))}
        </div>
      </div>

      {/* 行为分析报告 */}
      <div className="analysis-report">
        <h3 className="section-title">📋 行为分析报告</h3>
        
        <div className="analysis-card">
          <h4 className="card-title">✅ 优势分析</h4>
          <ul className="analysis-list">
            <li>知识点理解能力强（92分）</li>
            <li>错误率控制良好（88分）</li>
            <li>学习专注度较高（85分）</li>
            <li onClick={() => alert('查看详细分析功能开发中...')} style={{ cursor: 'pointer', color: '#007AFF' }}>
              📊 查看详细分析报告
            </li>
          </ul>
        </div>

        <div className="analysis-card">
          <h4 className="card-title">🔄 改进方向</h4>
          <ul className="analysis-list">
            <li>学习频率需提高（当前70分）</li>
            <li>下午学习效率偏低</li>
            <li>建议增加复习频率</li>
            <li onClick={() => alert('查看改进建议功能开发中...')} style={{ cursor: 'pointer', color: '#007AFF' }}>
              💡 查看改进建议
            </li>
          </ul>
        </div>

        <div className="analysis-card">
          <h4 className="card-title">🎯 行为建议</h4>
          <ul className="analysis-list">
            <li>保持优势，继续强化</li>
            <li>增加下午学习时间</li>
            <li>建立每日复习习惯</li>
            <li>设定阶段性目标</li>
            <li onClick={() => alert('查看个性化建议功能开发中...')} style={{ cursor: 'pointer', color: '#007AFF' }}>
              🎯 查看个性化建议
            </li>
          </ul>
        </div>
      </div>

      {/* 异常检测 */}
      <div className="anomaly-detection">
        <h3 className="section-title">⚠️ 异常检测</h3>
        <div className="anomaly-list">
          <div className="anomaly-item safe">
            <span className="status-dot safe"></span>
            <span>无异常行为</span>
            <span className="status-text">✅ 一切正常</span>
          </div>
          <div className="anomaly-item warning">
            <span className="status-dot warning"></span>
            <span>本周学习时长减少15%</span>
            <span className="status-text">⚠️ 轻微下降</span>
          </div>
          <div className="anomaly-item alert">
            <span className="status-dot alert"></span>
            <span>知识点掌握率下降</span>
            <span className="status-text">⚠️ 需要关注</span>
          </div>
          <div onClick={() => alert('查看异常详情功能开发中...')} style={{ cursor: 'pointer', color: '#007AFF', marginTop: '10px' }}>
            📊 查看异常分析报告
          </div>
        </div>
      </div>

      {/* 详细信息弹窗 */}
      {showDetail && selectedMetric && (
        <div className="metric-details-modal">
          <div className="metric-details-content">
            <button 
              className="close-btn"
              onClick={() => setShowDetail(false)}
            >
              ⚪
            </button>
            <h3 className="metric-title">{selectedMetric.项目}</h3>
            <div className="metric-value-display">
              <div className="value">{selectedMetric.实际}</div>
              <div className="label">得分 / {selectedMetric.满分}</div>
            </div>
            <p className="metric-details">{selectedMetric.details}</p>
            <div className="metric-actions">
              <button className="action-btn">
                📈 详细分析
              </button>
              <button className="action-btn">
                💡 改进建议
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BehaviorAnalysis;
