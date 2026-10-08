import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, UserPlus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel } from "@/components/ui-kit";
import { useRole } from "@/lib/role";
import { teamsApi, type Team } from "@/lib/teams";
import { swalError , swalConfirm } from "@/lib/swal";

export const Route = createFileRoute("/teams/$teamId")({
  head: () => ({ meta: [{ title: "Team — StyleAI" }] }),
  component: TeamDetailPage,
});

function TeamDetailPage() {
  const { teamId } = Route.useParams();
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [team, setTeam] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, teamId, navigate]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await teamsApi.get(teamId);
      setTeam(res.team);
      setName(res.team.name);
      setDescription(res.team.description ?? "");
    } catch (err: any) {
      setError(err?.message || "Could not load team.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await teamsApi.update(teamId, { name, description });
      setTeam((prev) => (prev ? { ...prev, ...res.team } : res.team));
      setSuccess("Team updated.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(userId: string, memberName: string) {
    if (!(await swalConfirm(`Remove ${memberName} from this team?`))) return;
    try {
      await teamsApi.removeMember(teamId, userId);
      setTeam((prev) =>
        prev
          ? { ...prev, members: (prev.members ?? []).filter((m) => m.userId !== userId) }
          : prev
      );
    } catch (err: any) {
      swalError(err?.message || "Remove failed");
    }
  }

  async function handleAddMember(userId: string) {
    try {
      await teamsApi.addMember(teamId, userId);
      setShowAddMember(false);
      load();
    } catch (err: any) {
      swalError(err?.message || "Add failed");
    }
  }

  if (authLoading || loading) {
    return (
      <>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </>
    );
  }

  if (error && !team) {
    return (
      <>
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/team">
            <ArrowLeft /> Back to teams
          </Link>
        </Button>
      </>
    );
  }

  if (!team) return null;

  return (
    <>
      <PageHeader
        eyebrow={team.organization.name}
        title={team.name}
        description={team.description || "Manage team details and members."}
        actions={
          <Button variant="outline" asChild>
            <Link to="/team">
              <ArrowLeft /> Back
            </Link>
          </Button>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* DETAILS */}
        <Panel>
          <h3 className="mb-4 font-display text-lg font-medium">Team details</h3>

          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save /> {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Panel>

        {/* MEMBERS */}
        <Panel>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-medium">
              Members ({team.members?.length ?? 0})
            </h3>
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              <UserPlus className="size-4" /> Add member
            </Button>
          </div>

          {!team.members || team.members.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No members yet. Add people from your organization.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {team.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <div className="grid size-9 place-items-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <span className="hidden text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
                    {m.roles.join(", ").toLowerCase()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${m.name}`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemoveMember(m.userId, m.name)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {showAddMember && (
        <AddMemberModal
          teamId={teamId}
          onClose={() => setShowAddMember(false)}
          onAdd={handleAddMember}
        />
      )}
    </>
  );
}

// ======================================================
// ADD MEMBER MODAL
// ======================================================

function AddMemberModal({
  teamId,
  onClose,
  onAdd,
}: {
  teamId: string;
  onClose: () => void;
  onAdd: (userId: string) => Promise<void>;
}) {
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    teamsApi
      .availableUsers(teamId)
      .then((res) => setUsers(res.users))
      .catch((err) => setError(err?.message || "Failed to load users"))
      .finally(() => setLoading(false));
  }, [teamId]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">Add member</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Everyone in your organization is already in this team.
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Button size="sm" onClick={() => onAdd(u.id)}>
                  Add
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}