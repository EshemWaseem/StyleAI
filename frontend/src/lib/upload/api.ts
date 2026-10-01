import { http } from "../api";

export interface UploadedFile {
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
  originalName: string;
}

export const uploadApi = {
  campaignFiles: async (
    campaignId: string,
    deliverableId: string,
    files: File[]
  ): Promise<UploadedFile[]> => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const r = await http.post<{ uploaded: UploadedFile[] }>(
      `/api/upload/campaigns/${campaignId}/${deliverableId}`,
      form
    );
    return r.uploaded;
  },
};