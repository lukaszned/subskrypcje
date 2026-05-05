import { apiGet, apiPatch, apiPostWithTimeout } from '../lib/apiClient';
import {
  AcceptDetectedSubscriptionPayload,
  AcceptDetectedSubscriptionResponse,
  EmailDetectionsResponse,
  EmailScanStatusResponse,
  GetEmailDetectionsParams,
  GmailAuthUrlResponse,
  GmailScanRequest,
  GmailScanResponse,
} from '../types/api';

export async function getEmailScanStatus(): Promise<EmailScanStatusResponse> {
  return apiGet<EmailScanStatusResponse>('/email-scan/status');
}

export async function getGmailAuthUrl(): Promise<GmailAuthUrlResponse> {
  return apiGet<GmailAuthUrlResponse>('/email-scan/gmail/auth-url');
}

export async function runGmailScan(payload: GmailScanRequest = {}): Promise<GmailScanResponse> {
  return apiPostWithTimeout<GmailScanResponse>('/email-scan/gmail/scan', payload, 60000);
}

export async function getEmailDetections(
  params: GetEmailDetectionsParams = {}
): Promise<EmailDetectionsResponse> {
  const query = new URLSearchParams();

  if (params.status) query.append('status', params.status);
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.offset !== undefined) query.append('offset', String(params.offset));

  const qs = query.toString();
  const path = qs ? `/email-scan/detections?${qs}` : '/email-scan/detections';

  return apiGet<EmailDetectionsResponse>(path);
}

export async function acceptDetectedSubscription(
  id: string,
  payload: AcceptDetectedSubscriptionPayload
): Promise<AcceptDetectedSubscriptionResponse> {
  return apiPatch<AcceptDetectedSubscriptionResponse>(`/email-scan/detections/${id}/accept`, payload);
}

export async function ignoreDetectedSubscription(id: string) {
  return apiPatch(`/email-scan/detections/${id}/ignore`);
}
