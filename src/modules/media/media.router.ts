import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { verifyCsrf } from '../../middleware/csrf';
import { z } from 'zod';
import { prisma } from '../../config/db';
import { cloudinary, FOLDERS, CloudinaryFolder } from '../../config/cloudinary';
import { env } from '../../config/env';
import multer from 'multer';
import { AppError } from '../../middleware/error';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const signSchema = z.object({
  folder: z.string().min(1),
  resourceType: z.enum(['image', 'video', 'raw', 'auto']).default('image'),
});

const registerSchema = z.object({
  cloudinaryId: z.string().min(1),
  url: z.string().url(),
  type: z.enum(['IMAGE', 'FONT', 'AUDIO', 'VIDEO']),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  bytes: z.number().int().optional().nullable(),
  alt: z.string().optional().nullable(),
});

// Sign a direct browser → Cloudinary upload
router.post('/sign', verifyCsrf, asyncHandler(async (req, res) => {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError(503, 'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file.');
  }
  const { folder, resourceType } = signSchema.parse(req.body);
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, any> = {
    timestamp,
    folder: `portfolio/${folder}`,
  };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);
  res.json({
    signature,
    timestamp,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    folder: `portfolio/${folder}`,
    resourceType,
  });
}));

// Register a completed upload
router.post('/register', verifyCsrf, asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const asset = await prisma.mediaAsset.upsert({
    where: { cloudinaryId: data.cloudinaryId },
    create: data,
    update: data,
  });
  res.status(201).json(asset);
}));

// List assets
router.get('/', asyncHandler(async (req, res) => {
  const type = req.query.type as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = 30;
  const where = type ? { type: type as any } : {};
  const [total, assets] = await Promise.all([
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ]);
  res.json({ total, page, pageSize, assets });
}));

// Delete asset
router.delete('/:id', verifyCsrf, asyncHandler(async (req, res) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) throw new AppError(404, 'Asset not found');
  const resourceType = asset.type === 'FONT' ? 'raw' : asset.type === 'AUDIO' ? 'video' : 'image';
  await cloudinary.uploader.destroy(asset.cloudinaryId, { resource_type: resourceType });
  await prisma.mediaAsset.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// Editor.js image upload (multipart)
router.post('/editor/upload-image', upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'No file provided');
  const b64 = req.file.buffer.toString('base64');
  const dataUri = `data:${req.file.mimetype};base64,${b64}`;
  const result = await cloudinary.uploader.upload(dataUri, { folder: 'portfolio/blog' });
  await prisma.mediaAsset.create({
    data: {
      cloudinaryId: result.public_id,
      url: result.secure_url,
      type: 'IMAGE',
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    },
  });
  res.json({ success: 1, file: { url: result.secure_url } });
}));

export default router;
