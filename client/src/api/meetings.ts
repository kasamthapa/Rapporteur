import type { MeetingDetail, MeetingResult, MeetingSummary } from "../types/meeting";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface CreateMeetingPayload {
  title: string;
  agenda?: string[];
  transcript: string;
}

export interface CreateMeetingResponse {
  id: string;
  result: MeetingResult;
}

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) {
    throw new ApiError(0, "VITE_API_BASE_URL is not set — cannot reach the server");
  }
  return base;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, init);
  } catch {
    throw new ApiError(0, "cannot reach the server");
  }

  if (!response.ok) {
    let message = `request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // body wasn't JSON — keep the generic message
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

export function listMeetings(): Promise<MeetingSummary[]> {
  return request<MeetingSummary[]>("/meetings");
}

export function getMeeting(id: string): Promise<MeetingDetail> {
  return request<MeetingDetail>(`/meetings/${id}`);
}

export function createMeeting(payload: CreateMeetingPayload): Promise<CreateMeetingResponse> {
  return request<CreateMeetingResponse>("/meetings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
