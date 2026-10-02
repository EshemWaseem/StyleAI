export function OfferStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PENDING_ADMIN: "bg-amber-500/15 text-amber-500",
    ADMIN_APPROVED: "bg-blue-500/15 text-blue-500",
    ADMIN_REJECTED: "bg-destructive/15 text-destructive",
    INFLUENCER_ACCEPTED: "bg-emerald-500/15 text-emerald-500",
    INFLUENCER_DECLINED: "bg-destructive/15 text-destructive",
    EXPIRED: "bg-muted text-muted-foreground",
    CANCELLED: "bg-muted text-muted-foreground",
  };

  // Clearer labels — no "ADMIN APPROVED" confusion for brands
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_ADMIN: "Pending review",
    ADMIN_APPROVED: "Sent to influencer",   // ← renamed
    ADMIN_REJECTED: "Rejected",
    INFLUENCER_ACCEPTED: "Accepted",
    INFLUENCER_DECLINED: "Declined",
    EXPIRED: "Expired",
    CANCELLED: "Cancelled",
  };

  const label = labels[status] || status.replace(/_/g, " ");

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
        styles[status] || "bg-muted"
      }`}
    >
      {label}
    </span>
  );
}