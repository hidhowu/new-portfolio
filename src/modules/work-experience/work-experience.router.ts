import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { verifyCsrf } from '../../middleware/csrf';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { optionalUrl } from '../../utils/zod-helpers';

const router = Router();

const schema = z.object({
  role: z.string().min(1),
  company: z.string().min(1),
  period: z.string().min(1),
  description: z.string().min(1),
  logoUrl: optionalUrl(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

router.get('/', asyncHandler(async (_req, res) => {
  const items = await prisma.workExperience.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(items);
}));

router.post('/', verifyCsrf, validate(schema), asyncHandler(async (req, res) => {
  const item = await prisma.workExperience.create({ data: req.body });
  res.status(201).json(item);
}));

router.patch('/:id', verifyCsrf, validate(schema.partial()), asyncHandler(async (req, res) => {
  const item = await prisma.workExperience.update({ where: { id: req.params.id }, data: req.body });
  res.json(item);
}));

router.delete('/:id', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.workExperience.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

router.post('/reorder', verifyCsrf, asyncHandler(async (req, res) => {
  const { ids }: { ids: string[] } = req.body;
  await prisma.$transaction(ids.map((id, i) =>
    prisma.workExperience.update({ where: { id }, data: { sortOrder: i } }),
  ));
  res.json({ ok: true });
}));

export default router;
