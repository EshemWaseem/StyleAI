// services/userService.js
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

// ======================================================
// UPDATE OWN PROFILE
// ======================================================
async function updateOwnProfile(userId, data = {}) {
  const updateData = {};

  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) {
      const err = new Error('Name cannot be empty');
      err.status = 400;
      throw err;
    }
    updateData.name = name;
  }

  if (data.email !== undefined) {
    const email = String(data.email).trim().toLowerCase();
    if (!email || !email.includes('@')) {
      const err = new Error('Please provide a valid email address');
      err.status = 400;
      throw err;
    }

    const conflict = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
    });
    if (conflict) {
      const err = new Error('Email is already in use');
      err.status = 409;
      throw err;
    }
    updateData.email = email;
  }

  // ✅ NEW — phone
  if (data.phone !== undefined) {
    const phone = data.phone ? String(data.phone).trim() : null;
    updateData.phone = phone || null;
  }

  // ✅ NEW — country
  if (data.country !== undefined) {
    const country = data.country ? String(data.country).trim() : null;
    updateData.country = country || null;
  }

  // ✅ NEW — countryCode
  if (data.countryCode !== undefined) {
    const code = data.countryCode
      ? String(data.countryCode).trim().toUpperCase()
      : null;
    updateData.countryCode = code || null;
  }

  if (Object.keys(updateData).length === 0) {
    const err = new Error('No changes provided');
    err.status = 400;
    throw err;
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      organizationId: true,
      phone: true,
      country: true,
      countryCode: true,
    },
  });
}

// ======================================================
// CHANGE OWN PASSWORD
// ======================================================
async function changeOwnPassword(userId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    const err = new Error('Current and new password are required');
    err.status = 400;
    throw err;
  }

  if (newPassword.length < 8) {
    const err = new Error('New password must be at least 8 characters');
    err.status = 400;
    throw err;
  }

  if (currentPassword === newPassword) {
    const err = new Error(
      'New password must be different from current password'
    );
    err.status = 400;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) {
    const err = new Error('Current password is incorrect');
    err.status = 401;
    throw err;
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  return { ok: true };
}

module.exports = {
  updateOwnProfile,
  changeOwnPassword,
};