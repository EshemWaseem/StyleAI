/**
 * SKU generator — deterministic, brand-scoped, unique via DB constraint.
 * Format: {CAT}-{COLOR}-{GENDER}-{SEQ}
 * Example: CLT-BLK-M-001
 */

const CATEGORY_CODE = {
  Clothing: 'CLT',
  Footwear: 'FTW',
  Bags: 'BAG',
  Accessories: 'ACC',
  Outerwear: 'OUT',
  Jewellery: 'JWL',
  Beauty: 'BTY',
  Other: 'GEN',
};

const COLOR_CODE = {
  black: 'BLK', white: 'WHT', red: 'RED', blue: 'BLU',
  green: 'GRN', yellow: 'YLW', pink: 'PNK', purple: 'PUR',
  brown: 'BRN', grey: 'GRY', gray: 'GRY', navy: 'NVY',
  beige: 'BGE', cream: 'CRM', gold: 'GLD', silver: 'SLV',
  orange: 'ORG', maroon: 'MRN',
};

const GENDER_CODE = {
  men: 'M', male: 'M',
  women: 'F', female: 'F',
  unisex: 'U', kids: 'K',
};

function categoryCode(category) {
  if (!category) return 'GEN';
  return CATEGORY_CODE[category] || category.slice(0, 3).toUpperCase();
}

function colorCode(color) {
  if (!color) return 'XXX';
  const key = String(color).trim().toLowerCase();
  return COLOR_CODE[key] || key.slice(0, 3).toUpperCase();
}

function genderCode(gender) {
  if (!gender) return 'U';
  return GENDER_CODE[String(gender).trim().toLowerCase()] || 'U';
}

/**
 * Generate next SKU for a brand.
 * @param {PrismaClient} prisma
 * @param {string} brandId
 * @param {object} attrs { category, color, target_gender }
 * @returns {Promise<string>} e.g. "CLT-BLK-M-001"
 */
async function generateSku(prisma, brandId, attrs = {}) {
  const prefix = [
    categoryCode(attrs.category),
    colorCode(attrs.color),
    genderCode(attrs.target_gender),
  ].join('-');

  // Find highest existing sequence for this prefix in this brand
  const existing = await prisma.product.findMany({
    where: {
      brandId,
      sku: { startsWith: prefix + '-' },
    },
    select: { sku: true },
  });

  let maxSeq = 0;
  for (const row of existing) {
    const parts = row.sku.split('-');
    const last = parts[parts.length - 1];
    const n = parseInt(last, 10);
    if (!isNaN(n) && n > maxSeq) maxSeq = n;
  }

  const next = maxSeq + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

module.exports = { generateSku, categoryCode, colorCode, genderCode };