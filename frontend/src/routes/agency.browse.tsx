// routes/agency.browse.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle, Loader2, Search, Star,
  Briefcase, Camera, Globe, Video, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/ui-kit";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { agencyApi } from "@/lib/agency";
import type { AgencyProfileWithOrg, AgencyServiceType } from "@/lib/agency/types";
import {
  AGENCY_SERVICE_LABELS,
  BRAND_SERVICE_TYPES,
  INFLUENCER_SERVICE_TYPES,
} from "@/lib/agency/types";
import { useRole } from "@/lib/role";
import { HireAgencyModal } from "@/components/agency/HireAgencyModal";
import { swalSuccess } from "@/lib/swal";

export const Route = createFileRoute("/agency/browse")({
  head: () => ({ meta: [{ title: "Browse agencies — StyleAI" }] }),
  component: BrowseAgenciesPage,
});

function BrowseAgenciesPage() {
  const { user } = useRole();
  const [agencies, setAgencies] = useState<AgencyProfileWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceType, setServiceType] = useState<AgencyServiceType | "">("");
  const [search, setSearch] = useState("");
  const [hireState, setHireState] = useState<{
    agency: AgencyProfileWithOrg;
    serviceType: AgencyServiceType;
  } | null>(null);

  const roles = user?.roles ?? [];
  const isInfluencer = roles.includes("INFLUENCER");
  const isBrandSide =
    roles.includes("BRAND_OWNER") || roles.includes("BRAND_TEAM_MEMBER");
  const isAdmin = roles.includes("SUPER_ADMIN");

  const serviceGroup: "BRAND" | "INFLUENCER" | undefined = isInfluencer
    ? "INFLUENCER"
    : isBrandSide
    ? "BRAND"
    : undefined;

  const availableServices: AgencyServiceType[] = isInfluencer
    ? INFLUENCER_SERVICE_TYPES
    : isBrandSide
    ? BRAND_SERVICE_TYPES
    : [...BRAND_SERVICE_TYPES, ...INFLUENCER_SERVICE_TYPES];

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await agencyApi.browse({
        serviceType: serviceType || undefined,
        serviceGroup,
        limit: 100,
      });
      setAgencies(res.agencies || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load agencies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType]);

  const filtered = agencies.filter((a) => {
    const hasMatch = (a.serviceTypes || []).some((s) =>
      availableServices.includes(s)
    );
    if (!hasMatch) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (a.displayName || a.organization?.name || "").toLowerCase();
    const tagline = (a.tagline || "").toLowerCase();
    return name.includes(q) || tagline.includes(q);
  });

  return (
    <ProtectedRoute>
      <PageHeader
        eyebrow="Discover"
        title="Browse agencies"
        description={
          isInfluencer
            ? "Hire agencies for photoshoots & videography."
            : isBrandSide
            ? "Hire agencies for system management, websites, and campaigns."
            : "Agencies offering brand-side and influencer-side services."
        }
      />

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm sm:w-80">
          <Search className="size-4 text-muted-foreground" />
          <input
            placeholder="Search agencies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setServiceType("")}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            serviceType === ""
              ? "border-accent bg-accent/10 text-accent"
              : "border-border hover:bg-muted"
          }`}
        >
          All services
        </button>
        {availableServices.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setServiceType(s)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              serviceType === s
                ? "border-accent bg-accent/10 text-accent"
                : "border-border hover:bg-muted"
            }`}
          >
            {AGENCY_SERVICE_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-12 flex items-center justify-center">
          <Loader2 className="mr-2 size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading agencies…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
          <Briefcase className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No agencies found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isBrandSide
              ? "No agencies currently offering brand-side services. Check back later."
              : isInfluencer
              ? "No agencies currently offering photoshoot or videography services."
              : "Try a different service category or check back later."}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "agency" : "agencies"}
          </p>
          <section className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <AgencyCard
                key={a.id}
                agency={a}
                availableServices={availableServices}
                canHire={!!user && (isInfluencer || isBrandSide)}
                onHire={(service) => setHireState({ agency: a, serviceType: service })}
              />
            ))}
          </section>
        </>
      )}

      {hireState && (
        <HireAgencyModal
          agency={hireState.agency}
          serviceType={hireState.serviceType}
          onClose={() => setHireState(null)}
          onCreated={() => {
            setHireState(null);
            swalSuccess("Request sent!", "Check your engagements page.");
          }}
        />
      )}
    </ProtectedRoute>
  );
}

function AgencyCard({
  agency, availableServices, canHire, onHire,
}: {
  agency: AgencyProfileWithOrg;
  availableServices: AgencyServiceType[];
  canHire: boolean;
  onHire: (service: AgencyServiceType) => void;
}) {
  const name = agency.displayName || agency.organization?.name || "Agency";
  const matchingServices = (agency.serviceTypes || []).filter((s) =>
    availableServices.includes(s)
  );

  const serviceIcons: Record<string, any> = {
    BRAND_SYSTEM_MANAGEMENT: Briefcase,
    BRAND_WEBSITE: Globe,
    BRAND_CAMPAIGN_OPS: Sparkles,
    INFLUENCER_PHOTOSHOOT: Camera,
    INFLUENCER_VIDEOGRAPHY: Video,
  };

  return (
    <Panel className="flex flex-col overflow-hidden p-5">
      <div className="flex items-start gap-3">
        {agency.logoUrl ? (
          <img
            src={agency.logoUrl}
            alt={name}
            className="size-12 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent/15 text-base font-semibold uppercase text-accent">
            {name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{name}</p>
            {agency.verified && (
              <Star className="size-3 shrink-0 fill-amber-500 text-amber-500" />
            )}
          </div>
          {agency.organization?.slug && (
            <p className="truncate text-xs text-muted-foreground">
              @{agency.organization.slug}
            </p>
          )}
        </div>
      </div>

      {agency.tagline && (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
          {agency.tagline}
        </p>
      )}

      {matchingServices.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {matchingServices.slice(0, 3).map((s) => {
            const Icon = serviceIcons[s];
            return (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase text-accent"
              >
                {Icon && <Icon className="size-3" />}
                {AGENCY_SERVICE_LABELS[s]}
              </span>
            );
          })}
          {matchingServices.length > 3 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              +{matchingServices.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 space-y-1 text-xs">
        {agency.monthlyRetainer != null && (
          <Row
            label="Monthly retainer"
            value={`${agency.currency} ${agency.monthlyRetainer.toLocaleString()}`}
          />
        )}
        {agency.hourlyRate != null && (
          <Row
            label="Hourly"
            value={`${agency.currency} ${agency.hourlyRate.toLocaleString()}`}
          />
        )}
        {agency.photoshootRate != null && (
          <Row
            label="Photoshoot"
            value={`${agency.currency} ${agency.photoshootRate.toLocaleString()}`}
          />
        )}
        {agency.videographyRate != null && (
          <Row
            label="Videography"
            value={`${agency.currency} ${agency.videographyRate.toLocaleString()}`}
          />
        )}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {canHire && matchingServices.length > 0 ? (
          <Button
            size="sm"
            onClick={() => onHire(matchingServices[0])}
            className="w-full"
          >
            <Sparkles className="mr-1.5 size-3.5" /> Hire agency
          </Button>
        ) : !agency.isAcceptingNew ? (
          <p className="text-center text-xs text-muted-foreground">
            Not accepting new work
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}