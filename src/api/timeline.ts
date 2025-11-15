// src/api/timeline.ts

import api from './apiClient';

export type TimelineItemDto = {
  id: number;
  at: string;
  eventType: string;
  actorId: number | null;
  actorName: string | null;
  details: any;
};

export async function fetchIncomingTimeline(id: number) {
  const res = await api.get<TimelineItemDto[]>(`/timeline/incoming/${id}`);
  return res.data;
}

export async function fetchOutgoingTimeline(id: number) {
  const res = await api.get<TimelineItemDto[]>(`/timeline/outgoing/${id}`);
  return res.data;
}
