import { http } from "../api";
import type { EditorialStory } from "../editorial";

export const journalApi = {
  list: () => http.get<{ stories: EditorialStory[] }>("/api/editorial"),
  create: (data: Omit<EditorialStory, "id">) => http.post<{ story: EditorialStory }>("/api/editorial", data),
  update: (id: string, data: Partial<EditorialStory>) => http.patch<{ story: EditorialStory }>(`/api/editorial/${id}`, data),
  remove: (id: string) => http.delete<{ message: string }>(`/api/editorial/${id}`),
};