import React, { Component } from 'react';
import { logCrash } from '../utils/crashLogger';

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the crash to file BEFORE rendering fallback
    const appState = this._getAppState();
    logCrash(error, errorInfo, appState);

    // Store errorInfo for potential later use
    this.setState({ errorInfo });
  }

  _getAppState() {
    // Attempt to gather relevant app state for crash context
    // This is a simplified version - in a real app, you'd access context providers
    const state = {
      theme: 'unknown',
      language: 'unknown',
      citiesCount: 0,
      selectedCity: 'none',
    };
    return state;
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI shown after crash is logged
      return (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>Что-то пошло не так</Text>
          <Text style={styles.fallbackSubText}>Попробуйте перезапустить приложение</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = {
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 10,
  },
  fallbackSubText: {
    fontSize: 14,
    color: '#6b7280',
  },
};

export default GlobalErrorBoundary;