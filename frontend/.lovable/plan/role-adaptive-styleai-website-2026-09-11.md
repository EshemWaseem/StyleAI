# Role-Adaptive StyleAI Website

## Goal
Turn the complete StyleAI product into five distinct role experiences—Super Admin, Influencer, Brand Owner, Agency, and Brand Teammate—within one premium adaptive workspace.

## Design direction
- Use the approved Nebula command-center composition with the locked Graphite & Sage palette.
- Use Instrument Serif for editorial headings and Work Sans for product UI.
- Keep the compact, collapsible sidebar and top command bar consistent across roles.
- Use dark graphite surfaces, pale sage emphasis, restrained borders, fashion imagery, and precise data visualisation.

## Role experiences
- **Super Admin:** Platform health, organizations, users, model governance, AI usage, audit risk, and system settings.
- **Influencer:** Opportunities, active collaborations, deliverables, earnings, content performance, audience insights, and profile management.
- **Brand Owner:** Products, AI analysis, creator matching, campaigns, revenue, recommendations, team, billing, and settings.
- **Agency:** Multi-brand portfolio, client switching, approvals, workload, campaign delivery, cross-client reporting, and team operations.
- **Brand Teammate:** Assigned tasks, drafts, approvals, campaign calendar, content collaboration, and permission-limited brand tools.

## Implementation
- Expand the role model and role switcher to all five roles.
- Make sidebar groups and top-level actions permission-aware for each role.
- Build distinct role dashboard compositions rather than merely swapping labels.
- Re-theme shared controls and content pages to the approved visual system.
- Preserve existing product, influencer, matching, studio, campaign, analytics, knowledge, billing, settings, and admin flows.
- Keep layouts usable on desktop and mobile with accessible controls and reduced-motion support.
- Add route metadata where any new role page is introduced.

## Verification
- Verify every role switch changes navigation and dashboard content.
- Check representative routes and role states at desktop and mobile sizes.
- Resolve build, runtime, console, and horizontal-overflow issues.
