import React, { useState } from 'react';

const Challenges = () => {
  const [challenges] = useState([
    { 
      id: 1, 
      name: '数学挑战赛', 
      description: '完成5个数学知识点挑战',
      progress: 60,
      total: 10,
      status: 'active'
    },
    { 
      id: 2, 
      name: '语文阅读计划', 
      description: '阅读10篇经典文章',
      progress: 30,
      total: 5,
      status: 'active'
    },
    { 
      id: 3, 
      name: '英语词汇营', 
      description: '掌握200个核心词汇',
      progress: 80,
      total: 20,
      status: 'active'
    },
  ]);

  return (
    <div className="challenges-section">
      <h2>🎯 我的挑战</h2>
      {challenges.map(challenge => (
        <div key={challenge.id} className="challenge-card">
          <div className="challenge-header">
            <span className="challenge-icon">
              {challenge.id === 1 ? '🧮' : challenge.id === 2 ? '📚' : '🇦🇪'}
            </span>
            <div className="challenge-title">
              <h3>{challenge.name}</h3>
              <span className={`status ${challenge.status}`}>{challenge.status === 'active' ? '进行中' : '已完成'}</span>
            </div>
          </div>
          <p className="challenge-desc">{challenge.description}</p>
          <div className="challenge-progress">
            <div className="progress-bar">
              <div 
                className="progress" 
                style={{ 
                  width: `${challenge.progress}%`,
                  background: challenge.progress === 100 ? '#4caf50' : '#61dafb' 
                }}
              ></div>
            </div>
            <div className="progress-stats">
              <span className="progress-text">{challenge.progress}%</span>
              <span className="progress-details">
                {challenge.progress === 100 ? '🎉 完成' : `${challenge.progress}/${challenge.total} 完成`}
              </span>
            </div>
          </div>
          {challenge.progress < 100 && (
            <button className="continue-btn">继续挑战</button>
          )}
        </div>
      ))}
    </div>
  );
};

export default Challenges;
