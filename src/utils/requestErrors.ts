export function isTimeoutLikeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /timeout|did not respond|abort/i.test(message);
}

export function getSafeMutationErrorMessage(error: unknown, fallback: string) {
  if (isTimeoutLikeError(error)) {
    return 'Backend odpowiada wolniej niż zwykle. Nie mamy jeszcze potwierdzenia operacji, więc sprawdź aktualny stan przed ponowną próbą.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
