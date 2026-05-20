import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { verifyCsrf } from '../../middleware/csrf';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { slugify } from '../../utils/slug';
import { optionalUrl } from '../../utils/zod-helpers';
import { AppError } from '../../middleware/error';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  iconUrl: optionalUrl(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const subserviceSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  iconUrl: optionalUrl(),
  externalUrl: optionalUrl(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ─── Categories ───────────────────────────────────────────
router.get('/categories', asyncHandler(async (_req, res) => {
  const cats = await prisma.serviceCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { subservices: { orderBy: { sortOrder: 'asc' } } },
  });
  res.json(cats);
}));

router.post('/categories', verifyCsrf, validate(categorySchema), asyncHandler(async (req, res) => {
  const { name, slug, ...rest } = req.body;
  const cat = await prisma.serviceCategory.create({
    data: { name, slug: slug || slugify(name), ...rest },
  });
  res.status(201).json(cat);
}));

router.patch('/categories/:id', verifyCsrf, validate(categorySchema.partial()), asyncHandler(async (req, res) => {
  const cat = await prisma.serviceCategory.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(cat);
}));

router.delete('/categories/:id', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.serviceCategory.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

router.post('/categories/reorder', verifyCsrf, asyncHandler(async (req, res) => {
  const { ids }: { ids: string[] } = req.body;
  await prisma.$transaction(ids.map((id, i) =>
    prisma.serviceCategory.update({ where: { id }, data: { sortOrder: i } }),
  ));
  res.json({ ok: true });
}));

// ─── Subservices ──────────────────────────────────────────
router.get('/subservices', asyncHandler(async (req, res) => {
  const where = req.query.categoryId ? { categoryId: req.query.categoryId as string } : {};
  const subs = await prisma.subservice.findMany({ where, orderBy: { sortOrder: 'asc' } });
  res.json(subs);
}));

router.post('/subservices', verifyCsrf, validate(subserviceSchema), asyncHandler(async (req, res) => {
  const sub = await prisma.subservice.create({ data: req.body });
  res.status(201).json(sub);
}));

router.patch('/subservices/:id', verifyCsrf, validate(subserviceSchema.partial()), asyncHandler(async (req, res) => {
  const sub = await prisma.subservice.update({ where: { id: req.params.id }, data: req.body });
  res.json(sub);
}));

router.delete('/subservices/:id', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.subservice.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

router.post('/subservices/reorder', verifyCsrf, asyncHandler(async (req, res) => {
  const { ids }: { ids: string[] } = req.body;
  await prisma.$transaction(ids.map((id, i) =>
    prisma.subservice.update({ where: { id }, data: { sortOrder: i } }),
  ));
  res.json({ ok: true });
}));

export default router;
