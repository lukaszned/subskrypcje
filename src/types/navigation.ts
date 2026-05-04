export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Dashboard: undefined;
  SubscriptionList: undefined;
  AddSubscription: { subscriptionId?: string } | undefined;
  SubscriptionDetail: { id: string };
  Notifications: undefined;
  Settings: undefined;
};

export type RootStackParamList = AuthStackParamList & AppStackParamList;
