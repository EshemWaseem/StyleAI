const C = {
  bg: '#0a0a0a',
  card: '#ffffff',
  text: '#1a1a1a',
  muted: '#6b7280',
  accent: '#c9a86a',
  border: '#e5e7eb',
  success: '#059669',
  danger: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
};

function layout({ preheader, title, bodyHtml, ctaText, ctaUrl }) {
  const cta =
    ctaText && ctaUrl
      ? `
      <tr>
        <td style="padding: 8px 32px 32px;">
          <a href="${ctaUrl}"
             style="display:inline-block;background:${C.accent};color:#fff;
                    text-decoration:none;padding:12px 24px;border-radius:8px;
                    font-weight:600;font-size:14px;">
            ${ctaText}
          </a>
        </td>
      </tr>`
      : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title || 'StyleAI'}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${C.text};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">
    ${preheader || ''}
  </span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;background:${C.card};border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.15);">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid ${C.border};">
              <span style="font-size:20px;font-weight:700;letter-spacing:-0.5px;">
                Style<span style="color:${C.accent};">AI</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              ${bodyHtml}
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:24px 32px;border-top:1px solid ${C.border};
                       font-size:12px;color:${C.muted};text-align:center;">
              You're receiving this because you have a StyleAI account.<br>
              <span style="display:inline-block;margin-top:6px;">
                <!--UNSUBSCRIBE_LINK-->
              </span>
              <br><br>
              © ${new Date().getFullYear()} StyleAI. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function h1(text) {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;line-height:1.3;">${text}</h1>`;
}
function p(text) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.text};">${text}</p>`;
}
function muted(text) {
  return `<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:${C.muted};">${text}</p>`;
}
function pill(text, color) {
  return `<span style="display:inline-block;background:${color}1a;color:${color};
                       padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;">
    ${text}
  </span>`;
}
function infoBox(rows) {
  const inner = rows
    .map(
      ([k, v]) => `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:${C.muted};">${k}</td>
      <td style="padding:6px 0;font-size:13px;text-align:right;font-weight:600;color:${C.text};">${v}</td>
    </tr>`
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:#f9fafb;border:1px solid ${C.border};border-radius:8px;
                  padding:16px;margin:16px 0;">
      ${inner}
    </table>`;
}

function frontendBase() {
  return (
    (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')[0]
      .trim() || 'http://localhost:3000'
  );
}

function welcome({ name, role }) {
  const roleLabel =
    { BRAND: 'Brand', AGENCY: 'Agency', INFLUENCER: 'Creator', SHOPPER: 'Shopper' }[
      role
    ] || 'User';

  const body = `
    ${h1(`Welcome to StyleAI, ${name || 'there'}!`)}
    ${p(`Your <strong>${roleLabel}</strong> account is ready. Here's what you can do right now:`)}
    <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.8;">
      <li>Upload products and let AI write descriptions</li>
      <li>Match with influencers using 6-dimension scoring</li>
      <li>Run campaigns and track performance</li>
      <li>Manage payments and withdrawals from one wallet</li>
    </ul>
    ${p('Your free trial has started. Make the most of it.')}
  `;

  return {
    subject: `Welcome to StyleAI, ${name || 'friend'}!`,
    html: layout({
      preheader: 'Your StyleAI account is ready',
      title: 'Welcome to StyleAI',
      bodyHtml: body,
      ctaText: 'Open Dashboard',
      ctaUrl: `${frontendBase()}/dashboard`,
    }),
  };
}

function trialExpiring({ name, role, daysLeft, planName }) {
  const body = `
    ${pill(`⏰ ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`, C.warning)}
    ${h1(`Your StyleAI trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`)}
    ${p(`Hi ${name || 'there'}, your free trial of the <strong>${planName || 'StyleAI'}</strong> plan is almost over.`)}
    ${infoBox([
      ['Trial ends', `${daysLeft} day${daysLeft === 1 ? '' : 's'}`],
      ['Current plan', planName || 'Free Trial'],
      ['Role', role || 'Brand'],
    ])}
    ${p('Upgrade now to keep your products, campaigns, and team intact.')}
  `;
  return {
    subject: `⏰ Your StyleAI trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html: layout({
      preheader: `Trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      title: 'Trial ending soon',
      bodyHtml: body,
      ctaText: 'Upgrade Now',
      ctaUrl: `${frontendBase()}/plans`,
    }),
  };
}

function trialExpired({ name, role }) {
  const body = `
    ${pill('Trial expired', C.danger)}
    ${h1('Your StyleAI trial has ended')}
    ${p(`Hi ${name || 'there'}, your free trial is over. You can still log in and upgrade any time to resume full access.`)}
    ${p('Your data is safe — products, campaigns, and team members are preserved.')}
  `;
  return {
    subject: 'Your StyleAI trial has ended',
    html: layout({
      preheader: 'Upgrade to resume access',
      title: 'Trial expired',
      bodyHtml: body,
      ctaText: 'Choose a Plan',
      ctaUrl: `${frontendBase()}/plans`,
    }),
  };
}

function offerReceived({ influencerName, brandName, offerTitle, amount, currency }) {
  const body = `
    ${pill('New offer', C.info)}
    ${h1('You have a new campaign offer')}
    ${p(`Hi ${influencerName || 'there'}, <strong>${brandName}</strong> sent you an offer.`)}
    ${infoBox([
      ['Brand', brandName],
      ['Campaign', offerTitle || '—'],
      ['Budget', `${currency} ${Number(amount || 0).toFixed(2)}`],
    ])}
    ${p('Review the details and accept or decline.')}
  `;
  return {
    subject: `New offer from ${brandName}`,
    html: layout({
      preheader: `${brandName} sent you an offer`,
      title: 'New offer',
      bodyHtml: body,
      ctaText: 'View Offer',
      ctaUrl: `${frontendBase()}/offers`,
    }),
  };
}

function offerAccepted({ brandName, influencerName, offerTitle, amount, currency }) {
  const body = `
    ${pill('Offer accepted', C.success)}
    ${h1('Your offer was accepted!')}
    ${p(`Hi ${brandName || 'there'}, <strong>${influencerName}</strong> accepted your campaign offer.`)}
    ${infoBox([
      ['Influencer', influencerName],
      ['Campaign', offerTitle || '—'],
      ['Escrow', `${currency} ${Number(amount || 0).toFixed(2)}`],
    ])}
    ${p('A campaign has been created. Track deliverables from your campaigns page.')}
  `;
  return {
    subject: `${influencerName} accepted your offer`,
    html: layout({
      preheader: 'Campaign auto-created',
      title: 'Offer accepted',
      bodyHtml: body,
      ctaText: 'View Campaign',
      ctaUrl: `${frontendBase()}/campaigns`,
    }),
  };
}

function offerDeclined({ brandName, influencerName, offerTitle, reason }) {
  const body = `
    ${pill('Offer declined', C.danger)}
    ${h1('Your offer was declined')}
    ${p(`Hi ${brandName || 'there'}, <strong>${influencerName}</strong> declined your offer.`)}
    ${infoBox([
      ['Campaign', offerTitle || '—'],
      ['Reason', reason || 'Not specified'],
    ])}
    ${p('Your escrow has been released back to your wallet.')}
  `;
  return {
    subject: `Offer declined by ${influencerName}`,
    html: layout({
      preheader: 'Escrow released',
      title: 'Offer declined',
      bodyHtml: body,
      ctaText: 'Browse Influencers',
      ctaUrl: `${frontendBase()}/influencers`,
    }),
  };
}

function contentSubmitted({ brandName, influencerName, campaignTitle, stage }) {
  const stageLabel =
    { RAW: 'raw content', EDIT: 'edited content', FINAL: 'final content' }[
      stage
    ] || 'content';

  const body = `
    ${pill('New submission', C.info)}
    ${h1('New content submitted for review')}
    ${p(`Hi ${brandName || 'there'}, <strong>${influencerName}</strong> submitted ${stageLabel} for your review.`)}
    ${infoBox([
      ['Campaign', campaignTitle || '—'],
      ['Stage', stageLabel],
      ['Submitted by', influencerName],
    ])}
    ${p('Approve, request changes, or reject from your campaign page.')}
  `;
  return {
    subject: `New content: ${campaignTitle || 'Campaign'}`,
    html: layout({
      preheader: `${influencerName} submitted ${stageLabel}`,
      title: 'Content submitted',
      bodyHtml: body,
      ctaText: 'Review Content',
      ctaUrl: `${frontendBase()}/campaigns`,
    }),
  };
}

function contentApproved({ influencerName, campaignTitle, amount, currency }) {
  const body = `
    ${pill('Content approved 🎉', C.success)}
    ${h1('Your content was approved!')}
    ${p(`Hi ${influencerName || 'there'}, your content for <strong>${campaignTitle}</strong> was approved.`)}
    ${infoBox([
      ['Campaign', campaignTitle || '—'],
      ['Payout released', `${currency} ${Number(amount || 0).toFixed(2)}`],
    ])}
    ${p('Funds are now in your wallet and available for withdrawal.')}
  `;
  return {
    subject: `Content approved — payment released`,
    html: layout({
      preheader: 'Funds released to your wallet',
      title: 'Content approved',
      bodyHtml: body,
      ctaText: 'View Wallet',
      ctaUrl: `${frontendBase()}/wallet`,
    }),
  };
}

function paymentReceipt({ name, planLabel, amount, currency, cycle, invoiceNumber, paidAt, provider }) {
  const body = `
    ${pill('Payment received', C.success)}
    ${h1('Payment receipt')}
    ${p(`Hi ${name || 'there'}, thanks for your payment. Your subscription is active.`)}
    ${infoBox([
      ['Plan', planLabel],
      ['Billing', cycle === 'YEARLY' ? 'Yearly' : 'Monthly'],
      ['Amount', `${currency} ${Number(amount || 0).toFixed(2)}`],
      ['Method', provider || 'Card'],
      ['Invoice', invoiceNumber || '—'],
      ['Date', paidAt ? new Date(paidAt).toLocaleString() : new Date().toLocaleString()],
    ])}
    ${muted('Keep this email for your records.')}
  `;
  return {
    subject: `Receipt — ${planLabel} (${currency} ${Number(amount || 0).toFixed(2)})`,
    html: layout({
      preheader: 'Your payment was successful',
      title: 'Payment receipt',
      bodyHtml: body,
      ctaText: 'View Billing',
      ctaUrl: `${frontendBase()}/billing`,
    }),
  };
}

function withdrawalRequested({ userName, amount, currency, reference }) {
  const body = `
    ${pill('Action required', C.warning)}
    ${h1('Withdrawal request pending approval')}
    ${p(`<strong>${userName}</strong> requested a withdrawal.`)}
    ${infoBox([
      ['User', userName],
      ['Amount', `${currency} ${Number(amount || 0).toFixed(2)}`],
      ['Reference', reference || '—'],
    ])}
    ${p('Review and approve or reject from the admin panel.')}
  `;
  return {
    subject: `Withdrawal request — ${currency} ${Number(amount || 0).toFixed(2)}`,
    html: layout({
      preheader: 'Admin approval required',
      title: 'Withdrawal request',
      bodyHtml: body,
      ctaText: 'Review Withdrawals',
      ctaUrl: `${frontendBase()}/admin/withdrawals`,
    }),
  };
}

function withdrawalReviewed({ name, amount, currency, approved, reference, reason }) {
  const ok = approved === true;
  const body = `
    ${pill(ok ? 'Approved' : 'Rejected', ok ? C.success : C.danger)}
    ${h1(ok ? 'Your withdrawal was approved' : 'Your withdrawal was rejected')}
    ${p(`Hi ${name || 'there'},`)}
    ${infoBox([
      ['Amount', `${currency} ${Number(amount || 0).toFixed(2)}`],
      ['Status', ok ? 'Approved' : 'Rejected'],
      ['Reference', reference || '—'],
      ...(ok ? [] : [['Reason', reason || 'Contact support']]),
    ])}
    ${ok ? p('Funds are on the way to your registered payment method.') : p('Your wallet balance has been restored.')}
  `;
  return {
    subject: ok
      ? `Withdrawal approved — ${currency} ${Number(amount || 0).toFixed(2)}`
      : `Withdrawal rejected — ${currency} ${Number(amount || 0).toFixed(2)}`,
    html: layout({
      preheader: ok ? 'Funds on the way' : 'Balance restored',
      title: ok ? 'Withdrawal approved' : 'Withdrawal rejected',
      bodyHtml: body,
      ctaText: 'View Wallet',
      ctaUrl: `${frontendBase()}/wallet`,
    }),
  };
}

function brandApplicationReceived({ brandName, productCount, notes }) {
  const body = `
    ${pill('New application', C.info)}
    ${h1('New storefront application')}
    ${p(`<strong>${brandName}</strong> has applied to be featured on the public storefront.`)}
    ${infoBox([
      ['Brand', brandName],
      ['Products', `${productCount} selected`],
      ['Applied', new Date().toLocaleDateString()],
    ])}
    ${notes ? p(`<em>"${notes}"</em>`) : ''}
    ${p('Review the full application in the admin panel.')}
  `;
  return {
    subject: `Storefront application — ${brandName}`,
    html: layout({
      preheader: `${brandName} applied for storefront`,
      title: 'New storefront application',
      bodyHtml: body,
      ctaText: 'Review Application',
      ctaUrl: `${frontendBase()}/admin/storefront`,
    }),
  };
}

function brandApplicationApproved({ brandName, productCount }) {
  const body = `
    ${pill('Approved ✓', C.success)}
    ${h1('Your brand is now live on StyleAI')}
    ${p(`Great news! <strong>${brandName}</strong> has been approved for the public storefront.`)}
    ${infoBox([
      ['Brand', brandName],
      ['Visible products', `${productCount}`],
      ['Status', 'Approved'],
    ])}
    ${p('Your products are now live and discoverable by shoppers. You can toggle individual product visibility from your catalog anytime.')}
  `;
  return {
    subject: `🎉 ${brandName} is live on StyleAI`,
    html: layout({
      preheader: 'Your brand is now on the storefront',
      title: 'Application approved',
      bodyHtml: body,
      ctaText: 'Manage Products',
      ctaUrl: `${frontendBase()}/products`,
    }),
  };
}

function brandApplicationDeclined({ brandName, reason }) {
  const body = `
    ${pill('Not approved', C.danger)}
    ${h1('Storefront application update')}
    ${p(`Hi, we've reviewed <strong>${brandName}</strong>'s storefront application.`)}
    ${infoBox([
      ['Brand', brandName],
      ['Status', 'Not approved'],
      ...(reason ? [['Reason', reason]] : []),
    ])}
    ${p('You can update your products and re-apply anytime from your dashboard.')}
  `;
  return {
    subject: `${brandName} — storefront application update`,
    html: layout({
      preheader: 'Application not approved',
      title: 'Application update',
      bodyHtml: body,
      ctaText: 'Go to Dashboard',
      ctaUrl: `${frontendBase()}/dashboard`,
    }),
  };
}

function passwordReset({ name, resetUrl, expiresInMinutes }) {
  const mins = Number(expiresInMinutes) || 60;
  const body = `
    ${h1('Reset your password')}
    ${p(`Hi ${name || 'there'}, we received a request to reset your StyleAI password.`)}
    ${p(`Click the button below to set a new password. This link will expire in <strong>${mins} minute${mins === 1 ? '' : 's'}</strong>.`)}
    ${muted("If you didn't request this, you can safely ignore this email. Your password will not change.")}
  `;
  return {
    subject: 'Reset your StyleAI password',
    html: layout({
      preheader: 'Reset your StyleAI password',
      title: 'Reset your password',
      bodyHtml: body,
      ctaText: 'Reset password',
      ctaUrl: resetUrl,
    }),
  };
}

function passwordChanged({ name }) {
  const body = `
    ${pill('Password changed', C.success)}
    ${h1('Your password was changed')}
    ${p(`Hi ${name || 'there'}, this is a confirmation that your StyleAI password was just changed.`)}
    ${p("If this wasn't you, please reset your password again or contact support immediately.")}
  `;
  return {
    subject: 'Your StyleAI password was changed',
    html: layout({
      preheader: 'Password changed successfully',
      title: 'Password changed',
      bodyHtml: body,
      ctaText: 'Sign in',
      ctaUrl: `${frontendBase()}/login`,
    }),
  };
}


// NEW — Email verification

function verifyEmail({ name, verifyUrl, expiresInHours }) {
  const hrs = Number(expiresInHours) || 24;
  const body = `
    ${h1('Verify your email address')}
    ${p(`Hi ${name || 'there'}, thanks for signing up for StyleAI.`)}
    ${p(`Click the button below to verify <strong>your email address</strong> and activate your account. This link will expire in <strong>${hrs} hour${hrs === 1 ? '' : 's'}</strong>.`)}
    ${muted("If you didn't create this account, you can safely ignore this email.")}
  `;
  return {
    subject: 'Verify your StyleAI email',
    html: layout({
      preheader: 'Confirm your email address',
      title: 'Verify your email',
      bodyHtml: body,
      ctaText: 'Verify email',
      ctaUrl: verifyUrl,
    }),
  };
}


// NEW — Account lockout notification

function accountLocked({ name, lockedUntilMinutes, lastAttemptAt, ip }) {
  const mins = Number(lockedUntilMinutes) || 15;
  const body = `
    ${pill('Account locked', C.danger)}
    ${h1('Your account was temporarily locked')}
    ${p(`Hi ${name || 'there'}, we noticed multiple failed login attempts on your StyleAI account.`)}
    ${infoBox([
      ['Locked for', `${mins} minute${mins === 1 ? '' : 's'}`],
      ...(lastAttemptAt ? [['Last attempt', new Date(lastAttemptAt).toLocaleString()]] : []),
      ...(ip ? [['From IP', ip]] : []),
    ])}
    ${p('Your account is temporarily locked. If this was you, wait for the lockout to end and try again with the correct password.')}
    ${p('<strong>If this was NOT you</strong>, we recommend resetting your password immediately to protect your account.')}
  `;
  return {
    subject: 'StyleAI — Your account was temporarily locked',
    html: layout({
      preheader: 'Multiple failed login attempts detected',
      title: 'Account locked',
      bodyHtml: body,
      ctaText: 'Reset password',
      ctaUrl: `${frontendBase()}/forgot-password`,
    }),
  };
}

module.exports = {
  welcome,
  trialExpiring,
  trialExpired,
  offerReceived,
  offerAccepted,
  offerDeclined,
  contentSubmitted,
  contentApproved,
  paymentReceipt,
  withdrawalRequested,
  withdrawalReviewed,
  brandApplicationReceived,
  brandApplicationApproved,
  brandApplicationDeclined,
  passwordReset,
  passwordChanged,
  verifyEmail,
  accountLocked,
};