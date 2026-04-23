import React, { useState } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [currentSubject, setCurrentSubject] = useState('数学');
  const [notifications, setNotifications] = useState(['新挑战已发布！', '作业提醒：数学练习']);  
  const [userProgress, setUserProgress] = useState({
    totalPoints: 20,
    mastered: 12,
    learning: 5,
    pending: 3
  });

  // 知识点数据
  const knowledgePoints = {
    数学: [
      { id: 1, name: '认识函数', status: 'completed', progress: 100, description: '理解函数的基本概念和表示方法' },
      { id: 2, name: '一次函数', status: 'completed', progress: 100, description: '掌握一次函数的图像和性质' },
      { id: 3, name: '二次函数', status: 'completed', progress: 100, description: '理解二次函数的图像和最值' },
      { id: 4, name: '代数基础', status: 'in-progress', progress: 60, description: '学习代数表达式和方程' },
      { id: 5, name: '几何基础', status: 'pending', progress: 0, description: '学习基本几何图形和性质' },
    ],
    语文: [
      { id: 1, name: '阅读理解', status: 'completed', progress: 100, description: '掌握文章主旨和细节理解' },
      { id: 2, name: '写作技巧', status: 'in-progress', progress: 40, description: '学习不同类型作文的写法' },
      { id: 3, name: '古诗文', status: 'pending', progress: 0, description: '背诵和理解古诗文' },
    ],
    英语: [
      { id: 1, name: '基础词汇', status: 'completed', progress: 100, description: '掌握200个核心词汇' },
      { id: 2, name: '语法结构', status: 'completed', progress: 100, description: '理解基本语法结构' },
      { id: 3, name: '阅读理解', status: 'in-progress', progress: 50, description: '练习英语阅读理解' },
    ],
    物理: [
      { id: 1, name: '力学基础', status: 'pending', progress: 0, description: '学习力和运动的基本概念' },
      { id: 2, name: '电学基础', status: 'pending', progress: 0, description: '理解电路和电流' },
    ],
    化学: [
      { id: 1, name: '化学反应', status: 'pending', progress: 0, description: '学习化学反应类型' },
      { id: 2, name: '元素周期', status: 'pending', progress: 0, description: '理解元素周期表' },
    ],
  };

  const currentKnowledge = knowledgePoints[currentSubject] || [];

  // 任务数据
  const tasks = [
    { id: 1, title: '完成函数练习题', subject: '数学', time: '15:30', status: 'done' },
    { id: 2, title: '阅读一篇语文文章', subject: '语文', time: '16:00', status: 'done' },
    { id: 3, title: '背诵20个英语单词', subject: '英语', time: '16:30', status: 'in-progress' },
    { id: 4, title: '复习代数基础知识', subject: '数学', time: '17:00', status: 'pending' },
    { id: 5, title: '完成几何练习', subject: '数学', time: '17:30', status: 'pending' },
  ];

  // 页面内容组件
  const HomeContent = () => (
    <div className="home-content">
      <div className="welcome-card">
        <h2>欢迎来到 SparkPath!</h2>
        <p>今天的学习目标：完成5个知识点</p>
        <div className="daily-progress">
          <div className="progress-info">
            <span className="progress-text">{userProgress.mastered + userProgress.learning}/10</span>
            <span className="progress-label">今日完成</span>
          </div>
          <div className="progress-bar-large">
            <div className="progress-bar" style={{ width: '45%' }}></div>
          </div>
        </div>
      </div>

      <div className="current-study">
        <div className="study-header">
          <h3>当前学习: {currentSubject}</h3>
          <button className="study-action-btn" onClick={() => setActiveTab('knowledge')}>开始学习</button>
        </div>

        <div className="subject-selector">
          {['数学', '语文', '英语', '物理', '化学'].map(subject => (
            <button
              key={subject}
              className={`subject-btn ${currentSubject === subject ? 'active' : ''}`}
              onClick={() => setCurrentSubject(subject)}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      <div className="progress-card">
        <div className="progress-info">
          <div className="progress-stat">
            <span className="stat-value">{userProgress.mastered}</span>
            <span className="stat-label">已掌握</span>
          </div>
          <div className="progress-stat">
            <span className="stat-value">{userProgress.learning}</span>
            <span className="stat-label">学习中</span>
          </div>
          <div className="progress-stat">
            <span className="stat-value">{userProgress.totalPoints}</span>
            <span className="stat-label">总知识点</span>
          </div>
        </div>
      </div>
    </div>
  );

  const KnowledgeContent = () => (
    <div className="knowledge-content">
      <div className="content-header">
        <h3>知识点列表 - {currentSubject}</h3>
      </div>
      <div className="knowledge-grid">
        {currentKnowledge.map(point => (
          <div key={point.id} className={`knowledge-card ${point.status}`}>
            <div className="card-header">
              <span className="point-icon">
                {point.status === 'completed' ? '✅' : point.status === 'in-progress' ? '⏳' : '🔒'}
              </span>
              <div className="point-info">
                <span className="point-name">{point.name}</span>
                <span className="point-desc">{point.description}</span>
              </div>
            </div>
            <div className="progress-bar-small">
              <div className="progress-fill" style={{ width: `${point.progress}%` }}></div>
            </div>
            <div className="card-actions">
              {point.status !== 'completed' ? (
                <button 
                  className="study-btn" 
                  onClick={() => alert(`开始学习: ${point.name}\n这是一次模拟操作，实际应用中将进入详细学习界面。`)}
                >
                  开始学习
                </button>
              ) : (
                <button 
                  className="review-btn"
                  onClick={() => alert(`复习: ${point.name}\n这是一次模拟操作，实际应用中将进入复习界面。`)}
                >
                  复习
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const TasksContent = () => (
    <div className="tasks-content">
      <div className="content-header">
        <h3>我的任务</h3>
        <button 
          className="add-task-btn"
          onClick={() => alert('添加新任务功能\n这是一次模拟操作，实际应用中将打开添加任务对话框。')}
        >
          + 添加任务
        </button>
      </div>
      
      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className={`task-item ${task.status === 'done' ? 'completed' : ''}`}>
            <div className="task-content">
              <span className="task-dot"></span>
              <div className="task-info">
                <span className="task-title">{task.title}</span>
                <span className="task-subject">{task.subject}</span>
              </div>
            </div>
            <div className="task-meta">
              <span className="task-time">{task.time}</span>
              {task.status !== 'done' ? (
                <button 
                  className="action-btn" 
                  onClick={() => alert(`开始任务: ${task.title}\n这是一次模拟操作，实际应用中将开始计时并记录任务进度。`)}
                >
                  开始
                </button>
              ) : (
                <span className="done-badge">完成</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const RankingContent = () => (
    <div className="ranking-content">
      <div className="content-header">
        <h3>学习排行榜</h3>
      </div>
      <div className="ranking-list">
        {[
          { rank: 1, name: '张明', points: 185, avatar: '👨' },
          { rank: 2, name: '李华', points: 172, avatar: '👩' },
          { rank: 3, name: '王强', points: 168, avatar: '👨' },
          { rank: 4, name: '你', points: 165, avatar: '👤', isMe: true },
          { rank: 5, name: '赵丽', points: 158, avatar: '👩' },
        ].map(user => (
          <div key={user.rank} className={`ranking-item ${user.isMe ? 'highlight' : ''}`}>
            <span className="rank-badge">{user.rank}</span>
            <span className="avatar">{user.avatar}</span>
            <div className="user-info">
              <span className="username">{user.name}</span>
              <span className="user-points">{user.points} 知识点</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ProfileContent = () => (
    <div className="profile-content">
      <div className="user-profile">
        <div className="profile-header">
          <div className="avatar-large">👤</div>
          <h3>同学</h3>
          <span className="grade">初中生</span>
        </div>
        <div className="profile-stats">
          <div className="stat-item">
            <div className="stat-value">{userProgress.mastered}</div>
            <div className="stat-label">掌握</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{userProgress.learning}</div>
            <div className="stat-label">进行中</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{userProgress.totalPoints}</div>
            <div className="stat-label">总知识点</div>
          </div>
        </div>
      </div>
      
      <div className="settings-list">
        <button 
          className="setting-item" 
          onClick={() => alert('学习提醒设置\n这是一次模拟操作，实际应用中将打开设置选项。')}
        >
          <span>⏰</span>
          <span>学习提醒</span>
        </button>
        <button 
          className="setting-item" 
          onClick={() => alert('通知设置\n这是一次模拟操作，实际应用中将打开通知设置。')}
        >
          <span>🔔</span>
          <span>通知</span>
        </button>
        <button 
          className="setting-item" 
          onClick={() => alert('修改密码\n这是一次模拟操作，实际应用中将打开密码修改界面。')}
        >
          <span>🔐</span>
          <span>安全设置</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="student-app">
      {/* 顶部导航栏 */}
      <header className="app-header">
        <div className="header-left">
          <h1>🎓 SparkPath</h1>
          <span className="grade-badge">初中生</span>
        </div>
        <div className="header-right">
          <div className="notification-bell">
            <span className="bell-icon">🔔</span>
            <span className="badge">{notifications.length}</span>
          </div>
          <div className="user-info">
            <span className="avatar">👤</span>
            <span className="username">同学</span>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="main-content">
        {/* 左侧导航 */}
        <nav className="sidebar">
          <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            <span className="nav-icon">🏠</span>
            <span className="nav-text">学习首页</span>
          </div>
          <div className={`nav-item ${activeTab === 'knowledge' ? 'active' : ''}`} onClick={() => setActiveTab('knowledge')}>
            <span className="nav-icon">📚</span>
            <span className="nav-text">知识点</span>
          </div>
          <div className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
            <span className="nav-icon">📝</span>
            <span className="nav-text">我的任务</span>
          </div>
          <div className={`nav-item ${activeTab === 'ranking' ? 'active' : ''}`} onClick={() => setActiveTab('ranking')}>
            <span className="nav-icon">🏆</span>
            <span className="nav-text">排行榜</span>
          </div>
          <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">个人中心</span>
          </div>
        </nav>

        {/* 右侧内容区 */}
        <div className="content-area">
          {activeTab === 'home' && <HomeContent />}
          {activeTab === 'knowledge' && <KnowledgeContent />}
          {activeTab === 'tasks' && <TasksContent />}
          {activeTab === 'ranking' && <RankingContent />}
          {activeTab === 'profile' && <ProfileContent />}
        </div>
      </main>

      {/* 底部导航 */}
      <footer className="app-footer">
        <div className={`footer-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <span>🏠</span>
          <span>首页</span>
        </div>
        <div className={`footer-item ${activeTab === 'knowledge' ? 'active' : ''}`} onClick={() => setActiveTab('knowledge')}>
          <span>📚</span>
          <span>学习</span>
        </div>
        <div className={`footer-item ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
          <span>📝</span>
          <span>任务</span>
        </div>
        <div className={`footer-item ${activeTab === 'ranking' ? 'active' : ''}`} onClick={() => setActiveTab('ranking')}>
          <span>🏆</span>
          <span>排名</span>
        </div>
        <div className={`footer-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <span>👤</span>
          <span>我的</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
