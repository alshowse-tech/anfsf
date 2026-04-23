import React, { useState } from 'react';

const CommunitySystem = () => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostDetails, setShowPostDetails] = useState(false);
  
  const [challenges] = useState([
    { 
      id: 1, 
      name: '数学挑战赛', 
      description: '完成5个数学知识点挑战', 
      progress: 60, 
      total: 10,
      details: '数学挑战赛旨在帮助学生巩固数学基础，掌握核心概念。'
    },
    { 
      id: 2, 
      name: '语文阅读计划', 
      description: '阅读10篇经典文章', 
      progress: 30, 
      total: 5,
      details: '语文阅读计划培养学生阅读理解能力，提高作文水平。'
    },
    { 
      id: 3, 
      name: '英语词汇营', 
      description: '掌握200个核心词汇', 
      progress: 80, 
      total: 20,
      details: '英语词汇营通过科学记忆法帮助学生快速掌握核心词汇。'
    },
  ]);

  const [posts, setPosts] = useState([
    { 
      id: 1, 
      author: '家长张女士', 
      content: '孩子的数学成绩进步明显，太棒了！激励孩子继续加油。', 
      likes: 15, 
      time: '2小时前',
      comments: 3,
      details: '我的孩子在数学挑战赛中表现优异，进步很大！感谢老师的辛勤付出。'
    },
    { 
      id: 2, 
      author: '家长李先生', 
      content: '不知道如何帮助孩子复习，求建议，有什么好方法吗？', 
      likes: 8, 
      time: '5小时前',
      comments: 5,
      details: '孩子最近学习效率不高，希望家长们分享一些好的复习方法。'
    },
    { 
      id: 3, 
      author: '教育专家王老师', 
      content: '建议采用间隔复习法，效果更好，记得定期回顾哦。', 
      likes: 20, 
      time: '6小时前',
      comments: 8,
      details: '间隔复习法是一种科学的记忆方法，建议各位家长尝试。'
    },
  ]);

  const [newPost, setNewPost] = useState('');
  
  const handleLike = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, likes: post.likes + 1 } : post
    ));
  };

  const handleViewPost = (post) => {
    setSelectedPost(post);
    setShowPostDetails(true);
  };

  const handlePost = () => {
    if (newPost.trim()) {
      setPosts([{
        id: posts.length + 1,
        author: '您',
        content: newPost,
        likes: 0,
        time: '刚刚',
        comments: 0,
        details: newPost
      }, ...posts]);
      setNewPost('');
    }
  };

  const handleChallengeClick = (challenge) => {
    alert(`挑战详情：${challenge.name}\n${challenge.details}\n进度：${challenge.progress}%`);
  };

  return (
    <div className="community-section">
      <h3 className="section-title">🌍 社区与挑战系统</h3>
      
      {/* 挑战列表 */}
      <div className="challenges-list">
        <h4 className="subsection-title">🏆 当前挑战</h4>
        {challenges.map(challenge => (
          <div 
            key={challenge.id} 
            className="challenge-card"
            onClick={() => handleChallengeClick(challenge)}
            style={{ cursor: 'pointer' }}
          >
            <div className="challenge-header">
              <span className="challenge-icon">{challenge.name.split(' ')[0]}</span>
              <div className="challenge-info">
                <h5 className="challenge-name">{challenge.name}</h5>
              </div>
            </div>
            <p className="challenge-desc">{challenge.description}</p>
            <div className="progress-info">
              <div className="progress-bar">
                <div className="progress" style={{ width: `${challenge.progress}%` }}></div>
              </div>
              <span className="progress-text">{challenge.progress}% 完成</span>
            </div>
            <button className="view-details-btn">
              📊 查看详情
            </button>
          </div>
        ))}
      </div>

      {/* 社区动态 */}
      <div className="community-feed">
        <h4 className="subsection-title">💬 社区动态</h4>
        {posts.map(post => (
          <div key={post.id} className="post-item">
            <div className="post-header">
              <span className="post-author">{post.author}</span>
              <span className="post-time">{post.time}</span>
            </div>
            <p className="post-content">{post.content}</p>
            <div className="post-actions">
              <button 
                className="like-btn" 
                onClick={() => handleLike(post.id)}
              >
                👍 {post.likes} 赞
              </button>
              <button 
                className="comment-btn"
                onClick={() => handleViewPost(post)}
              >
                💬 {post.comments} 条评论
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 新动态发布 */}
      <div className="create-post">
        <h4 className="subsection-title">📝 发布新动态</h4>
        <textarea 
          placeholder="分享您的教育心得或提问..." 
          className="post-input"
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          maxLength={200}
        />
        <div className="post-footer">
          <span className="char-count">{newPost.length}/200</span>
          <button 
            className="submit-btn"
            onClick={handlePost}
            disabled={!newPost.trim()}
          >
            发布
          </button>
        </div>
      </div>

      {/* 动态详情弹窗 */}
      {showPostDetails && selectedPost && (
        <div className="post-details-modal">
          <div className="post-details-content">
            <button 
              className="close-btn"
              onClick={() => setShowPostDetails(false)}
            >
              ⚪
            </button>
            <div className="modal-header">
              <h4 className="modal-author">{selectedPost.author}</h4>
              <span className="modal-time">{selectedPost.time}</span>
            </div>
            <p className="modal-content">{selectedPost.details}</p>
            <div className="modal-actions">
              <button className="action-btn like-action" onClick={() => handleLike(selectedPost.id)}>
                👍 赞
              </button>
              <button className="action-btn reply-action">
                💬 回复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunitySystem;
