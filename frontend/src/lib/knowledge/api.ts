import { http } from "../api";
import type {
  KnowledgeDocument, KnowledgeStats, SearchResponse,
} from "./types";

export const knowledgeApi = {
  list: () =>
    http.get<{ documents: KnowledgeDocument[] }>("/api/knowledge"),

  stats: () =>
    http.get<KnowledgeStats>("/api/knowledge/stats"),

  get: (id: string) =>
    http.get<{ document: KnowledgeDocument }>(`/api/knowledge/${id}`),

  create: (payload: { name: string; type?: string; content: string }) =>
    http.post<{ message: string; document: KnowledgeDocument }>(
      "/api/knowledge", payload
    ),

  reindex: (id: string) =>
    http.post<{ message: string; chunkCount: number }>(
      `/api/knowledge/${id}/reindex`, {}
    ),

  remove: (id: string) =>
    http.delete<{ message: string; id: string }>(`/api/knowledge/${id}`),

  search: (q: string, limit = 5) =>
    http.get<SearchResponse>(
      `/api/knowledge/search?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
};