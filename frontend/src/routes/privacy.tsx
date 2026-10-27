import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Mail } from "lucide-react";

const COMPANY_NAME = "StyleAI";
const LAST_UPDATED = "January 15, 2026";
const EFFECTIVE_DATE = "January 15, 2026";
const SUPPORT_EMAIL = "support@styleai.com";
const PRIVACY_EMAIL = "privacy@styleai.com";
const SITE_URL = "https://styleai.com";

const SECTIONS = [
  { id: "introduction", num: "1", title: "Introduction" },
  { id: "information-we-collect", num: "2", title: "Information We Collect" },
  { id: "how-we-use", num: "3", title: "How We Use Your Information" },
  { id: "legal-bases", num: "4", title: "Legal Bases for Processing" },
  { id: "how-we-share", num: "5", title: "How We Share Your Information" },
  { id: "cookies", num: "6", title: "Cookies & Tracking" },
  { id: "retention", num: "7", title: "Data Retention & Deletion" },
  { id: "rights", num: "8", title: "Your Data Protection Rights" },
  { id: "security", num: "9", title: "Security" },
  { id: "transfers", num: "10", title: "International Data Transfers" },
  { id: "children", num: "11", title: "Children's Privacy" },
  { id: "changes", num: "12", title: "Changes to This Policy" },
  { id: "contact", num: "13", title: "Contact Us" },
] as const;

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — StyleAI" },
      {
        name: "description",
        content:
          "How StyleAI collects, uses, and protects your personal data. Read our full privacy policy covering data collection, cookies, retention, and your rights.",
      },
      { property: "og:title", content: "Privacy Policy — StyleAI" },
      {
        property: "og:description",
        content:
          "How StyleAI collects, uses, and protects your personal data.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/privacy` },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/privacy` }],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
            aria-label="StyleAI — back to home"
          >
            <span className="grid size-8 place-items-center rounded-md bg-foreground text-background">
              <span className="font-display text-sm leading-none">S</span>
            </span>
            <span className="font-display text-[15px] font-medium tracking-tight">
              StyleAI
            </span>
          </Link>

          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Legal · Privacy
          </p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated:{" "}
            <span className="text-foreground">{LAST_UPDATED}</span> · Effective:{" "}
            <span className="text-foreground">{EFFECTIVE_DATE}</span>
          </p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This Privacy Policy explains how {COMPANY_NAME} collects, uses, and
            protects your personal information when you use our platform and
            services.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-10">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              On this page
            </p>
            <nav aria-label="Table of contents" className="space-y-0.5">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                >
                  {s.num}. {s.title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
            <div className="space-y-10 text-sm leading-7 text-muted-foreground">
              <section id="introduction" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  1. Introduction
                </h2>
                <p className="mt-3">
                  Welcome to {COMPANY_NAME} ("we," "our," or "us"). This Privacy
                  Policy describes how we collect, use, disclose, and safeguard
                  your information when you use our platform — including our
                  website, dashboard, and services that help brands and agencies
                  manage influencer campaigns and run advertisements on
                  platforms such as Meta (Facebook, Instagram), Google, and
                  TikTok.
                </p>
                <p className="mt-3">
                  By using our services, you agree to the collection and use of
                  information in accordance with this policy. If you do not
                  agree, please do not use our services.
                </p>
              </section>

              <section id="information-we-collect" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  2. Information We Collect
                </h2>
                <p className="mt-3">
                  We collect several types of information to provide and improve
                  our services:
                </p>
                <ul className="mt-4 space-y-3">
                  <li className="rounded-lg border border-border bg-background/40 p-4">
                    <strong className="text-foreground">
                      Account Information
                    </strong>
                    <p className="mt-1">
                      Name, email address, phone number, organization details,
                      and role information provided during registration.
                    </p>
                  </li>
                  <li className="rounded-lg border border-border bg-background/40 p-4">
                    <strong className="text-foreground">
                      Social Media & Ad Account Data
                    </strong>
                    <p className="mt-1">
                      When you connect your Meta, Google, or TikTok accounts, we
                      collect access tokens, ad account IDs, and campaign
                      performance data (impressions, clicks, spend, conversions)
                      to operate the services you request.
                    </p>
                  </li>
                  <li className="rounded-lg border border-border bg-background/40 p-4">
                    <strong className="text-foreground">
                      Content & Deliverables
                    </strong>
                    <p className="mt-1">
                      Campaign briefs, creative assets, product information, and
                      other materials you upload or create through the platform.
                    </p>
                  </li>
                  <li className="rounded-lg border border-border bg-background/40 p-4">
                    <strong className="text-foreground">Usage Data</strong>
                    <p className="mt-1">
                      IP address, browser type, device information, pages
                      visited, and interaction patterns with our platform.
                    </p>
                  </li>
                  <li className="rounded-lg border border-border bg-background/40 p-4">
                    <strong className="text-foreground">
                      Payment Information
                    </strong>
                    <p className="mt-1">
                      Billing details are processed by our payment partners. We
                      do not store full card numbers on our servers.
                    </p>
                  </li>
                </ul>
              </section>

              <section id="how-we-use" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  3. How We Use Your Information
                </h2>
                <p className="mt-3">
                  We use the collected information for the following purposes:
                </p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5">
                  <li>To create and manage your account.</li>
                  <li>
                    To connect to your Meta, Google, and other ad accounts and
                    to create, manage, and analyze advertising campaigns on your
                    behalf.
                  </li>
                  <li>
                    To match brands with creators and to operate the
                    influencer-marketing features of the platform.
                  </li>
                  <li>
                    To communicate with you about your account, campaigns, and
                    platform updates.
                  </li>
                  <li>
                    To improve our services, develop new features, and detect
                    fraud or abuse.
                  </li>
                  <li>To comply with our legal obligations.</li>
                </ul>
              </section>

              <section id="legal-bases" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  4. Legal Bases for Processing (EEA / UK)
                </h2>
                <p className="mt-3">
                  If you are located in the European Economic Area or the United
                  Kingdom, we process your personal data on the following legal
                  bases under the GDPR / UK GDPR:
                </p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5">
                  <li>
                    <strong className="text-foreground">Contract</strong> — to
                    provide the services you have signed up for.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Legitimate interests
                    </strong>{" "}
                    — to improve our services, prevent fraud, and keep the
                    platform secure.
                  </li>
                  <li>
                    <strong className="text-foreground">Consent</strong> — for
                    marketing communications and non-essential cookies, where
                    required.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Legal obligation
                    </strong>{" "}
                    — to comply with applicable law.
                  </li>
                </ul>
              </section>

              <section id="how-we-share" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  5. How We Share Your Information
                </h2>
                <p className="mt-3">
                  We do not sell your personal information. We may share it with
                  the following categories of recipients, only to the extent
                  necessary to provide the services you request, and as required
                  by law:
                </p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5">
                  <li>
                    <strong className="text-foreground">Ad platforms</strong> —
                    Meta, Google, TikTok, and similar providers when you connect
                    an ad account or run campaigns.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Infrastructure and service providers
                    </strong>{" "}
                    — hosting, database, email delivery, payments, and analytics
                    vendors bound by data-processing agreements.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Professional advisors
                    </strong>{" "}
                    — lawyers, auditors, and insurers where necessary.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Authorities and legal successors
                    </strong>{" "}
                    — when required by law or in connection with a merger,
                    acquisition, or sale of assets.
                  </li>
                </ul>
              </section>

              <section id="cookies" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  6. Cookies & Tracking
                </h2>
                <p className="mt-3">
                  We use cookies and similar technologies to keep you signed in,
                  remember your preferences, and understand how the platform is
                  used. You can control non-essential cookies from your browser
                  settings and, where applicable, from our cookie banner. Turning
                  off essential cookies may break the login flow.
                </p>
              </section>

              <section id="retention" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  7. Data Retention & Deletion
                </h2>
                <p className="mt-3">
                  We retain your personal information for as long as your account
                  is active or as needed to provide you services. When you close
                  your account, we delete or anonymize your data within 30 days,
                  unless we are required to keep it for legal, tax, or
                  fraud-prevention reasons.
                </p>
                <p className="mt-3">
                  To request deletion of your account or data, email{" "}
                  <a
                    href={`mailto:${PRIVACY_EMAIL}`}
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    {PRIVACY_EMAIL}
                  </a>
                  .
                </p>
              </section>

              <section id="rights" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  8. Your Data Protection Rights
                </h2>
                <p className="mt-3">
                  Depending on your location, you may have the right to:
                </p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5">
                  <li>Access the personal data we hold about you.</li>
                  <li>Correct inaccurate or incomplete data.</li>
                  <li>Request deletion of your data.</li>
                  <li>Object to or restrict certain processing.</li>
                  <li>Receive a portable copy of your data.</li>
                  <li>
                    Withdraw consent at any time, where processing is based on
                    consent.
                  </li>
                  <li>
                    Lodge a complaint with your local data-protection authority.
                  </li>
                </ul>
                <p className="mt-3">
                  To exercise any of these rights, contact us at{" "}
                  <a
                    href={`mailto:${PRIVACY_EMAIL}`}
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    {PRIVACY_EMAIL}
                  </a>
                  . We respond within 30 days.
                </p>
              </section>

              <section id="security" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  9. Security
                </h2>
                <p className="mt-3">
                  We use industry-standard safeguards — encryption in transit,
                  encryption at rest for sensitive fields, role-based access
                  controls, audit logging, and least-privilege IAM — to protect
                  your information. No method of transmission or storage is 100%
                  secure, so we cannot guarantee absolute security.
                </p>
              </section>

              <section id="transfers" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  10. International Data Transfers
                </h2>
                <p className="mt-3">
                  We may process and store your information in countries other
                  than your own. Where we transfer data out of the EEA or UK, we
                  rely on appropriate safeguards — such as Standard Contractual
                  Clauses approved by the European Commission — and require our
                  sub-processors to do the same.
                </p>
              </section>

              <section id="children" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  11. Children's Privacy
                </h2>
                <p className="mt-3">
                  Our services are not directed to children under 16. We do not
                  knowingly collect personal information from children. If you
                  believe a child has provided us with personal data, please
                  contact us and we will delete it promptly.
                </p>
              </section>

              <section id="changes" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  12. Changes to This Privacy Policy
                </h2>
                <p className="mt-3">
                  We may update this Privacy Policy from time to time. When we
                  make material changes, we will notify you by email or by a
                  prominent notice on the platform before the changes take
                  effect. The "Last updated" date at the top of this page
                  reflects the most recent revision.
                </p>
              </section>

              <section id="contact" className="scroll-mt-24">
                <h2 className="font-display text-xl font-medium text-foreground">
                  13. Contact Us
                </h2>
                <p className="mt-3">
                  If you have any questions about this Privacy Policy or how we
                  handle your data, please contact us:
                </p>
                <div className="mt-4 space-y-2 rounded-lg border border-border bg-background/40 p-4">
                  <p className="flex items-center gap-2">
                    <Mail className="size-4 text-accent" aria-hidden="true" />
                    <span>
                      <strong className="text-foreground">Privacy:</strong>{" "}
                      <a
                        href={`mailto:${PRIVACY_EMAIL}`}
                        className="text-accent underline-offset-4 hover:underline"
                      >
                        {PRIVACY_EMAIL}
                      </a>
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="size-4 text-accent" aria-hidden="true" />
                    <span>
                      <strong className="text-foreground">Support:</strong>{" "}
                      <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className="text-accent underline-offset-4 hover:underline"
                      >
                        {SUPPORT_EMAIL}
                      </a>
                    </span>
                  </p>
                </div>
              </section>
            </div>
          </article>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <span>© 2026 StyleAI</span>
          <div className="flex items-center gap-4">
            <Link to="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <span className="text-border">·</span>
            <span>
              AI style matches are estimates — always trust your own eye.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}