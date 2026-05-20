import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../utils/asyncHandler';
import { cloudinary } from '../../config/cloudinary';
import { prisma } from '../../config/db';
import { AppError } from '../../middleware/error';
import { env } from '../../config/env';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

function detectResourceType(mimetype: string): 'image' | 'video' | 'raw' {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/') || mimetype.startsWith('video/')) return 'video';
  return 'raw'; // fonts, etc.
}

function detectMediaType(mimetype: string): 'IMAGE' | 'FONT' | 'AUDIO' | 'VIDEO' | 'SVG' {
  if (mimetype === 'image/svg+xml') return 'SVG';
  if (mimetype.startsWith('image/')) return 'IMAGE';
  if (mimetype.startsWith('audio/')) return 'AUDIO';
  if (mimetype.startsWith('video/')) return 'VIDEO';
  if (mimetype.includes('font') || mimetype === 'application/octet-stream') return 'FONT';
  return 'IMAGE';
}

// POST /api/admin/media/upload?folder=projects|blog|tools|fonts|audio|site|gallery
router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'No file provided');

  if (!env.CLOUDINARY_CLOUD_NAME || env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
    throw new AppError(503, 'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file.');
  }

  const folder = `portfolio/${req.query.folder ?? 'site'}`;
  const resourceType = detectResourceType(req.file.mimetype);
  const mediaType = detectMediaType(req.file.mimetype);

  const b64 = req.file.buffer.toString('base64');
  const dataUri = `data:${req.file.mimetype};base64,${b64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: resourceType,
  });

  const asset = await prisma.mediaAsset.upsert({
    where: { cloudinaryId: result.public_id },
    create: {
      cloudinaryId: result.public_id,
      url: result.secure_url,
      type: mediaType as any,
      width: result.width ?? null,
      height: result.height ?? null,
      bytes: result.bytes ?? null,
    },
    update: { url: result.secure_url },
  });

  res.json({ url: result.secure_url, cloudinaryId: result.public_id, assetId: asset.id, type: mediaType });
}));

export default router;
