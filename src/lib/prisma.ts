prisma.$use(async (params, next) => {
  const data = params.args?.data;
  if (!data) return next(params);

  // Só injeta se o modelo tiver os campos
  const withCreated = 'createdAt' in data;
  const withUpdated = 'updatedAt' in data;

  if (params.action === 'create') {
    if (withCreated && data.createdAt == null) data.createdAt = new Date();
    if (withUpdated && data.updatedAt == null) data.updatedAt = new Date();
  }

  if (params.action === 'update') {
    if (withUpdated) data.updatedAt = new Date();
  }

  return next(params);
});
