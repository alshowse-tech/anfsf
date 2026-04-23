import React, { useState, useEffect } from 'react';
import { SubjectProgress, KnowledgeProgress } from './components/ProgressCharts';
import LifecycleReport from './components/lifecycle/LifecycleReport';
import CommunitySystem from './components/community/CommunitySystem';
import BehaviorAnalysis from './components/analysis/BehaviorAnalysis';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>SparkPath 家长端</h1>
          <p>正在加载...</p>
        </header>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            {/* 系统状态栏 */}
            <div className="system-status-bar">
              <div className="status-item">
                <span className="status-dot online"></span>
                <span>Neo4j 连接</span>
                <span>正常</span>
              </div>
              <div className="status-item">
                <span className="status-dot online"></span>
                <span>Redis 缓存</span>
                <span>正常</span>
              </div>
              <div className="status-item">
                <span className="status-dot online"></span>
                <span>数据更新</span>
                <span>实时</span>
              </div>
            </div>

            {/* 科目概览 */}
            <div className="dashboard-section">
              <h2>📊 科目概览</h2>
              <SubjectProgress subjectSummary={[
                { subject: '数学', knowledgeCount: 4 },
                { subject: '语文', knowledgeCount: 1 },
                { subject: '英语', knowledgeCount: 1 },
                { subject: '物理', knowledgeCount: 2 },
                { subject: '化学', knowledgeCount: 2 },
                { subject: '生物', knowledgeCount: 1 },
              ]} />
            </div>

            {/* 知识点统计 */}
            <div className="dashboard-section">
              <h2>📈 知识点统计</h2>
              <KnowledgeProgress knowledgeData={[
                { id: 'math-1', name: '认识函数', subject: '数学' },
                { id: 'math-2', name: '一次函数', subject: '数学' },
                { id: 'math-3', name: '二次函数', subject: '数学' },
                { id: 'math-4', name: '代数基础', subject: '数学' },
                { id: 'chinese-1', name: '阅读理解', subject: '语文' },
                { id: 'english-1', name: '词汇构建', subject: '英语' },
              ]} />
            </div>

            {/* 学习路径 */}
            <div className="dashboard-section">
              <h2>🔗 学习路径可视化</h2>
              <div className="learning-paths">
                {[
                  { from: '认识函数', to: '一次函数', subject: '数学' },
                  { from: '一次函数', to: '二次函数', subject: '数学' },
                  { from: '二次函数', to: '代数基础', subject: '数学' },
                  { from: '阅读理解', to: '文学分析', subject: '语文' },
                  { from: '词汇构建', to: '语法学习', subject: '英语' },
                ].map((path, index) => (
                  <div key={index} className="path-item">
                    {path.from} → {path.to} ({path.subject})
                  </div>
                ))}
              </div>
            </div>

            {/* 功能概览 */}
            <div className="dashboard-section">
              <h2>📱 系统功能</h2>
              <div className="features-list">
                <div className="feature-item">✅ 实时数据同步 (Neo4j 知识图谱)</div>
                <div className="feature-item">✅ 多科目追踪 (9个科目)</div>
                <div className="feature-item">✅ 学习路径可视化</div>
                <div className="feature-item">✅ 全生命周期报告</div>
                <div className="feature-item">✅ 社区与挑战系统</div>
                <div className="feature-item">✅ 高级行为分析</div>
              </div>
            </div>
          </>
        );
      case 'lifecycle':
        return <LifecycleReport />;
      case 'community':
        return <CommunitySystem />;
      case 'analysis':
        return <BehaviorAnalysis />;
      case 'settings':
        return (
          <div className="dashboard-section">
            <h2>⚙️ 系统设置</h2>
            <p>系统设置功能开发中...</p>
            <div className="features-list">
              <div className="feature-item">🔔 通知设置</div>
              <div className="feature-item">🔒 账户安全</div>
              <div className="feature-item">🎨 显示主题</div>
            </div>
          </div>
        );
      default:
        return <div>页面不存在</div>;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        {/* 顶部导航栏 */}
        <div className="app-nav">
          <h1>SparkPath 家长端 👨‍👩‍👧</h1>
          <p>学生学习进度与成长分析</p>
          
          {/* Apple 风格导航按钮 */}
          <div className="app-nav-buttons">
            <button 
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 仪表盘
            </button>
            <button 
              className={`nav-btn ${activeTab === 'lifecycle' ? 'active' : ''}`}
              onClick={() => setActiveTab('lifecycle')}
            >
              📈 全生命周期报告
            </button>
            <button 
              className={`nav-btn ${activeTab === 'community' ? 'active' : ''}`}
              onClick={() => setActiveTab('community')}
            >
              🌍 社区与挑战
            </button>
            <button 
              className={`nav-btn ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              🔍 行为分析
            </button>
            <button 
              className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ 系统设置
            </button>
          </div>
        </div>

        {/* 页面内容 */}
        <div className="content-area">
          {renderContent()}
        </div>
      </header>
    </div>
  );
}

export default App;
