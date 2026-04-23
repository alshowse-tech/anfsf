import React, { useState } from 'react';

const LifecycleReport = () => {
  const [selectedStage, setSelectedStage] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  const lifecycleData = [
    { 周次: '第1周', 知识点数量: 0, 完成率: 0, 学习时长: 0 },
    { 周次: '第2周', 知识点数量: 2, 完成率: 20, 学习时长: 12 },
    { 周次: '第3周', 知识点数量: 4, 完成率: 40, 学习时长: 18 },
    { 周次: '第4周', 知识点数量: 6, 完成率: 60, 学习时长: 24 },
    { 周次: '第5周', 知识点数量: 8, 完成率: 80, 学习时长: 30 },
    { 周次: '第6周', 知识点数量: 10, 完成率: 100, 学习时长: 36 },
  ];

  const stages = [
    { 
      name: '入门阶段', 
      icon: '🚀', 
      desc: '掌握基础知识和概念', 
      duration: '2周',
      completed: true,
      details: '本周重点是了解整体学习框架，熟悉基本操作。已完成10个知识点，学习时长12小时。'
    },
    { 
      name: '进阶阶段', 
      icon: '🔥', 
      desc: '理解知识点之间的关系', 
      duration: '2周',
      completed: true,
      details: '开始构建知识体系，理解各知识点之间的联系。已完成18个知识点，学习时长18小时。'
    },
    { 
      name: '精通阶段', 
      icon: '🏆', 
      desc: '应用知识解决实际问题', 
      duration: '2周',
      completed: false,
      details: '通过实际项目应用所学知识，解决复杂问题。即将开始的实践阶段。'
    },
    { 
      name: '专家阶段', 
      icon: '🌟', 
      desc: '创新和跨学科应用', 
      duration: '持续',
      completed: false,
      details: '形成自己的知识体系，能够创新应用和跨学科整合。长期目标阶段。'
    },
  ];

  const handleStageClick = (index) => {
    setSelectedStage(stages[index]);
    setShowDetails(true);
  };

  return (
    <div className="lifecycle-section">
      <div className="chart-container">
        <h3 className="chart-title">📈 知识点增长趋势</h3>
        <div className="simple-chart">
          {lifecycleData.map((item, index) => (
            <div key={index} className="chart-row">
              <div className="chart-label">{item.周次}</div>
              <div className="chart-bar-container">
                <div 
                  className="chart-bar" 
                  style={{ 
                    width: `${(item.知识点数量 / 10) * 100}%`,
                    backgroundColor: index < 3 ? '#007AFF' : '#34C759'
                  }}
                ></div>
              </div>
              <div className="chart-value">{item.知识点数量}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="lifecycle-stages">
        <h3 className="section-title">🔍 学习阶段划分</h3>
        <div className="stage-list">
          {stages.map((stage, index) => (
            <div 
              key={index} 
              className={`stage-item ${stage.completed ? 'completed' : ''}`}
              onClick={() => handleStageClick(index)}
              style={{ cursor: 'pointer' }}
            >
              <div className="stage-icon">
                <span className="stage-number">{index + 1}</span>
                <span className="stage-emoji">{stage.icon}</span>
              </div>
              <div className="stage-info">
                <h4 className="stage-name">{stage.name}</h4>
                <p className="stage-desc">{stage.desc}</p>
              </div>
              <div className="stage-duration">
                <span className="duration-badge">{stage.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showDetails && selectedStage && (
        <div className="stage-details-modal">
          <div className="stage-details-content">
            <button 
              className="close-btn"
              onClick={() => setShowDetails(false)}
            >
              ⚪
            </button>
            <div className="modal-icon">{selectedStage.icon}</div>
            <h3 className="modal-title">{selectedStage.name}</h3>
            <p className="modal-desc">{selectedStage.details}</p>
            <div className="modal-actions">
              <button className="action-btn view-details">
                📊 查看详细报告
              </button>
              <button className="action-btn continue">
                🚀 继续学习
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="advice-section">
        <h3 className="section-title">💡 学习建议</h3>
        <ul className="advice-list">
          <li className="advice-item">✅ 已完成8个知识点，掌握率80%</li>
          <li className="advice-item">💡 建议继续加强薄弱环节</li>
          <li className="advice-item">🎯 目标：下阶段完成剩余知识点</li>
          <li className="advice-item">📚 每周保持3次以上学习频率</li>
          <li className="advice-item" style={{ cursor: 'pointer' }} onClick={() => alert('查看详细学习报告功能开发中...')}>
            📄 查看详细学习报告
          </li>
        </ul>
      </div>
    </div>
  );
};

export default LifecycleReport;
