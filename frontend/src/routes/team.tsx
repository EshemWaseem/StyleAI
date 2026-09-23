import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  AlertCircle,
  Check,
  X,
  Mail,
  UserPlus,
  Shield,
  Trash2,
  Pencil,
  ChevronDown,
  Link2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { RoleEditorModal } from "@/components/RoleEditorModal";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/utils";
import {
  brandTeamApi,
  getRoleColorClasses,
  type BrandTeamRole,
  type BrandTeamMember,
  type MyMembership,
} from "@/lib/brand-team";
import { joinRequestsApi, type JoinRequest } from "@/lib/join-requests";
import { invitationsApi, type Invitation } from "@/lib/invitations";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team — StyleAI" }] }),
  component: TeamPage,
});

// ======================================================
// PAGE
// ======================================================

function TeamPage() {
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const isAdmin = !!user?.roles.includes("SUPER_ADMIN");
  const isOwner = !!user?.roles.some((r) =>
    ["BRAND_OWNER", "AGENCY"].includes(r)
  );

  const [roles, setRoles] = useState<BrandTeamRole[]>([]);
  const [members, setMembers] = useState<BrandTeamMember[]>([]);
  const [pending, setPending] = useState<JoinRequest[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [myMembership, setMyMembership] = useState<MyMembership | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingRole, setEditingRole] = useState<BrandTeamRole | null>(null);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<JoinRequest | null>(
    null
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, navigate]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const tasks: Promise<any>[] = [
        brandTeamApi.listRoles(),
        brandTeamApi.listMembers(),
        brandTeamApi.myMembership(),
      ];

      if (isOwner || isAdmin) {
        tasks.push(
          joinRequestsApi.pending().catch(() => ({ count: 0, requests: [] })),
          invitationsApi.sent().catch(() => ({ count: 0, invitations: [] }))
        );
      }

      const results = await Promise.all(tasks);

      setRoles(results[0].roles ?? []);
      setMembers(results[1].members ?? []);
      setMyMembership(results[2].membership ?? null);

      if (isOwner || isAdmin) {
        setPending(results[3]?.requests ?? []);
        setInvites(results[4]?.invitations ?? []);
      }
    } catch (err: any) {
      setError(err?.message || "Could not load team data");
    } finally {
      setLoading(false);
    }
  }

  async function refreshMembers() {
    try {
      const res = await brandTeamApi.listMembers();
      setMembers(res.members);
    } catch {
      // silent
    }
  }

  async function refreshInvites() {
    try {
      const res = await invitationsApi.sent();
      setInvites(res.invitations);
    } catch {
      // silent
    }
  }

  async function handleDeleteRole(role: BrandTeamRole) {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await brandTeamApi.deleteRole(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
    } catch (err: any) {
      alert(err?.message || "Delete failed");
    }
  }

  async function handleRejectRequest(id: string) {
    if (!confirm("Reject this request?")) return;
    try {
      await joinRequestsApi.reject(id);
      setPending((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err?.message || "Reject failed");
    }
  }

  async function handleCancelInvite(id: string) {
    if (!confirm("Cancel this invitation?")) return;
    try {
      await invitationsApi.cancel(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      alert(err?.message || "Cancel failed");
    }
  }

  async function handleRemoveMember(member: BrandTeamMember) {
    if (!confirm(`Remove ${member.user?.name ?? "this member"} from the team?`))
      return;
    try {
      await brandTeamApi.removeMember(member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (err: any) {
      alert(err?.message || "Remove failed");
    }
  }

  async function handleChangeRole(member: BrandTeamMember, roleId: string) {
    try {
      const res = await brandTeamApi.changeMemberRole(member.id, roleId);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? res.member : m))
      );
    } catch (err: any) {
      alert(err?.message || "Failed to change role");
    }
  }

  async function handleApprove(request: JoinRequest, roleId: string) {
    try {
      await joinRequestsApi.approve(request.id, roleId);
      setPending((prev) => prev.filter((r) => r.id !== request.id));
      setApprovingRequest(null);
      await refreshMembers();
    } catch (err: any) {
      alert(err?.message || "Approve failed");
    }
  }

  if (authLoading || loading) {
    return (
      <AppShell breadcrumb={["Administration", "Team"]}>
        <p className="text-sm text-muted-foreground">Loading team…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      breadcrumb={
        isAdmin ? ["Platform", "All Teams"] : ["Administration", "Team"]
      }
    >
      <PageHeader
        eyebrow={isAdmin ? "Platform" : "Administration"}
        title={isAdmin ? "All Teams" : "Team"}
        description={
          isAdmin
            ? "All teams across the platform."
            : "Create custom roles, add members, and manage access."
        }
        actions={
          !isAdmin && isOwner ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddMember(true)}
                disabled={roles.length === 0}
              >
                <UserPlus /> Add member
              </Button>
              <Button
                onClick={() => {
                  setEditingRole(null);
                  setShowRoleEditor(true);
                }}
              >
                <Plus /> New role
              </Button>
            </div>
          ) : null
        }
      />

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ====================================================== */}
      {/* MY ROLE — teammate view */}
      {/* ====================================================== */}
      {!isOwner && !isAdmin && myMembership && (
        <section className="mt-8">
          <Panel>
            <div className="flex items-center gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                <Shield className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Your role</p>
                <div className="mt-1 flex items-center gap-2">
                  <RoleBadge role={myMembership.role} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Member of{" "}
                  <strong className="text-foreground">
                    {myMembership.brand.name}
                  </strong>
                </p>
              </div>
            </div>
          </Panel>
        </section>
      )}

      {/* ====================================================== */}
      {/* ROLES */}
      {/* ====================================================== */}
      {(isOwner || isAdmin) && (
        <section className="mt-8">
          <SectionTitle
            title="Roles"
            description="Custom roles for your brand. Assign a role to each teammate."
          />

          {roles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No roles yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => {
                const classes = getRoleColorClasses(role.color);
                return (
                  <div
                    key={role.id}
                    className={cn(
                      "group relative rounded-xl border bg-card p-4 transition-colors hover:border-accent/40",
                      classes.border
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <RoleBadge role={role} />
                          {role.isOwnerRole && (
                            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Owner
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                        <p className="mt-3 text-[11px] text-muted-foreground">
                          {role.permissions.length} permissions ·{" "}
                          {role.memberCount ?? 0} member
                          {(role.memberCount ?? 0) === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            setEditingRole(role);
                            setShowRoleEditor(true);
                          }}
                          aria-label="Edit role"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {!role.isOwnerRole && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRole(role)}
                            aria-label="Delete role"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ====================================================== */}
      {/* PENDING JOIN REQUESTS */}
      {/* ====================================================== */}
      {(isOwner || isAdmin) && pending.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-display text-lg font-medium">
              Pending requests
            </h2>
            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
              {pending.length}
            </span>
          </div>
          <Panel>
            <ul className="divide-y divide-border">
              {pending.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                    {r.user?.name.slice(0, 2).toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.user?.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.user?.email}
                    </p>
                    {r.requestedRole && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Requested:{" "}
                        <span className="font-medium">
                          {r.requestedRole.name}
                        </span>
                      </p>
                    )}
                    {r.message && (
                      <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">
                        "{r.message}"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => setApprovingRequest(r)}
                      disabled={roles.length === 0}
                    >
                      <Check className="size-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRejectRequest(r.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}

      {/* ====================================================== */}
      {/* SENT INVITATIONS */}
      {/* ====================================================== */}
      {(isOwner || isAdmin) && invites.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-display text-lg font-medium">
              Invitations sent
            </h2>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {invites.length}
            </span>
          </div>
          <Panel>
            <ul className="divide-y divide-border">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    <Mail className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.teamRole ? `Role: ${i.teamRole.name} · ` : ""}
                      Sent {new Date(i.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      i.status === "PENDING"
                        ? "bg-amber-500/15 text-amber-500"
                        : i.status === "ACCEPTED"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i.status}
                  </span>
                  {i.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancelInvite(i.id)}
                      aria-label="Cancel invitation"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}

      {/* ====================================================== */}
      {/* MEMBERS */}
      {/* ====================================================== */}
      <section className="mt-10">
        <SectionTitle
          title="Members"
          description={
            isOwner
              ? "Everyone on your brand team. Change their role anytime."
              : "Your brand team."
          }
        />

        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "No members on the platform yet."
                : "No team members yet."}
            </p>
            {isOwner && roles.length > 0 && (
              <Button className="mt-4" onClick={() => setShowAddMember(true)}>
                <UserPlus /> Add your first member
              </Button>
            )}
          </div>
        ) : (
          <Panel>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Member</th>
                    <th className="pb-3 pr-4 font-medium">Role</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Joined</th>
                    {isOwner && (
                      <th className="pb-3 text-right font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-accent/5">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                            {m.user?.name.slice(0, 2).toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {m.user?.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {m.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {isOwner && m.role ? (
                          <RoleDropdown
                            member={m}
                            roles={roles}
                            onChange={(roleId) => handleChangeRole(m, roleId)}
                          />
                        ) : (
                          <RoleBadge role={m.role} />
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            m.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>
                      {isOwner && (
                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(m)}
                            aria-label="Remove member"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </section>

      {/* ====================================================== */}
      {/* MODALS */}
      {/* ====================================================== */}

      {showRoleEditor && (
        <RoleEditorModal
          mode={editingRole ? "edit" : "create"}
          role={editingRole}
          onClose={() => {
            setShowRoleEditor(false);
            setEditingRole(null);
          }}
          onSaved={(saved) => {
            setRoles((prev) => {
              const exists = prev.find((r) => r.id === saved.id);
              return exists
                ? prev.map((r) => (r.id === saved.id ? saved : r))
                : [...prev, saved];
            });
            setShowRoleEditor(false);
            setEditingRole(null);
          }}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          roles={roles}
          onClose={() => setShowAddMember(false)}
          onAdded={async () => {
            await refreshMembers();
            setShowAddMember(false);
          }}
          onInvited={async () => {
            await refreshInvites();
            setShowAddMember(false);
          }}
        />
      )}

      {approvingRequest && (
        <ApproveRequestModal
          request={approvingRequest}
          roles={roles}
          onClose={() => setApprovingRequest(null)}
          onApprove={(roleId) => handleApprove(approvingRequest, roleId)}
        />
      )}
    </AppShell>
  );
}

// ======================================================
// SMALL COMPONENTS
// ======================================================

function RoleBadge({
  role,
}: {
  role: { name: string; color: string | null } | null | undefined;
}) {
  if (!role) return <span className="text-xs text-muted-foreground">—</span>;
  const classes = getRoleColorClasses(role.color);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        classes.bg,
        classes.text,
        classes.border
      )}
    >
      {role.name}
    </span>
  );
}

function RoleDropdown({
  member,
  roles,
  onChange,
}: {
  member: BrandTeamMember;
  roles: BrandTeamRole[];
  onChange: (roleId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = member.role;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 hover:border-border"
      >
        <RoleBadge role={current} />
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-full z-40 mt-1 w-56 rounded-lg border border-border bg-popover p-1 shadow-lift">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (r.id !== current?.id) onChange(r.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10",
                  r.id === current?.id && "bg-accent/10"
                )}
              >
                <RoleBadge role={r} />
                {r.id === current?.id && (
                  <Check className="size-3.5 text-accent" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ======================================================
// ADD MEMBER MODAL — smart (direct add OR invite)
// ======================================================

function AddMemberModal({
  roles,
  onClose,
  onAdded,
  onInvited,
}: {
  roles: BrandTeamRole[];
  onClose: () => void;
  onAdded: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Result states
  const [result, setResult] = useState<
    | { type: "ADDED"; email: string; roleName: string }
    | { type: "INVITED"; email: string; link: string; roleName: string }
    | null
  >(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Email is required");
    if (!roleId) return setError("Please select a role");

    setSaving(true);
    try {
      const res = await brandTeamApi.directAddMember(
        email.trim(),
        roleId,
        message.trim() || undefined
      );

      const selectedRole = roles.find((r) => r.id === roleId);

      if (res.type === "ADDED") {
        setResult({
          type: "ADDED",
          email: email.trim(),
          roleName: selectedRole?.name ?? "member",
        });
      } else if (res.type === "INVITED") {
        const link = `${window.location.origin}${res.invitation.inviteUrl}`;
        setResult({
          type: "INVITED",
          email: email.trim(),
          link,
          roleName: selectedRole?.name ?? "member",
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to add member");
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!result || result.type !== "INVITED") return;
    await navigator.clipboard.writeText(result.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ======================================================
  // RESULT: ADDED
  // ======================================================
  if (result?.type === "ADDED") {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-lift">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
            <Check className="size-7" />
          </div>
          <h2 className="mt-4 font-display text-xl font-medium">
            Member added
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <strong className="text-foreground">{result.email}</strong> has
            been added as{" "}
            <strong className="text-foreground">{result.roleName}</strong>.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            They can now log in and access the workspace with their assigned
            permissions.
          </p>
          <Button className="mt-6" onClick={onAdded}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  // ======================================================
  // RESULT: INVITED
  // ======================================================
  if (result?.type === "INVITED") {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lift">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-amber-500/15 text-amber-500">
            <Mail className="size-7" />
          </div>
          <h2 className="mt-4 text-center font-display text-xl font-medium">
            Invitation created
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            No account found for{" "}
            <strong className="text-foreground">{result.email}</strong>. Share
            this link with them:
          </p>

          <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                readOnly
                value={result.link}
                className="flex-1 truncate bg-transparent text-xs outline-none"
              />
              <Button size="sm" onClick={copyLink}>
                {copied ? <Check className="size-3.5" /> : "Copy"}
              </Button>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            They must log in with <strong>{result.email}</strong> to accept.
            Link expires in 7 days. Role:{" "}
            <strong>{result.roleName}</strong>.
          </p>

          <div className="mt-6 flex justify-end">
            <Button onClick={onInvited}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // FORM
  // ======================================================
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lift"
      >
        <h2 className="font-display text-xl font-medium">Add member</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          If they already have an account, they'll be added instantly. Otherwise
          we'll generate an invite link.
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="memberEmail">Email *</Label>
            <Input
              id="memberEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Role *</Label>
            <div className="grid gap-2">
              {roles.map((r) => {
                const active = roleId === r.id;
                const classes = getRoleColorClasses(r.color);
                return (
                  <label
                    key={r.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      active
                        ? classes.border + " " + classes.bg
                        : "border-border hover:bg-accent/5"
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.id}
                      checked={active}
                      onChange={() => setRoleId(r.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn("text-sm font-medium", classes.text)}
                        >
                          {r.name}
                        </span>
                        {r.isOwnerRole && (
                          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                            Owner
                          </span>
                        )}
                      </div>
                      {r.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {r.description}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {r.permissions.length} permissions
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberMsg">Message (optional)</Label>
            <textarea
              id="memberMsg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Welcome to our team…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add member"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ======================================================
// APPROVE REQUEST MODAL
// ======================================================

function ApproveRequestModal({
  request,
  roles,
  onClose,
  onApprove,
}: {
  request: JoinRequest;
  roles: BrandTeamRole[];
  onClose: () => void;
  onApprove: (roleId: string) => void;
}) {
  const defaultRoleId =
    request.requestedRole?.id ??
    roles.find((r) => !r.isOwnerRole)?.id ??
    roles[0]?.id ??
    "";
  const [roleId, setRoleId] = useState(defaultRoleId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleApprove() {
    if (!roleId) {
      setError("Please select a role");
      return;
    }
    setSaving(true);
    try {
      await onApprove(roleId);
    } catch (err: any) {
      setError(err?.message || "Approve failed");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lift">
        <h2 className="font-display text-xl font-medium">Approve request</h2>

        <div className="mt-5 flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-medium text-accent">
            {request.user?.name.slice(0, 2).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{request.user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {request.user?.email}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label>Assign role *</Label>
          <div className="grid gap-2">
            {roles.map((r) => {
              const active = roleId === r.id;
              const classes = getRoleColorClasses(r.color);
              return (
                <label
                  key={r.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    active
                      ? classes.border + " " + classes.bg
                      : "border-border hover:bg-accent/5"
                  )}
                >
                  <input
                    type="radio"
                    name="approveRole"
                    value={r.id}
                    checked={active}
                    onChange={() => setRoleId(r.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn("text-sm font-medium", classes.text)}
                    >
                      {r.name}
                    </span>
                    {r.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={saving || !roleId}>
            {saving ? "Approving…" : "Approve with this role"}
          </Button>
        </div>
      </div>
    </div>
  );
}