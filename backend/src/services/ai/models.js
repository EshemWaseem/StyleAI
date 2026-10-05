// services/ai/models.js
// ======================================================
// Model registry CRUD.
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { getPricing } = require('./pricing');

/**
 * List all registered AI models.
 */
async function listModels({ taskType, provider, status } = {}) {
  const where = {};
  if (taskType) where.taskType = taskType;
  if (provider) where.provider = provider;
  if (status) where.status = status;

  const rows = await prisma.aIModel.findMany({
    where,
    orderBy: [{ taskType: 'asc' }, { provider: 'asc' }, { name: 'asc' }],
  });

  return rows.map(shapeModel);
}

async function getModel(id) {
  const m = await prisma.aIModel.findUnique({ where: { id } });
  if (!m) throw httpError('Model not found', 404, 'NOT_FOUND');
  return shapeModel(m);
}

async function createModel(adminUser, payload = {}) {
  const {
    name, displayName, provider, taskType, version = '1.0', baseModel,
    status = 'PRODUCTION', accuracy, evaluationScore, evaluationNotes,
    trainingDataset, trainingDate, trainingHours,
    costPer1kInput, costPer1kOutput, costPerCall, isDefault = false, meta,
  } = payload;

  if (!name || !displayName || !provider || !taskType) {
    throw httpError('name, displayName, provider, taskType are required', 400, 'MISSING_FIELDS');
  }

  // Auto-fill pricing from table if not provided
  const pricing = getPricing(provider, name);

  // If isDefault, unset others for same taskType
  if (isDefault) {
    await prisma.aIModel.updateMany({
      where: { taskType },
      data: { isDefault: false },
    });
  }

  const m = await prisma.aIModel.create({
    data: {
      name,
      displayName,
      provider,
      taskType,
      version,
      baseModel: baseModel || null,
      status,
      accuracy: accuracy != null ? Number(accuracy) : null,
      evaluationScore: evaluationScore != null ? Number(evaluationScore) : null,
      evaluationNotes: evaluationNotes || null,
      trainingDataset: trainingDataset || null,
      trainingDate: trainingDate ? new Date(trainingDate) : null,
      trainingHours: trainingHours != null ? Number(trainingHours) : null,
      costPer1kInput: costPer1kInput != null ? Number(costPer1kInput) : (pricing.inputPer1k ?? null),
      costPer1kOutput: costPer1kOutput != null ? Number(costPer1kOutput) : (pricing.outputPer1k ?? null),
      costPerCall: costPerCall != null ? Number(costPerCall) : (pricing.perCall ?? null),
      isDefault,
      meta: meta || undefined,
    },
  });

  return shapeModel(m);
}

async function updateModel(adminUser, id, payload = {}) {
  const exists = await prisma.aIModel.findUnique({ where: { id } });
  if (!exists) throw httpError('Model not found', 404, 'NOT_FOUND');

  const data = {};
  const copy = ['name', 'displayName', 'provider', 'taskType', 'version', 'baseModel',
    'status', 'evaluationNotes', 'trainingDataset'];
  for (const k of copy) {
    if (payload[k] !== undefined) data[k] = payload[k];
  }
  const numeric = ['accuracy', 'evaluationScore', 'trainingHours',
    'costPer1kInput', 'costPer1kOutput', 'costPerCall'];
  for (const k of numeric) {
    if (payload[k] !== undefined) data[k] = payload[k] != null ? Number(payload[k]) : null;
  }
  if (payload.trainingDate !== undefined) {
    data.trainingDate = payload.trainingDate ? new Date(payload.trainingDate) : null;
  }
  if (payload.meta !== undefined) data.meta = payload.meta;

  if (payload.isDefault === true) {
    await prisma.aIModel.updateMany({
      where: { taskType: exists.taskType, NOT: { id } },
      data: { isDefault: false },
    });
    data.isDefault = true;
  }

  const m = await prisma.aIModel.update({ where: { id }, data });
  return shapeModel(m);
}

async function deleteModel(adminUser, id) {
  const exists = await prisma.aIModel.findUnique({ where: { id } });
  if (!exists) throw httpError('Model not found', 404, 'NOT_FOUND');
  await prisma.aIModel.delete({ where: { id } });
  return { id };
}

function shapeModel(m) {
  return {
    id: m.id,
    name: m.name,
    displayName: m.displayName,
    provider: m.provider,
    taskType: m.taskType,
    version: m.version,
    baseModel: m.baseModel,
    status: m.status,
    accuracy: m.accuracy,
    evaluationScore: m.evaluationScore,
    evaluationNotes: m.evaluationNotes,
    trainingDataset: m.trainingDataset,
    trainingDate: m.trainingDate,
    trainingHours: m.trainingHours,
    costPer1kInput: m.costPer1kInput,
    costPer1kOutput: m.costPer1kOutput,
    costPerCall: m.costPerCall,
    isDefault: m.isDefault,
    meta: m.meta,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

module.exports = {
  listModels,
  getModel,
  createModel,
  updateModel,
  deleteModel,
};