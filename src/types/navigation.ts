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
  EmailScan: undefined;
  Statistics: undefined;
  PaymentCalendar: undefined;
  HealthScoreDetails: undefined;
  SavingsDetails: undefined;
};
