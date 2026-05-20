import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { verifyCsrf } from '../../middleware/csrf';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { optionalUrl, optionalId } from '../../utils/zod-helpers';

const router = Router();

const groupSchema = z.object({
  categoryId: optionalId(),
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

const toolSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().min(1),
  iconUrl: optionalUrl(),
  sortOrder: z.number().int().optional(),
});

// ─── Tool groups ──────────────────────────────────────────
router.get('/groups', asyncHandler(async (_req, res) => {
  const groups = await prisma.toolGroup.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { tools: { orderBy: { sortOrder: 'asc' } } },
  });
  res.json(groups);
}));

router.post('/groups', verifyCsrf, validate(groupSchema), asyncHandler(async (req, res) => {
  const group = await prisma.toolGroup.create({ data: req.body });
  res.status(201).json(group);
}));

router.patch('/groups/:id', verifyCsrf, validate(groupSchema.partial()), asyncHandler(async (req, res) => {
  const group = await prisma.toolGroup.update({ where: { id: req.params.id }, data: req.body });
  res.json(group);
}));

router.delete('/groups/:id', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.toolGroup.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ─── Tools ────────────────────────────────────────────────
router.post('/tools', verifyCsrf, validate(toolSchema), asyncHandler(async (req, res) => {
  const tool = await prisma.tool.create({ data: req.body });
  res.status(201).json(tool);
}));

router.patch('/tools/:id', verifyCsrf, validate(toolSchema.partial()), asyncHandler(async (req, res) => {
  const tool = await prisma.tool.update({ where: { id: req.params.id }, data: req.body });
  res.json(tool);
}));

router.delete('/tools/:id', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.tool.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

router.post('/tools/reorder', verifyCsrf, asyncHandler(async (req, res) => {
  const { ids }: { ids: string[] } = req.body;
  await prisma.$transaction(ids.map((id, i) =>
    prisma.tool.update({ where: { id }, data: { sortOrder: i } }),
  ));
  res.json({ ok: true });
}));

export default router;
