// routes/knowledge.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, Loader2, Upload, Sparkles, Search, FileText,
  Trash2, RotateCw, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  knowledgeApi, type KnowledgeDocument, type SearchResult,
} from "@/lib/knowledge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge Base — StyleAI" }] }),
  component: KnowledgePage,
});

const DOC_TYPES = ["guidelines", "brand", "catalog", "campaign", "other"];

function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [stats, setStats] = useState<{ documents: number; chunks: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("guidelines");
  const [newContent, setNewContent] = useState("");
  const [uploading, setUploading] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchedOnce, setSearchedOnce] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        knowledgeApi.list(),
        knowledgeApi.stats(),
      ]);
      setDocs(list.documents);
      setStats(s);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function upload() {
    if (!newName.trim() || !newContent.trim()) {
      setError("Name and content are required");
      return;
    }
    setUploading(true);
    setError("");
    try {
      await knowledgeApi.create({
        name: newName.trim(),
        type: newType,
        content: newContent.trim(),
      });
      setNewName("");
      setNewContent("");
      setNewType("guidelines");
      setShowUpload(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document and its indexed chunks?")) return;
    try {
      await knowledgeApi.remove(id);
      await load();
    } catch (e: any) { alert(e?.message); }
  }

  async function reindex(id: string) {
    try {
      await knowledgeApi.reindex(id);
      await load();
    } catch (e: any) { alert(e?.message); }
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const r = await knowledgeApi.search(query.trim(), 8);
      setResults(r.results);
      setSearchedOnce(true);
    } catch (e: any) {
      setError(e?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  }

  return (
    <ProtectedRoute>
      <>
        <PageHeader
          eyebrow="Intelligence"
          title="Brand Knowledge Base"
          description="Index your brand guidelines, catalogs, and past campaigns so AI writes in your voice."
          actions={
            <Button onClick={() => setShowUpload((s) => !s)}>
              <Upload className="mr-1.5 size-4" /> {showUpload ? "Cancel" : "Add document"}
            </Button>
          }
        />

        {/* Stats strip */}
        {stats && (
          <Panel className="mt-6 p-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
              <span>
                <span className="text-muted-foreground">Documents: </span>
                <strong className="text-foreground">{stats.documents}</strong>
              </span>
              <span>
                <span className="text-muted-foreground">Indexed chunks: </span>
                <strong className="text-foreground">{stats.chunks}</strong>
              </span>
              <span className="text-muted-foreground">
                Embeddings: Gemini text-embedding-004 (768d) · pgvector
              </span>
            </div>
          </Panel>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {/* Upload panel */}
        {showUpload && (
          <Panel className="mt-6">
            <SectionTitle
              title="Add document"
              description="Paste the text. It will be chunked and embedded."
            />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="doc-name">Name *</Label>
                  <Input
                    id="doc-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Brand voice guidelines 2026"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="doc-type">Type</Label>
                  <select
                    id="doc-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="doc-content">Content *</Label>
                <textarea
                  id="doc-content"
                  rows={10}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste the document text here. Use blank lines between paragraphs for better chunking."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {newContent.length.toLocaleString()} chars · roughly{" "}
                  {Math.ceil(newContent.length / 1200)} chunks
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={upload} disabled={uploading}>
                  {uploading ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" />Indexing… (may take 30s)</>
                  ) : (
                    <><Sparkles className="mr-2 size-4" />Index document</>
                  )}
                </Button>
              </div>
            </div>
          </Panel>
        )}

        {/* Search panel */}
        <Panel className="mt-6">
          <SectionTitle
            title="Search knowledge base"
            description="Semantic search — finds the most relevant chunks even without exact words."
          />
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="e.g. What is our tone of voice?"
                className="w-full bg-transparent outline-none"
              />
            </div>
            <Button onClick={search} disabled={searching || !query.trim()}>
              {searching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <><Search className="mr-1.5 size-4" />Search</>
              )}
            </Button>
          </div>

          {searching && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Embedding query + running cosine similarity…
            </p>
          )}

          {searchedOnce && results.length === 0 && !searching && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              No matches. Upload documents first.
            </p>
          )}

          {results.length > 0 && (
            <div className="mt-4 space-y-3">
              {results.map((r, i) => (
                <article
                  key={r.chunkId}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        #{i + 1} · {r.documentName} · chunk {r.chunkIndex}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {r.content.slice(0, 400)}
                        {r.content.length > 400 ? "…" : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        r.similarity >= 0.8 ? "bg-emerald-500/15 text-emerald-500"
                        : r.similarity >= 0.6 ? "bg-blue-500/15 text-blue-500"
                        : "bg-muted text-muted-foreground"
                      )}
                    >
                      {Math.round(r.similarity * 100)}% match
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>

        {/* Documents list */}
        <Panel className="mt-6 overflow-hidden">
          <SectionTitle
            title="Your documents"
            description={`${docs.length} document${docs.length === 1 ? "" : "s"}`}
          />
          {loading ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
            </div>
          ) : docs.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">
                No documents yet. Click <strong>Add document</strong> to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 py-3"
                >
                  <StatusIcon status={d.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {d.type} · {d.chunkCount} chunk{d.chunkCount === 1 ? "" : "s"} ·{" "}
                      {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                    {d.error && (
                      <p className="mt-1 text-[10px] text-destructive">{d.error}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                      d.status === "INDEXED" ? "bg-emerald-500/15 text-emerald-500"
                      : d.status === "INDEXING" ? "bg-amber-500/15 text-amber-500"
                      : d.status === "FAILED" ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-muted-foreground"
                    )}
                  >
                    {d.status}
                  </span>
                  {d.status === "FAILED" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => reindex(d.id)}
                      title="Reindex"
                    >
                      <RotateCw className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(d.id)}
                    title="Delete"
                    className="text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </>
    </ProtectedRoute>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "INDEXED") return <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />;
  if (status === "FAILED") return <XCircle className="size-4 shrink-0 text-destructive" />;
  if (status === "INDEXING") return <Loader2 className="size-4 shrink-0 animate-spin text-amber-500" />;
  return <Clock className="size-4 shrink-0 text-muted-foreground" />;
}