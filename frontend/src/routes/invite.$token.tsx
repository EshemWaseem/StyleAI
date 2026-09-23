import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, Clock, Mail, AlertCircle, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/utils";
import { invitationsApi, type Invitation } from "@/lib/invitations";
import { getRoleColorClasses } from "@/lib/brand-team";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Invitation — StyleAI" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { user, loading: authLoading } = useRole();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    invitationsApi
      .getByToken(token)
      .then((res) => setInvitation(res.invitation))
      .catch((err) => setError(err?.message || "Invitation not found"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!user) {
      localStorage.setItem("postLoginRedirect", `/invite/${token}`);
      navigate({ to: "/login" });
      return;
    }
    setActionLoading(true);
    try {
      await invitationsApi.accept(token);
      setDone("accepted");
    } catch (err: any) {
      setError(err?.message || "Failed to accept invitation");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDecline() {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setActionLoading(true);
    try {
      await invitationsApi.decline(token);
      setDone("declined");
    } catch (err: any) {
      setError(err?.message || "Failed to decline invitation");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading invitation…</p>
      </div>
    );
  }

  if (done === "accepted") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
            <Check className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
            Welcome to {invitation?.brand?.name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            You've joined the team. Your workspace is ready.
          </p>
          <Button onClick={() => navigate({ to: "/dashboard" })} className="mt-6">
            Go to dashboard <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
            <X className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
            Invitation declined
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            You can browse the storefront if you'd like.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/" })}
            className="mt-6"
          >
            Go to storefront
          </Button>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
            Invitation unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {error || "This invitation link is invalid or has expired."}
          </p>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/" })}
            className="mt-6"
          >
            Go to storefront
          </Button>
        </div>
      </div>
    );
  }

  const expired =
    invitation.status === "PENDING" &&
    new Date(invitation.expiresAt) < new Date();

  const isPending = invitation.status === "PENDING" && !expired;
  const isWrongUser =
    user && user.email.toLowerCase() !== invitation.email.toLowerCase();
  const roleColor = getRoleColorClasses(invitation.teamRole?.color ?? "zinc");

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-display text-sm">
            S
          </span>
          <span className="font-display text-[15px]">StyleAI</span>
        </Link>

        <div className="mt-10 grid size-12 place-items-center rounded-full bg-accent/15 text-accent">
          <Mail className="size-6" />
        </div>

        <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
          You're invited
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {invitation.invitedBy?.name} invited you to join
        </p>
        <p className="mt-1 font-display text-2xl font-medium">
          {invitation.brand?.name}
        </p>

        {/* ROLE — prominent display */}
        {invitation.teamRole && (
          <div
            className={cn(
              "mt-6 flex items-center gap-3 rounded-lg border p-4",
              roleColor.bg,
              roleColor.border
            )}
          >
            <div className={cn("grid size-10 place-items-center rounded-full", roleColor.bg)}>
              <Shield className={cn("size-5", roleColor.text)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Your role
              </p>
              <p className={cn("mt-0.5 font-display text-lg font-medium", roleColor.text)}>
                {invitation.teamRole.name}
              </p>
            </div>
          </div>
        )}

        {invitation.message && (
          <div className="mt-4 rounded-md border border-border bg-card p-4 text-sm italic text-muted-foreground">
            "{invitation.message}"
          </div>
        )}

        <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p>
            <strong>Invited email:</strong> {invitation.email}
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            <Clock className="size-3" />
            Expires {new Date(invitation.expiresAt).toLocaleDateString()}
          </p>
        </div>

        {!isPending && (
          <div className="mt-6 rounded-md border border-border bg-card p-4 text-sm">
            <p className="text-muted-foreground">
              This invitation is{" "}
              <strong className="text-foreground">
                {invitation.status.toLowerCase()}
              </strong>
              .
            </p>
          </div>
        )}

        {isPending && isWrongUser && (
          <div className="mt-6 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
            <p className="font-medium">Wrong email</p>
            <p className="mt-1 text-xs">
              You're logged in as <strong>{user?.email}</strong>. This invite was sent to{" "}
              <strong>{invitation.email}</strong>.
            </p>
          </div>
        )}

        {isPending && (
          <div className="mt-8 space-y-2">
            {!user ? (
              <>
                <Button onClick={handleAccept} className="w-full">
                  Sign in to accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/register" })}
                  className="w-full"
                >
                  Create account
                </Button>
              </>
            ) : isWrongUser ? (
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.setItem("postLoginRedirect", `/invite/${token}`);
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  window.location.href = "/login";
                }}
                className="w-full"
              >
                Sign in with different email
              </Button>
            ) : (
              <>
                <Button onClick={handleAccept} disabled={actionLoading} className="w-full">
                  <Check className="size-4" />
                  {actionLoading ? "Accepting…" : "Accept invitation"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={actionLoading}
                  className="w-full"
                >
                  <X className="size-4" /> Decline
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}





// import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
// import { useEffect, useState } from "react";
// import { Check, X, Clock, Mail, AlertCircle, ArrowRight } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useRole } from "@/lib/role";
// import { invitationsApi, type Invitation } from "@/lib/invitations";

// export const Route = createFileRoute("/invite/$token")({
//   head: () => ({
//     meta: [{ title: "Invitation — StyleAI" }],
//   }),
//   component: InvitePage,
// });

// function InvitePage() {
//   const { token } = Route.useParams();
//   const { user, loading: authLoading, login } = useRole();
//   const navigate = useNavigate();

//   const [invitation, setInvitation] = useState<Invitation | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [actionLoading, setActionLoading] = useState(false);
//   const [done, setDone] = useState<"accepted" | "declined" | null>(null);

//   // Fetch invite (public)
//   useEffect(() => {
//     invitationsApi
//       .getByToken(token)
//       .then((res) => setInvitation(res.invitation))
//       .catch((err) => setError(err?.message || "Invitation not found"))
//       .finally(() => setLoading(false));
//   }, [token]);

//   async function handleAccept() {
//     if (!user) {
//       // Not logged in → go to login, come back after
//       localStorage.setItem("postLoginRedirect", `/invite/${token}`);
//       navigate({ to: "/login" });
//       return;
//     }
//     setActionLoading(true);
//     try {
//       await invitationsApi.accept(token);
//       setDone("accepted");
//     } catch (err: any) {
//       setError(err?.message || "Failed to accept invitation");
//     } finally {
//       setActionLoading(false);
//     }
//   }

//   async function handleDecline() {
//     if (!user) {
//       navigate({ to: "/login" });
//       return;
//     }
//     setActionLoading(true);
//     try {
//       await invitationsApi.decline(token);
//       setDone("declined");
//     } catch (err: any) {
//       setError(err?.message || "Failed to decline invitation");
//     } finally {
//       setActionLoading(false);
//     }
//   }

//   // ------------------------------------------------------
//   // Loading
//   // ------------------------------------------------------
//   if (loading || authLoading) {
//     return (
//       <div className="grid min-h-screen place-items-center bg-background text-foreground">
//         <p className="text-sm text-muted-foreground">Loading invitation…</p>
//       </div>
//     );
//   }

//   // ------------------------------------------------------
//   // Success — accepted
//   // ------------------------------------------------------
//   if (done === "accepted") {
//     return (
//       <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
//         <div className="w-full max-w-md text-center">
//           <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
//             <Check className="size-7" />
//           </div>
//           <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
//             Welcome to {invitation?.brand?.name}
//           </h1>
//           <p className="mt-3 text-sm leading-6 text-muted-foreground">
//             You've joined the team. Your workspace is ready.
//           </p>
//           <Button
//             onClick={() => navigate({ to: "/dashboard" })}
//             className="mt-6"
//           >
//             Go to dashboard <ArrowRight className="size-4" />
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   // ------------------------------------------------------
//   // Success — declined
//   // ------------------------------------------------------
//   if (done === "declined") {
//     return (
//       <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
//         <div className="w-full max-w-md text-center">
//           <div className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
//             <X className="size-7" />
//           </div>
//           <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
//             Invitation declined
//           </h1>
//           <p className="mt-3 text-sm leading-6 text-muted-foreground">
//             You can browse the storefront if you'd like.
//           </p>
//           <Button
//             variant="outline"
//             onClick={() => navigate({ to: "/" })}
//             className="mt-6"
//           >
//             Go to storefront
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   // ------------------------------------------------------
//   // Error — invalid / expired
//   // ------------------------------------------------------
//   if (error || !invitation) {
//     return (
//       <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
//         <div className="w-full max-w-md text-center">
//           <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/15 text-destructive">
//             <AlertCircle className="size-7" />
//           </div>
//           <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
//             Invitation unavailable
//           </h1>
//           <p className="mt-3 text-sm leading-6 text-muted-foreground">
//             {error || "This invitation link is invalid or has expired."}
//           </p>
//           <Button
//             variant="outline"
//             onClick={() => navigate({ to: "/" })}
//             className="mt-6"
//           >
//             Go to storefront
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   // ------------------------------------------------------
//   // Main invitation view
//   // ------------------------------------------------------
//   const expired =
//     invitation.status === "PENDING" &&
//     new Date(invitation.expiresAt) < new Date();

//   const isPending = invitation.status === "PENDING" && !expired;
//   const isWrongUser =
//     user && user.email.toLowerCase() !== invitation.email.toLowerCase();
//   const canAct = isPending && !!user && !isWrongUser;

//   return (
//     <div className="grid min-h-screen place-items-center bg-background px-4 py-16 text-foreground">
//       <div className="w-full max-w-md">
//         <Link to="/" className="flex items-center gap-2.5">
//           <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-display text-sm">
//             S
//           </span>
//           <span className="font-display text-[15px]">StyleAI</span>
//         </Link>

//         <div className="mt-10 grid size-12 place-items-center rounded-full bg-accent/15 text-accent">
//           <Mail className="size-6" />
//         </div>

//         <h1 className="mt-6 font-display text-3xl font-medium tracking-tight">
//           You're invited
//         </h1>
//         <p className="mt-2 text-sm text-muted-foreground">
//           {invitation.invitedBy?.name} invited you to join
//         </p>
//         <p className="mt-1 font-display text-2xl font-medium">
//           {invitation.brand?.name}
//         </p>

//         {invitation.message && (
//           <div className="mt-6 rounded-md border border-border bg-card p-4 text-sm italic text-muted-foreground">
//             "{invitation.message}"
//           </div>
//         )}

//         <div className="mt-6 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
//           <p>
//             <strong>Invited email:</strong> {invitation.email}
//           </p>
//           <p className="mt-1 flex items-center gap-1.5">
//             <Clock className="size-3" />
//             Expires {new Date(invitation.expiresAt).toLocaleDateString()}
//           </p>
//         </div>

//         {/* ------------------------------------------------------ */}
//         {/* Status: not pending */}
//         {/* ------------------------------------------------------ */}
//         {!isPending && (
//           <div className="mt-6 rounded-md border border-border bg-card p-4 text-sm">
//             <p className="text-muted-foreground">
//               This invitation is{" "}
//               <strong className="text-foreground">
//                 {invitation.status.toLowerCase()}
//               </strong>
//               .
//             </p>
//           </div>
//         )}

//         {/* ------------------------------------------------------ */}
//         {/* Wrong user */}
//         {/* ------------------------------------------------------ */}
//         {isPending && isWrongUser && (
//           <div className="mt-6 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
//             <p className="font-medium">Wrong email</p>
//             <p className="mt-1 text-xs">
//               You're logged in as <strong>{user?.email}</strong>. This invite
//               was sent to <strong>{invitation.email}</strong>. Please log in
//               with that email to accept.
//             </p>
//           </div>
//         )}

//         {/* ------------------------------------------------------ */}
//         {/* Actions */}
//         {/* ------------------------------------------------------ */}
//         {isPending && (
//           <div className="mt-8 space-y-2">
//             {!user ? (
//               <>
//                 <Button onClick={handleAccept} className="w-full">
//                   Sign in to accept
//                 </Button>
//                 <Button
//                   variant="outline"
//                   onClick={() => navigate({ to: "/register" })}
//                   className="w-full"
//                 >
//                   Create account
//                 </Button>
//               </>
//             ) : isWrongUser ? (
//               <Button
//                 variant="outline"
//                 onClick={() => {
//                   localStorage.setItem(
//                     "postLoginRedirect",
//                     `/invite/${token}`
//                   );
//                   // Log out and re-login
//                   localStorage.removeItem("token");
//                   localStorage.removeItem("user");
//                   window.location.href = "/login";
//                 }}
//                 className="w-full"
//               >
//                 Sign in with different email
//               </Button>
//             ) : (
//               <>
//                 <Button
//                   onClick={handleAccept}
//                   disabled={actionLoading}
//                   className="w-full"
//                 >
//                   <Check className="size-4" />
//                   {actionLoading ? "Accepting…" : "Accept invitation"}
//                 </Button>
//                 <Button
//                   variant="outline"
//                   onClick={handleDecline}
//                   disabled={actionLoading}
//                   className="w-full"
//                 >
//                   <X className="size-4" /> Decline
//                 </Button>
//               </>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }