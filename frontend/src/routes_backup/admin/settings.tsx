import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Save, Sliders } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { settingsApi, type PlatformSettings } from "@/lib/admin/finance";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Admin · Settings — StyleAI" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({});
  const [edited, setEdited] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    settingsApi.getAll()
      .then((r) => setSettings(r.settings))
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  function update(category: string, key: string, value: any) {
    setEdited((prev) => ({ ...prev, [key]: { value, category } }));
  }

  async function save() {
    if (Object.keys(edited).length === 0) return;
    setSaving(true);
    setError("");
    setOk("");
    try {
      await settingsApi.update(edited);
      setEdited({});
      setOk("Settings saved");
      setTimeout(() => setOk(""), 2500);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute roles={["SUPER_ADMIN"]}>
      <AppShell breadcrumb={["Admin", "Settings"]}>
        <PageHeader
          eyebrow="Super admin"
          title="Platform settings"
          description="Live configuration for limits and feature flags. Changes apply immediately."
        />

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {ok && (
          <div className="mt-6 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            {ok}
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex items-center justify-center">
            <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : (
          <>
            <Panel className="mt-8">
              <SectionTitle
                title="Limits"
                description="Numeric caps enforced across the platform."
                action={<Sliders className="size-4 text-muted-foreground" />}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(settings.limits || {}).map(([key, value]) => (
                  <SettingField
                    key={key} category="limits" settingKey={key}
                    value={edited[key]?.value ?? value}
                    onChange={(v) => update("limits", key, v)}
                    type="number"
                  />
                ))}
              </div>
            </Panel>

            <Panel className="mt-6">
              <SectionTitle
                title="Feature flags"
                description="Toggle platform capabilities on or off."
              />
              <div className="space-y-3">
                {Object.entries(settings.features || {}).map(([key, value]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/5"
                  >
                    <div>
                      <p className="text-sm font-medium">{key.replace(/([A-Z])/g, " $1").replace(/^enable /i, "")}</p>
                      <p className="text-xs text-muted-foreground">{key}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!(edited[key]?.value ?? value)}
                      onChange={(e) => update("features", key, e.target.checked)}
                      className="size-4"
                    />
                  </label>
                ))}
              </div>
            </Panel>

            <div className="mt-6 flex justify-end">
              <Button onClick={save} disabled={saving || Object.keys(edited).length === 0}>
                {saving ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="mr-2 size-4" /> Save changes</>
                )}
              </Button>
            </div>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

function SettingField({
  settingKey, value, onChange, type = "text",
}: {
  settingKey: string;
  value: any;
  onChange: (v: any) => void;
  type?: string;
  category: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {settingKey.replace(/([A-Z])/g, " $1").trim()}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums"
      />
    </div>
  );
}