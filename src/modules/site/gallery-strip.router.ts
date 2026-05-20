import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { verifyCsrf } from '../../middleware/csrf';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { optionalUrl } from '../../utils/zod-helpers';

const router = Router();

const schema = z.object({
  imageUrl: optionalUrl(),
  label: z.string().min(1),
  color: z.string().optional().nullable(),
  row: z.number().int().min(0).max(2).default(0),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

router.get('/', asyncHandler(async (_req, res) => {
  const items = await prisma.galleryStripItem.findMany({
    orderBy: [{ row: 'asc' }, { sortOrder: 'asc' }],
  });
  res.json(items);
}));

router.post('/', verifyCsrf, validate(schema), asyncHandler(async (req, res) => {
  const item = await prisma.galleryStripItem.create({ data: req.body });
  res.status(201).json(item);
}));

router.patch('/:id', verifyCsrf, validate(schema.partial()), asyncHandler(async (req, res) => {
  const item = await prisma.galleryStripItem.update({ where: { id: req.params.id }, data: req.body });
  res.json(item);
}));

router.delete('/:id', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.galleryStripItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

router.post('/reorder', verifyCsrf, asyncHandler(async (req, res) => {
  const { row, ids }: { row: number; ids: string[] } = req.body;
  await prisma.$transaction(ids.map((id, i) =>
    prisma.galleryStripItem.update({ where: { id }, data: { row, sortOrder: i } }),
  ));
  res.json({ ok: true });
}));

export default router;
