export type AlertChannel = "email" | "sms";

export const TRANSIENT_ERROR_PATTERNS = [
  "throttl",
  "timeout",
  "too many requests",
  "service unavailable",
  "internal",
  "temporar",
  "network",
];

export function parseChannels(raw: string | null | undefined): AlertChannel[] {
  if (!raw) return [];

  const parsed = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is AlertChannel => value === "email" || value === "sms");

  return Array.from(new Set(parsed));
}

export function isValidEmail(email: string | null | undefined): email is string {
  if (!email) return false;
  const normalized = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function isValidPhone(phone: string | null | undefined): phone is string {
  if (!phone) return false;
  return /^\+[1-9]\d{7,14}$/.test(phone.trim());
}

export function isTransientError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`.toLowerCase()
      : String(error).toLowerCase();

  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export function nextStatusFromFailure(attemptCount: number, maxAttempts: number, transient: boolean): "queued" | "failed" {
  if (transient && attemptCount < maxAttempts) {
    return "queued";
  }

  return "failed";
}
