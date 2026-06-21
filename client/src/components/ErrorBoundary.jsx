import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const errorStyles = {
  container: 'flex flex-col items-center justify-center h-full p-6 text-center bg-gray-50 dark:bg-dark-tertiary/30',
  icon: 'w-10 h-10 text-red-500 mb-3',
  title: 'text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1',
  message: 'text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-xs',
  button: 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 dark:bg-dark-tertiary hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors'
};

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className={errorStyles.container}>
          <AlertTriangle className={errorStyles.icon} />
          <p className={errorStyles.title}>{this.props.title || 'Something went wrong'}</p>
          <p className={errorStyles.message}>
            {this.state.error.message || 'An unexpected error occurred in this panel.'}
          </p>
          <button onClick={this.handleRetry} className={errorStyles.button}>
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
