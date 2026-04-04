import React from 'react';
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{color: 'red', padding: '20px', background: '#000', height: '100vh', width: '100vw'}}>
          <h2>Something went wrong.</h2>
          <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{this.state.error.toString()}</pre>
          <pre style={{fontSize: '10px'}}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
