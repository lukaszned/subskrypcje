import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends React.PureComponent<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.panel}>
          <Text style={styles.eyebrow}>Sub-Sentry</Text>
          <Text style={styles.title}>Coś poszło nie tak</Text>
          <Text style={styles.message}>
            Aplikacja przechwyciła błąd i zatrzymała ekran w bezpiecznym stanie.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0B1120',
  },
  panel: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  eyebrow: {
    marginBottom: 8,
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
  },
  message: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 22,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
