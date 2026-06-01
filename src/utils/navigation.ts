type DashboardFallbackNavigation = {
  canGoBack: () => boolean;
  goBack: () => void;
  navigate: (screen: 'Dashboard') => void;
};

export function goBackOrDashboard(navigation: DashboardFallbackNavigation) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }

  navigation.navigate('Dashboard');
}
