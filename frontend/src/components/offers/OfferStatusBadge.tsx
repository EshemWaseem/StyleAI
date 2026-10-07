export function OfferStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PENDING: "bg-amber-500/15 text-amber-500",
    IN_PROGRESS: "bg-blue-500/15 text-blue-500",
    COMPLETED: "bg-emerald-500/15 text-emerald-500",
    DECLINED: "bg-destructive/15 text-destructive",
    EXPIRED: "bg-muted text-muted-foreground",
    CANCELLED: "bg-muted text-muted-foreground",
  };

  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING: "Pending",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    DECLINED: "Declined",
    EXPIRED: "Expired",
    CANCELLED: "Cancelled",
  };

  const style = styles[status] || styles.CANCELLED;
  const label = labels[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style}`}
    >
      {label}
    </span>
  );
}