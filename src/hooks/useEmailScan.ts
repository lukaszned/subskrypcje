import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearCachedDashboardSummary } from '../api/dashboard';
import {
  acceptDetectedSubscription,
  confirmEmailScanImport,
  getEmailScanImportPreview,
  getEmailDetections,
  getEmailScanStatus,
  getGmailAuthUrl,
  ignoreDetectedSubscription,
  runGmailScan,
  runImapScan,
} from '../api/emailScan';
import {
  AcceptDetectedSubscriptionPayload,
  DetectedSubscriptionStatus,
  EmailScanImportConfirmRequest,
  EmailScanImportConfirmResponse,
  EmailScanImportPreviewRequest,
  GetEmailDetectionsParams,
  GmailScanRequest,
  ImapScanRequest,
  Subscription,
} from '../types/api';
import { SUBSCRIPTIONS_KEY } from './useSubscriptions';

export const EMAIL_SCAN_STATUS_KEY = ['email-scan', 'status'] as const;
export const EMAIL_DETECTIONS_KEY = (params?: GetEmailDetectionsParams) =>
  ['email-scan', 'detections', params ?? {}] as const;

export function useEmailScanStatus() {
  return useQuery({
    queryKey: EMAIL_SCAN_STATUS_KEY,
    queryFn: getEmailScanStatus,
    staleTime: 30 * 1000,
  });
}

export function useEmailDetections(
  status: DetectedSubscriptionStatus = 'pending',
  limit: number = 20,
  offset: number = 0
) {
  const params = { status, limit, offset };

  return useQuery({
    queryKey: EMAIL_DETECTIONS_KEY(params),
    queryFn: () => getEmailDetections(params),
    staleTime: 30 * 1000,
  });
}

export function useGmailAuthUrl() {
  return useMutation({
    mutationFn: getGmailAuthUrl,
  });
}

export function useRunGmailScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: GmailScanRequest) => runGmailScan(payload ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-scan'] });
    },
  });
}

export function useRunImapScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ImapScanRequest) => runImapScan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-scan'] });
    },
  });
}

export function useEmailScanImportPreview() {
  return useMutation({
    mutationFn: (payload: EmailScanImportPreviewRequest) => getEmailScanImportPreview(payload),
  });
}

export function useEmailScanImportConfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EmailScanImportConfirmRequest) => confirmEmailScanImport(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['email-scan'] });
      reconcileCreatedSubscriptions(queryClient, result);
      applyImportRefreshHints(queryClient, result);
    },
  });
}

function reconcileCreatedSubscriptions(
  queryClient: QueryClient,
  result: EmailScanImportConfirmResponse
) {
  const created = Array.isArray(result.created) ? result.created : [];
  if (created.length === 0) return;

  const now = new Date().toISOString();
  const createdSubscriptions: Subscription[] = created
    .filter((item) => item.subscriptionId)
    .map((item) => ({
      id: String(item.subscriptionId),
      name: String(item.name || item.provider || 'Subskrypcja'),
      provider: item.provider ?? null,
      planName: null,
      amount: Number(item.amount || 0),
      currency: item.currency || 'PLN',
      category: (item.category || 'other') as Subscription['category'],
      billingCycle: (item.billingCycle || 'monthly') as Subscription['billingCycle'],
      nextPaymentDate: item.nextPaymentDate ?? null,
      lastPaymentDate: null,
      trialEndDate: null,
      isTrial: false,
      isRecurringBill: Boolean(item.isRecurringBill),
      reminderDaysBefore: 2,
      paymentMethodLabel: 'Email Scan',
      notes: 'Import z Email Scan',
      status: (item.status || 'pending') as Subscription['status'],
      includeInStats: true,
      createdAt: item.createdAt || now,
      updatedAt: item.createdAt || now,
      userId: 'local',
    }));

  if (createdSubscriptions.length === 0) return;

  queryClient.setQueryData<Subscription[]>(SUBSCRIPTIONS_KEY(), (current) => {
    const existing = Array.isArray(current) ? current : [];
    const existingIds = new Set(existing.map((item) => item.id));
    const nextItems = createdSubscriptions.filter((item) => !existingIds.has(item.id));
    return nextItems.length > 0 ? [...nextItems, ...existing] : existing;
  });
}

function applyImportRefreshHints(
  queryClient: QueryClient,
  result: EmailScanImportConfirmResponse
) {
  const hints = Array.isArray(result.refreshHints?.invalidateQueries)
    ? result.refreshHints.invalidateQueries
    : [];
  const createdCount = Array.isArray(result.created) ? result.created.length : 0;
  const shouldRefreshSubscriptions = hints.includes('subscriptions') || createdCount > 0;
  const shouldRefreshDashboard = hints.includes('dashboard') || createdCount > 0;

  if (shouldRefreshSubscriptions) {
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    queryClient.refetchQueries({ queryKey: ['subscriptions'], type: 'active' });
  }

  if (shouldRefreshDashboard) {
    clearCachedDashboardSummary();
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' });
  }
}

export function useAcceptDetection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AcceptDetectedSubscriptionPayload }) =>
      acceptDetectedSubscription(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-scan'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useIgnoreDetection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ignoreDetectedSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-scan'] });
    },
  });
}
