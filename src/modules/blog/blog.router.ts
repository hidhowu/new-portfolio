import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { verifyCsrf } from '../../middleware/csrf';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { slugify } from '../../utils/slug';
import { optionalUrl, optionalId } from '../../utils/zod-helpers';
import { estimateReadTime } from '../../utils/readtime';
import { AppError } from '../../middleware/error';
import multer from 'multer';
import { cloudinary } from '../../config/cloudinary';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const postSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  excerpt: z.string().min(1),
  coverImageUrl: optionalUrl(),
  contentJson: z.any().optional(),
  categoryId: optionalId(),
  isFeatured: z.boolean().optional(),
  readMinutes: z.number().int().optional(),
});

// ─── Categories ───────────────────────────────────────────
router.get('/categories', asyncHandler(async (_req, res) => {
  const cats = await prisma.blogCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(cats);
}));

router.post('/categories', verifyCsrf, validate(categorySchema), asyncHandler(async (req, res) => {
  const { name, slug, ...rest } = req.body;
  const cat = await prisma.blogCategory.create({ data: { name, slug: slug || slugify(name), ...rest } });
  res.status(201).json(cat);
}));

router.patch('/categories/:id', verifyCsrf, validate(categorySchema.partial()), asyncHandler(async (req, res) => {
  const cat = await prisma.blogCategory.update({ where: { id: req.params.id }, data: req.body });
  res.json(cat);
}));

router.delete('/categories/:id', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.blogCategory.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// ─── Posts ────────────────────────────────────────────────
router.get('/posts', asyncHandler(async (req, res) => {
  const status = req.query.status as string;
  const categoryId = req.query.categoryId as string;
  const q = req.query.q as string;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = 20;
  const where: any = { deletedAt: null };
  if (status === 'published') where.isPublished = true;
  if (status === 'draft') where.isPublished = false;
  if (categoryId) where.categoryId = categoryId;
  if (q) where.title = { contains: q, mode: 'insensitive' };

  const [total, posts] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: { category: { select: { name: true, slug: true } } },
    }),
  ]);
  res.json({ total, page, pageSize, posts });
}));

router.get('/posts/:id', asyncHandler(async (req, res) => {
  const post = await prisma.blogPost.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: { category: true },
  });
  if (!post) throw new AppError(404, 'Post not found');
  res.json(post);
}));

router.post('/posts', verifyCsrf, validate(postSchema), asyncHandler(async (req, res) => {
  const { title, slug, contentJson, ...rest } = req.body;
  const json = contentJson ?? { blocks: [] };
  const post = await prisma.$transaction(async (tx) => {
    if (rest.isFeatured) {
      await tx.blogPost.updateMany({ where: { isFeatured: true }, data: { isFeatured: false } });
    }
    return tx.blogPost.create({
      data: {
        title,
        slug: slug || slugify(title),
        contentJson: json,
        readMinutes: rest.readMinutes ?? estimateReadTime(json),
        ...rest,
      },
    });
  });
  res.status(201).json(post);
}));

router.patch('/posts/:id', verifyCsrf, validate(postSchema.partial()), asyncHandler(async (req, res) => {
  const { contentJson, ...rest } = req.body;
  const updateData: any = { ...rest };
  if (contentJson !== undefined) {
    updateData.contentJson = contentJson;
    if (!rest.readMinutes) updateData.readMinutes = estimateReadTime(contentJson);
  }
  const post = await prisma.$transaction(async (tx) => {
    if (updateData.isFeatured === true) {
      await tx.blogPost.updateMany({
        where: { isFeatured: true, NOT: { id: req.params.id } },
        data: { isFeatured: false },
      });
    }
    return tx.blogPost.update({ where: { id: req.params.id }, data: updateData });
  });
  res.json(post);
}));

router.delete('/posts/:id', verifyCsrf, asyncHandler(async (req, res) => {
  await prisma.blogPost.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  res.json({ ok: true });
}));

router.post('/posts/:id/publish', verifyCsrf, asyncHandler(async (req, res) => {
  const post = await prisma.blogPost.update({
    where: { id: req.params.id },
    data: { isPublished: true, publishedAt: new Date() },
  });
  res.json(post);
}));

router.post('/posts/:id/unpublish', verifyCsrf, asyncHandler(async (req, res) => {
  const post = await prisma.blogPost.update({ where: { id: req.params.id }, data: { isPublished: false } });
  res.json(post);
}));

// ─── Editor.js image upload endpoint ─────────────────────
router.post('/editor/upload-image', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'No file uploaded');
  const b64 = req.file.buffer.toString('base64');
  const dataUri = `data:${req.file.mimetype};base64,${b64}`;
  const result = await cloudinary.uploader.upload(dataUri, { folder: 'portfolio/blog' });
  res.json({ success: 1, file: { url: result.secure_url } });
}));

// Editor.js fetch-by-URL
router.post('/editor/fetch-url', asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) throw new AppError(400, 'URL required');
  res.json({ success: 1, file: { url } });
}));

export default router;
