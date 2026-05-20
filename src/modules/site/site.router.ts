import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { verifyCsrf } from '../../middleware/csrf';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { optionalUrl } from '../../utils/zod-helpers';

const router = Router();

const VALID_KEYS = ['hero', 'about', 'footer', 'music', 'theme', 'seo', 'nav', 'cta', 'stats', 'newsletter', 'resume', 'mobileMenu'];

router.get('/settings/:key', asyncHandler(async (req, res) => {
  const { key } = req.params;
  const setting = await prisma.siteSetting.findUnique({ where: { key } });
  res.json(setting?.value ?? null);
}));

router.put('/settings/:key', verifyCsrf, asyncHandler(async (req, res) => {
  const { key } = req.params;
  if (!VALID_KEYS.includes(key)) {
    return res.status(400).json({ error: 'Invalid setting key' });
  }
  const setting = await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: req.body },
    update: { value: req.body },
  });
  res.json(setting.value);
}));

// ─── Social links ─────────────────────────────────────────
const socialSchema = z.object({
  name: z.string().min(1),
  url: z.preprocess(
    (v) => {
      if (typeof v !== 'string') return v;
      const trimmed = v.trim();
      if (!trimmed) return trimmed;
      if (trimmed.startsWith('mailto:') || /^https?:\/\//i.test(trimmed)) return trimmed;
      return `https://${trimmed}`;
    },
    z.string().url(),
  ),
  iconKey: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

router.get('/social-links', asyncHandler(async (_req, res) => {
  const links = await prisma.socialLink.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(links);
}));

router.post('/social-links', verifyCsrf, validate(socialSchema), asyncHandler(async (req, res) => {
  const link = await prisma.socialLink.create({ data: req.body });
  res.status(201).json(link);
}));

router.patch('/social-links/:id', verifyCsrf, validate(socialSchema.partial()), asyncHandler(async (req, res) => {
  const link = await prisma.socialLink.update({ where: { id: req.params.id }, data: req.body });
  res.json(link);
}));

router.post('/social-links/reorder', verifyCsrf, asyncHandler(async (req, res) => {
  const { ids }: { ids: string[] } = req.body;
  await prisma.$transaction(ids.map((id, i) =>
    prisma.socialLink.update({ where: { id }, data: { sortOrder: i } }),
  ));
  res.json({ ok: true });
}));

router.delete('/social-links/:id', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.socialLink.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

export default router;
