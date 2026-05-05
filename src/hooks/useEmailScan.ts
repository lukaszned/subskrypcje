import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptDetectedSubscription,
  getEmailDetections,
  getEmailScanStatus,
  getGmailAuthUrl,
  ignoreDetectedSubscription,
  runGmailScan,
} from '../api/emailScan';
import {
  AcceptDetectedSubscriptionPayload,
  DetectedSubscriptionStatus,
  GetEmailDetectionsParams,
  GmailScanRequest,
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

export function useAcceptDetection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AcceptDetectedSubscriptionPayload }) =>
      acceptDetectedSubscription(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-scan'] });
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY() });
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
