import React from 'react';

/**
 * PremiumLoader - A sleek, highly-polished loading animation
 * Designed to feel expensive and modern.
 */
const PremiumLoader = ({ size = 50, color = 'var(--orange)', thickness = 3 }) => {
  return (
    <div className="premium-loader-container">
      <div 
        className="premium-spinner"
        style={{
          width: size,
          height: size,
          border: `${thickness}px solid rgba(255, 255, 255, 0.05)`,
          borderTopColor: color,
          borderRadius: '50%',
        }}
      />
      <div className="loader-glow" style={{ color }} />
      
      <style dangerouslySetInnerHTML={{ __html: `
        .premium-loader-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .premium-spinner {
          animation: premium-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        
        .loader-glow {
          position: absolute;
          width: 80%;
          height: 80%;
          background: currentColor;
          border-radius: 50%;
          filter: blur(25px);
          opacity: 0.15;
          animation: loader-pulse 2s ease-in-out infinite;
        }
        
        @keyframes premium-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes loader-pulse {
          0%, 100% { opacity: 0.1; transform: scale(0.8); }
          50% { opacity: 0.2; transform: scale(1.1); }
        }
      `}} />
    </div>
  );
};

export default PremiumLoader;
