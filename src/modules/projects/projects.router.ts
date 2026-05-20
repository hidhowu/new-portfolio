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

const projectSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  category: z.string().min(1),
  shortDesc: z.string().min(1),
  coverImageUrl: optionalUrl(),
  coverColor: z.string().optional().nullable(),
  client: z.string().optional().nullable(),
  year: z.number().int().optional().nullable(),
  role: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  videoUrl: optionalUrl(),
  demoUrl: optionalUrl(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  gridSize: z.enum(['STD', 'WIDE', 'TALL']).optional(),
  sortOrder: z.number().int().optional(),
  challengeJson: z.any().optional(),
  approachJson: z.any().optional(),
  showImpact: z.boolean().optional(),
  impactIntro: z.string().optional().nullable(),
  spacingScale: z.any().optional(),
});

// `samples` accepts either the legacy array shape or the new
// { fonts: [{name,url}], items: [{fontName?, label, sizePx, weight, letterSpacing?, sampleText?}] }
// shape that supports multiple fonts per project.
const typographySchema = z.object({
  fontFamily: z.string().min(1),
  customFontUrl: optionalUrl(),
  samples: z.any(),
});

const colorSchema = z.object({
  label: z.string().min(1),
  hex: z.string().regex(/^#[0-9a-fA-F]{3,6}$/),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const metricSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

const galleryImageSchema = z.object({
  imageUrl: z.string().url(),
  caption: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// ─── Projects CRUD ────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const status = req.query.status as string;
  const where: any = { deletedAt: null };
  if (status === 'published') where.isPublished = true;
  if (status === 'draft') where.isPublished = false;
  const projects = await prisma.project.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true, slug: true, title: true, category: true, shortDesc: true,
      coverImageUrl: true, coverColor: true, isFeatured: true, isPublished: true,
      gridSize: true, sortOrder: true, createdAt: true,
    },
  });
  res.json(projects);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: {
      typography: true,
      colors: { orderBy: { sortOrder: 'asc' } },
      galleryImages: { orderBy: { sortOrder: 'asc' } },
      impactMetrics: { orderBy: { sortOrder: 'asc' } },
      relatedProjects: { select: { id: true, title: true, slug: true } },
    },
  });
  if (!project) throw new AppError(404, 'Project not found');
  res.json(project);
}));

router.post('/', verifyCsrf, validate(projectSchema), asyncHandler(async (req, res) => {
  const { title, slug, ...rest } = req.body;
  const project = await prisma.project.create({
    data: { title, slug: slug || slugify(title), ...rest },
  });
  res.status(201).json(project);
}));

router.patch('/:id', verifyCsrf, validate(projectSchema.partial()), asyncHandler(async (req, res) => {
  const project = await prisma.project.update({ where: { id: req.params.id }, data: req.body });
  res.json(project);
}));

router.delete('/:id', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.project.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  res.json({ ok: true });
}));

router.post('/:id/publish', verifyCsrf, asyncHandler(async (req, res) => {
  const p = await prisma.project.update({
    where: { id: req.params.id },
    data: { isPublished: true, publishedAt: new Date() },
  });
  res.json(p);
}));

router.post('/:id/unpublish', verifyCsrf, asyncHandler(async (req, res) => {
  const p = await prisma.project.update({
    where: { id: req.params.id },
    data: { isPublished: false },
  });
  res.json(p);
}));

router.post('/reorder', verifyCsrf, asyncHandler(async (req, res) => {
  const { ids }: { ids: string[] } = req.body;
  await prisma.$transaction(ids.map((id, i) =>
    prisma.project.update({ where: { id }, data: { sortOrder: i } }),
  ));
  res.json({ ok: true });
}));

// ─── Typography ───────────────────────────────────────────
router.put('/:id/typography', verifyCsrf, validate(typographySchema), asyncHandler(async (req, res) => {
  const typo = await prisma.projectTypography.upsert({
    where: { projectId: req.params.id },
    create: { projectId: req.params.id, ...req.body },
    update: req.body,
  });
  res.json(typo);
}));

// ─── Colors ───────────────────────────────────────────────
router.post('/:id/colors', verifyCsrf, validate(colorSchema), asyncHandler(async (req, res) => {
  const color = await prisma.projectColor.create({ data: { projectId: req.params.id, ...req.body } });
  res.status(201).json(color);
}));

router.patch('/:id/colors/:colorId', verifyCsrf, validate(colorSchema.partial()), asyncHandler(async (req, res) => {
  const color = await prisma.projectColor.update({ where: { id: req.params.colorId }, data: req.body });
  res.json(color);
}));

router.delete('/:id/colors/:colorId', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.projectColor.delete({ where: { id: req.params.colorId } });
  res.json({ ok: true });
}));

// ─── Gallery ──────────────────────────────────────────────
router.post('/:id/gallery', verifyCsrf, validate(galleryImageSchema), asyncHandler(async (req, res) => {
  const img = await prisma.projectGalleryImage.create({ data: { projectId: req.params.id, ...req.body } });
  res.status(201).json(img);
}));

router.delete('/:id/gallery/:imgId', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.projectGalleryImage.delete({ where: { id: req.params.imgId } });
  res.json({ ok: true });
}));

// ─── Metrics ──────────────────────────────────────────────
router.post('/:id/metrics', verifyCsrf, validate(metricSchema), asyncHandler(async (req, res) => {
  const metric = await prisma.projectMetric.create({ data: { projectId: req.params.id, ...req.body } });
  res.status(201).json(metric);
}));

router.patch('/:id/metrics/:metricId', verifyCsrf, validate(metricSchema.partial()), asyncHandler(async (req, res) => {
  const metric = await prisma.projectMetric.update({ where: { id: req.params.metricId }, data: req.body });
  res.json(metric);
}));

router.delete('/:id/metrics/:metricId', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.projectMetric.delete({ where: { id: req.params.metricId } });
  res.json({ ok: true });
}));

// ─── Related Projects ─────────────────────────────────────
router.put('/:id/related', verifyCsrf, asyncHandler(async (req, res) => {
  const { relatedIds }: { relatedIds: string[] } = req.body;
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { relatedProjects: { set: relatedIds.map(id => ({ id })) } },
    include: { relatedProjects: { select: { id: true, title: true, slug: true } } },
  });
  res.json(project.relatedProjects);
}));

export default router;
