export interface KnowledgeDocument {
  id: string;
  name: string;
  type: string;
  mimeType: string | null;
  sizeBytes: number;
  storageUrl: string | null;
  status: "PENDING" | "INDEXING" | "INDEXED" | "FAILED";
  error: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  documentType: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export interface KnowledgeStats {
  documents: number;
  chunks: number;
}