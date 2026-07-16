import { useEffect, useState } from "react";
import outputs from "../../amplify/amplify_outputs.json";

type WorksheetFields = Record<string, string>;

const HTTP_API_URL =
  (outputs as { custom?: { cpcHttpApi?: { url?: string } } })?.custom?.cpcHttpApi?.url ?? "";

export const WORKSHEET_ENDPOINT = HTTP_API_URL
  ? `${HTTP_API_URL.replace(/\/?$/, "/")}worksheet`
  : "";

const worksheetFieldsCache = new Map<string, WorksheetFields>();
const inFlightWorksheetRequests = new Map<string, Promise<WorksheetFields>>();

function normalizePropertyId(propertyId: string | null | undefined): string {
  return propertyId?.trim() ?? "";
}

export function clearWorksheetFieldsCache(): void {
  worksheetFieldsCache.clear();
  inFlightWorksheetRequests.clear();
}

export function getCachedWorksheetFields(
  propertyId: string | null | undefined,
): WorksheetFields | undefined {
  const normalizedPropertyId = normalizePropertyId(propertyId);
  if (!normalizedPropertyId) return undefined;
  return worksheetFieldsCache.get(normalizedPropertyId);
}

export function primeWorksheetFieldsCache(
  propertyId: string | null | undefined,
  fields: WorksheetFields,
): WorksheetFields {
  const normalizedPropertyId = normalizePropertyId(propertyId);
  if (!normalizedPropertyId) return fields;
  worksheetFieldsCache.set(normalizedPropertyId, fields);
  return fields;
}

export function invalidateWorksheetFields(propertyId: string | null | undefined): void {
  const normalizedPropertyId = normalizePropertyId(propertyId);
  if (!normalizedPropertyId) return;
  worksheetFieldsCache.delete(normalizedPropertyId);
  inFlightWorksheetRequests.delete(normalizedPropertyId);
}

export async function fetchWorksheetFields(
  propertyId: string | null | undefined,
  fetchImpl: typeof fetch = fetch,
  endpoint: string = WORKSHEET_ENDPOINT,
): Promise<WorksheetFields> {
  const normalizedPropertyId = normalizePropertyId(propertyId);
  if (!normalizedPropertyId || !endpoint) {
    return {};
  }

  const cached = worksheetFieldsCache.get(normalizedPropertyId);
  if (cached) {
    return cached;
  }

  const existingRequest = inFlightWorksheetRequests.get(normalizedPropertyId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = fetchImpl(
    `${endpoint}?projectId=${encodeURIComponent(normalizedPropertyId)}`,
  )
    .then((response) => response.json())
    .then((data: { fields?: WorksheetFields }) =>
      primeWorksheetFieldsCache(normalizedPropertyId, data.fields ?? {}),
    )
    .catch(() => {
      worksheetFieldsCache.delete(normalizedPropertyId);
      return {};
    })
    .finally(() => {
      inFlightWorksheetRequests.delete(normalizedPropertyId);
    });

  inFlightWorksheetRequests.set(normalizedPropertyId, request);
  return request;
}

export function usePropertyWorksheetFields(
  propertyId: string | null | undefined,
): WorksheetFields {
  const normalizedPropertyId = normalizePropertyId(propertyId);
  const [worksheetFields, setWorksheetFields] = useState<WorksheetFields>(
    () => getCachedWorksheetFields(normalizedPropertyId) ?? {},
  );
  const [loadedPropertyId, setLoadedPropertyId] = useState(normalizedPropertyId);

  useEffect(() => {
    let isMounted = true;

    if (
      !normalizedPropertyId ||
      !WORKSHEET_ENDPOINT ||
      getCachedWorksheetFields(normalizedPropertyId)
    ) {
      return () => {
        isMounted = false;
      };
    }

    void fetchWorksheetFields(normalizedPropertyId).then((fields) => {
      if (isMounted) {
        setLoadedPropertyId(normalizedPropertyId);
        setWorksheetFields(fields);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [normalizedPropertyId]);

  if (!normalizedPropertyId || !WORKSHEET_ENDPOINT) {
    return {};
  }

  const cachedWorksheetFields = getCachedWorksheetFields(normalizedPropertyId);
  if (cachedWorksheetFields) {
    return cachedWorksheetFields;
  }

  if (loadedPropertyId !== normalizedPropertyId) {
    return {};
  }

  return worksheetFields;
}
