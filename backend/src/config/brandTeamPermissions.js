// ======================================================
// BRAND TEAM PERMISSIONS — source of truth
// These are brand-scoped permissions, assigned via custom roles.
// Global Role/Permission tables are separate (system-wide).
// ======================================================

const BRAND_TEAM_PERMISSIONS = {
  CAMPAIGN: {
    label: 'Campaigns',
    description: 'Create and manage marketing campaigns',
    permissions: [
      { key: 'campaign.read',   label: 'View campaigns' },
      { key: 'campaign.create', label: 'Create campaigns' },
      { key: 'campaign.update', label: 'Edit campaigns' },
      { key: 'campaign.delete', label: 'Delete campaigns' },
    ],
  },
  PRODUCT: {
    label: 'Products',
    description: 'Create and manage products',
    permissions: [
      { key: 'product.read',   label: 'View products' },
      { key: 'product.create', label: 'Add products' },
      { key: 'product.update', label: 'Edit products' },
      { key: 'product.delete', label: 'Delete products' },
    ],
  },
  INVENTORY: {
    label: 'Inventory',
    description: 'Manage stock and inventory numbers',
    permissions: [
      { key: 'inventory.read',   label: 'View inventory' },
      { key: 'inventory.manage', label: 'Update inventory' },
    ],
  },
  INFLUENCER: {
    label: 'Influencers',
    description: 'Discover and contact influencers',
    permissions: [
      { key: 'influencer.read',    label: 'View influencers' },
      { key: 'influencer.contact', label: 'Contact influencers' },
    ],
  },
  ANALYTICS: {
    label: 'Analytics',
    description: 'View brand analytics and reports',
    permissions: [
      { key: 'analytics.view', label: 'View analytics' },
    ],
  },
  BRAND: {
    label: 'Brand',
    description: 'View and edit brand details',
    permissions: [
      { key: 'brand.read',   label: 'View brand' },
      { key: 'brand.update', label: 'Edit brand' },
    ],
  },
  TEAM: {
    label: 'Team',
    description: 'Team visibility',
    permissions: [
      { key: 'team.read', label: 'View team members' },
    ],
  },
};

// Flat list of all valid permission keys
const ALL_BRAND_TEAM_PERMISSION_KEYS = Object.values(BRAND_TEAM_PERMISSIONS)
  .flatMap((group) => group.permissions.map((p) => p.key));

// ======================================================
// DEFAULT ROLES — auto-created for every new brand
// ======================================================

const DEFAULT_BRAND_TEAM_ROLES = [
  {
    name: 'Campaign Manager',
    description: 'Runs campaigns and manages influencer collaborations',
    color: 'blue',
    isOwnerRole: false,
    permissions: [
      'campaign.read',
      'campaign.create',
      'campaign.update',
      'campaign.delete',
      'influencer.read',
      'influencer.contact',
      'analytics.view',
      'brand.read',
    ],
  },
  {
    name: 'Product Manager',
    description: 'Manages the product catalog',
    color: 'emerald',
    isOwnerRole: false,
    permissions: [
      'product.read',
      'product.create',
      'product.update',
      'inventory.read',
      'brand.read',
      'analytics.view',
    ],
  },
  {
    name: 'Inventory Manager',
    description: 'Updates stock and inventory levels only',
    color: 'amber',
    isOwnerRole: false,
    permissions: [
      'product.read',
      'inventory.read',
      'inventory.manage',
      'brand.read',
    ],
  },
  {
    name: 'Full Access',
    description: 'Can do everything except billing',
    color: 'violet',
    isOwnerRole: true,
    permissions: [
      'campaign.read',
      'campaign.create',
      'campaign.update',
      'campaign.delete',
      'product.read',
      'product.create',
      'product.update',
      'product.delete',
      'inventory.read',
      'inventory.manage',
      'influencer.read',
      'influencer.contact',
      'analytics.view',
      'brand.read',
      'brand.update',
      'team.read',
    ],
  },
];

// ======================================================
// VALIDATION
// ======================================================

function isValidPermission(key) {
  return ALL_BRAND_TEAM_PERMISSION_KEYS.includes(key);
}

function filterValidPermissions(keys) {
  if (!Array.isArray(keys)) return [];
  return [...new Set(keys)].filter(isValidPermission);
}

module.exports = {
  BRAND_TEAM_PERMISSIONS,
  ALL_BRAND_TEAM_PERMISSION_KEYS,
  DEFAULT_BRAND_TEAM_ROLES,
  isValidPermission,
  filterValidPermissions,
};