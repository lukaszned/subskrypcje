import type { BillingCycle, SubscriptionCategory } from '../types/api';

export interface SubscriptionPlanVariant {
  name: string;
  price: number;
  billingCycle?: BillingCycle;
}

export interface PopularSubscription {
  name: string;
  defaultPrice: string;
  category: SubscriptionCategory;
  color: string;
  provider: string;
  availablePlans?: SubscriptionPlanVariant[];
}

export const LOCAL_SUBSCRIPTION_PLANS: PopularSubscription[] = [
  { name: 'Netflix', defaultPrice: '43.00', category: 'entertainment', color: '#E50914', provider: 'Netflix', availablePlans: [
    { name: 'Podstawowy', price: 29.00 },
    { name: 'Standard', price: 43.00 },
    { name: 'Premium', price: 60.00 },
  ] },
  { name: 'Spotify', defaultPrice: '23.99', category: 'entertainment', color: '#1DB954', provider: 'Spotify', availablePlans: [
    { name: 'Student', price: 12.99 },
    { name: 'Individual', price: 23.99 },
    { name: 'Duo', price: 30.99 },
    { name: 'Family', price: 37.99 },
  ] },
  { name: 'YouTube Premium', defaultPrice: '25.99', category: 'entertainment', color: '#FF0000', provider: 'Google', availablePlans: [
    { name: 'Student', price: 14.99 },
    { name: 'Individual', price: 25.99 },
    { name: 'Family', price: 46.99 },
  ] },
  { name: 'Disney+', defaultPrice: '29.99', category: 'entertainment', color: '#006E99', provider: 'Disney', availablePlans: [
    { name: 'Standard', price: 29.99 },
    { name: 'Premium', price: 37.99 },
  ] },
  { name: 'Max', defaultPrice: '29.99', category: 'entertainment', color: '#5822B4', provider: 'Warner Bros', availablePlans: [
    { name: 'Podstawowy', price: 19.99 },
    { name: 'Standard', price: 29.99 },
    { name: 'Premium', price: 49.99 },
  ] },
  { name: 'Amazon Prime', defaultPrice: '10.99', category: 'entertainment', color: '#FF9900', provider: 'Amazon', availablePlans: [
    { name: 'Miesiecznie', price: 10.99, billingCycle: 'monthly' },
    { name: 'Rocznie', price: 49.00, billingCycle: 'yearly' },
  ] },
  { name: 'Apple Music', defaultPrice: '21.99', category: 'entertainment', color: '#FA243C', provider: 'Apple', availablePlans: [
    { name: 'Student', price: 11.99 },
    { name: 'Individual', price: 21.99 },
    { name: 'Family', price: 34.99 },
  ] },
  { name: 'Apple TV+', defaultPrice: '34.99', category: 'entertainment', color: '#000000', provider: 'Apple', availablePlans: [
    { name: 'Miesiecznie', price: 34.99, billingCycle: 'monthly' },
    { name: 'Rocznie', price: 349.90, billingCycle: 'yearly' },
  ] },
  { name: 'Canva', defaultPrice: '49.99', category: 'productivity', color: '#00C4CC', provider: 'Canva', availablePlans: [
    { name: 'Pro', price: 49.99 },
    { name: 'Teams', price: 64.99 },
  ] },
  { name: 'Xbox Game Pass', defaultPrice: '42.99', category: 'entertainment', color: '#107C10', provider: 'Microsoft', availablePlans: [
    { name: 'Core', price: 40.00 },
    { name: 'PC', price: 42.99 },
    { name: 'Ultimate', price: 62.99 },
  ] },
  { name: 'Allegro Smart!', defaultPrice: '10.99', category: 'shopping', color: '#FF5A00', provider: 'Allegro', availablePlans: [
    { name: 'Miesiecznie', price: 10.99, billingCycle: 'monthly' },
    { name: 'Rocznie', price: 59.90, billingCycle: 'yearly' },
  ] },
  { name: 'Strava', defaultPrice: '32.99', category: 'health', color: '#FC4C02', provider: 'Strava', availablePlans: [
    { name: 'Miesiecznie', price: 32.99, billingCycle: 'monthly' },
    { name: 'Rocznie', price: 249.99, billingCycle: 'yearly' },
  ] },
  { name: 'iCloud+', defaultPrice: '3.99', category: 'utilities', color: '#007AFF', provider: 'Apple', availablePlans: [
    { name: '50 GB', price: 3.99 },
    { name: '200 GB', price: 14.99 },
    { name: '2 TB', price: 49.99 },
  ] },
  { name: 'ChatGPT Plus', defaultPrice: '20.00', category: 'productivity', color: '#10A37F', provider: 'OpenAI' },
  { name: 'PlayStation Plus', defaultPrice: '37.00', category: 'entertainment', color: '#003087', provider: 'Sony', availablePlans: [
    { name: 'Essential', price: 37.00 },
    { name: 'Extra', price: 58.00 },
    { name: 'Premium', price: 70.00 },
  ] },
];
