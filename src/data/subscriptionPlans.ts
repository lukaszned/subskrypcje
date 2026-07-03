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
  logoUrl?: string;
  availablePlans?: SubscriptionPlanVariant[];
}

export const LOCAL_SUBSCRIPTION_PLANS: PopularSubscription[] = [
  { name: 'Netflix', defaultPrice: '55.00', category: 'entertainment', color: '#E50914', provider: 'Netflix', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/netflix.svg', availablePlans: [
    { name: 'Podstawowy', price: 37.00 },
    { name: 'Standard', price: 55.00 },
    { name: 'Premium', price: 75.00 },
  ] },
  { name: 'Spotify', defaultPrice: '26.99', category: 'entertainment', color: '#1DB954', provider: 'Spotify', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/spotify.svg', availablePlans: [
    { name: 'Student', price: 14.49 },
    { name: 'Individual', price: 26.99 },
    { name: 'Duo', price: 36.99 },
    { name: 'Family', price: 45.99 },
  ] },
  { name: 'YouTube Premium', defaultPrice: '29.99', category: 'entertainment', color: '#FF0000', provider: 'Google', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/youtube.svg', availablePlans: [
    { name: 'Premium Lite', price: 17.99 },
    { name: 'Student', price: 18.99 },
    { name: 'Individual', price: 29.99 },
    { name: 'Family', price: 59.99 },
  ] },
  { name: 'Disney+', defaultPrice: '34.99', category: 'entertainment', color: '#006E99', provider: 'Disney', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', availablePlans: [
    { name: 'Standard', price: 34.99 },
    { name: 'Premium', price: 59.99 },
    { name: 'Standard rocznie', price: 349.90, billingCycle: 'yearly' },
    { name: 'Premium rocznie', price: 599.90, billingCycle: 'yearly' },
  ] },
  { name: 'Max', defaultPrice: '39.99', category: 'entertainment', color: '#5822B4', provider: 'Warner Bros', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/hbomax.svg', availablePlans: [
    { name: 'Podstawowy', price: 29.99 },
    { name: 'Standard', price: 39.99 },
    { name: 'Premium', price: 49.99 },
    { name: 'Podstawowy rocznie', price: 299.00, billingCycle: 'yearly' },
    { name: 'Standard rocznie', price: 399.00, billingCycle: 'yearly' },
    { name: 'Premium rocznie', price: 499.00, billingCycle: 'yearly' },
  ] },
  { name: 'Amazon Prime', defaultPrice: '15.50', category: 'entertainment', color: '#FF9900', provider: 'Amazon', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/amazonprime.svg', availablePlans: [
    { name: 'Miesiecznie', price: 15.50, billingCycle: 'monthly' },
    { name: 'Rocznie', price: 69.00, billingCycle: 'yearly' },
  ] },
  { name: 'Apple Music', defaultPrice: '21.99', category: 'entertainment', color: '#FA243C', provider: 'Apple', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/applemusic.svg', availablePlans: [
    { name: 'Student', price: 11.99 },
    { name: 'Individual', price: 21.99 },
    { name: 'Family', price: 34.99 },
  ] },
  { name: 'Apple TV+', defaultPrice: '34.99', category: 'entertainment', color: '#000000', provider: 'Apple', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/appletv.svg', availablePlans: [
    { name: 'Miesiecznie', price: 34.99, billingCycle: 'monthly' },
    { name: 'Rocznie', price: 349.90, billingCycle: 'yearly' },
  ] },
  { name: 'Canva', defaultPrice: '49.99', category: 'productivity', color: '#00C4CC', provider: 'Canva', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/canva.svg', availablePlans: [
    { name: 'Pro', price: 49.99 },
    { name: 'Teams', price: 64.99 },
  ] },
  { name: 'Xbox Game Pass', defaultPrice: '42.99', category: 'entertainment', color: '#107C10', provider: 'Microsoft', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/xbox.svg', availablePlans: [
    { name: 'Core', price: 40.00 },
    { name: 'PC', price: 42.99 },
    { name: 'Ultimate', price: 62.99 },
  ] },
  { name: 'Allegro Smart!', defaultPrice: '10.99', category: 'shopping', color: '#FF5A00', provider: 'Allegro', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/allegro.svg', availablePlans: [
    { name: 'Miesiecznie', price: 10.99, billingCycle: 'monthly' },
    { name: 'Rocznie', price: 59.90, billingCycle: 'yearly' },
  ] },
  { name: 'Strava', defaultPrice: '32.99', category: 'health', color: '#FC4C02', provider: 'Strava', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/strava.svg', availablePlans: [
    { name: 'Miesiecznie', price: 32.99, billingCycle: 'monthly' },
    { name: 'Rocznie', price: 249.99, billingCycle: 'yearly' },
  ] },
  { name: 'iCloud+', defaultPrice: '3.99', category: 'utilities', color: '#007AFF', provider: 'Apple', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/icloud.svg', availablePlans: [
    { name: '50 GB', price: 3.99 },
    { name: '200 GB', price: 14.99 },
    { name: '2 TB', price: 49.99 },
  ] },
  { name: 'ChatGPT Plus', defaultPrice: '20.00', category: 'productivity', color: '#10A37F', provider: 'OpenAI', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/openai.svg' },
  { name: 'PlayStation Plus', defaultPrice: '37.00', category: 'entertainment', color: '#003087', provider: 'Sony', logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/playstation.svg', availablePlans: [
    { name: 'Essential', price: 37.00 },
    { name: 'Extra', price: 58.00 },
    { name: 'Premium', price: 70.00 },
  ] },
];
