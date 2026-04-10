import React from 'react';

const SkeletonArticle = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-avatar" />
        <div className="skeleton-meta">
          <div className="skeleton-line short" />
          <div className="skeleton-line tiny" />
        </div>
      </div>
      <div className="skeleton-body">
        <div className="skeleton-line long" />
        <div className="skeleton-line mid" />
        <div className="skeleton-image" />
      </div>
      <div className="skeleton-actions">
        <div className="skeleton-circle" />
        <div className="skeleton-circle" />
        <div className="skeleton-circle" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .skeleton-card {
          padding: 18px 20px;
          border-bottom: 1px solid var(--border);
          opacity: 0.6;
        }
        
        .skeleton-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        
        .skeleton-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--surface2);
        }
        
        .skeleton-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .skeleton-line {
          height: 12px;
          background: var(--surface2);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }
        
        .skeleton-line::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          transform: translateX(-100%);
          animation: skeleton-shimmer 1.5s infinite;
        }
        
        .skeleton-line.short { width: 40%; }
        .skeleton-line.tiny { width: 20%; height: 8px; }
        .skeleton-line.mid { width: 70%; }
        .skeleton-line.long { width: 90%; margin-bottom: 8px; }
        
        .skeleton-body {
          margin-bottom: 16px;
        }
        
        .skeleton-image {
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 12px;
          background: var(--surface2);
          margin-top: 12px;
          position: relative;
          overflow: hidden;
        }
        
        .skeleton-image::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
          transform: translateX(-100%);
          animation: skeleton-shimmer 1.5s infinite;
        }
        
        .skeleton-actions {
          display: flex;
          gap: 32px;
          margin-top: 20px;
        }
        
        .skeleton-circle {
          width: 22px;
          height: 22px;
          border-radius: 5px;
          background: var(--surface2);
        }
        
        @keyframes skeleton-shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
};

export default SkeletonArticle;
