import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

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

    return <ThemedErrorFallback onReset={this.handleReset} />;
  }
}

function ThemedErrorFallback({ onReset }: { onReset: () => void }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.panel, { backgroundColor: theme.colors.cardStrong, borderColor: theme.colors.border }]}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>Sub-Sentry</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>Cos poszlo nie tak</Text>
        <Text style={[styles.message, { color: theme.colors.textMuted }]}>
          Aplikacja przechwycila blad i zatrzymala ekran w bezpiecznym stanie.
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={onReset} activeOpacity={0.85}>
          <Text style={[styles.buttonText, { color: theme.colors.darkText }]}>Sprobuj ponownie</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  eyebrow: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 22,
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
