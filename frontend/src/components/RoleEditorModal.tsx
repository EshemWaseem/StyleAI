import { useEffect, useState } from "react";
import { X, Check, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  brandTeamApi,
  type BrandTeamRole,
  type PermissionCatalog,
  type RoleInput,
} from "@/lib/brand-team";

interface Props {
  mode: "create" | "edit";
  role?: BrandTeamRole | null;
  onClose: () => void;
  onSaved: (role: BrandTeamRole) => void;
}

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue" },
  { value: "emerald", label: "Emerald" },
  { value: "amber", label: "Amber" },
  { value: "violet", label: "Violet" },
  { value: "pink", label: "Pink" },
  { value: "red", label: "Red" },
  { value: "zinc", label: "Neutral" },
];

const COLOR_DOT: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  pink: "bg-pink-500",
  red: "bg-red-500",
  zinc: "bg-zinc-500",
};

export function RoleEditorModal({ mode, role = null, onClose, onSaved }: Props) {
  const isEdit = mode === "edit";

  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [color, setColor] = useState(role?.color ?? "zinc");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch permission catalog
  useEffect(() => {
    brandTeamApi
      .permissionCatalog()
      .then(setCatalog)
      .catch(() => setError("Could not load permission catalog"))
      .finally(() => setCatalogLoading(false));
  }, []);

  function togglePermission(key: string) {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  function toggleGroup(keys: string[], allOn: boolean) {
    setPermissions((prev) => {
      if (allOn) return prev.filter((p) => !keys.includes(p));
      const set = new Set(prev);
      keys.forEach((k) => set.add(k));
      return Array.from(set);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Role name is required");
    if (permissions.length === 0) return setError("Select at least one permission");

    setSaving(true);
    try {
      const payload: RoleInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        permissions,
        color,
      };

      const res =
        isEdit && role
          ? await brandTeamApi.updateRole(role.id, payload)
          : await brandTeamApi.createRole(payload);

      onSaved(res.role);
    } catch (err: any) {
      setError(err?.message || "Failed to save role");
      setSaving(false);
    }
  }

  const locked = isEdit && role?.isOwnerRole;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="my-8 w-full max-w-2xl rounded-xl border border-border bg-card shadow-lift"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-xl font-medium">
              {isEdit ? "Edit role" : "New role"}
            </h2>
            {isEdit && role?.isDefault && (
              <p className="mt-1 text-xs text-muted-foreground">
                Default role — edit anytime
              </p>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving}>
            <X />
          </Button>
        </div>

        {/* BODY */}
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {locked && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              <span>
                The Full Access role is required for the brand owner. You can edit its
                permissions but cannot rename or delete it.
              </span>
            </div>
          )}

          {/* NAME + COLOR */}
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role name *</Label>
              <Input
                id="roleName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Campaign Manager"
                disabled={locked}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-label={opt.label}
                    onClick={() => setColor(opt.value)}
                    className={cn(
                      "grid size-7 place-items-center rounded-full border-2 transition-all",
                      color === opt.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <span className={cn("size-4 rounded-full", COLOR_DOT[opt.value])} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <Label htmlFor="roleDesc">Description</Label>
            <textarea
              id="roleDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What this role is for…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* PERMISSIONS */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <Label className="text-sm">Permissions *</Label>
              <span className="text-xs text-muted-foreground">
                {permissions.length} selected
              </span>
            </div>

            {catalogLoading ? (
              <p className="text-sm text-muted-foreground">Loading permissions…</p>
            ) : catalog ? (
              <div className="space-y-4">
                {Object.entries(catalog.groups).map(([groupKey, group]) => {
                  const groupKeys = group.permissions.map((p) => p.key);
                  const allOn = groupKeys.every((k) => permissions.includes(k));
                  const someOn = !allOn && groupKeys.some((k) => permissions.includes(k));

                  return (
                    <div
                      key={groupKey}
                      className="rounded-lg border border-border bg-background/50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{group.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupKeys, allOn)}
                          className={cn(
                            "grid size-5 place-items-center rounded border transition-colors",
                            allOn
                              ? "border-accent bg-accent text-background"
                              : someOn
                              ? "border-accent/50 bg-accent/20"
                              : "border-border hover:border-accent/50"
                          )}
                          aria-label={`Toggle all ${group.label}`}
                        >
                          {allOn && <Check className="size-3" />}
                          {someOn && !allOn && <span className="block size-2 rounded-sm bg-accent" />}
                        </button>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.permissions.map((perm) => {
                          const active = permissions.includes(perm.key);
                          return (
                            <label
                              key={perm.key}
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                                active
                                  ? "border-accent/50 bg-accent/10"
                                  : "border-border hover:bg-accent/5"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => togglePermission(perm.key)}
                                className="size-3.5"
                              />
                              <span className={active ? "text-foreground" : "text-muted-foreground"}>
                                {perm.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create role"}
          </Button>
        </div>
      </form>
    </div>
  );
}