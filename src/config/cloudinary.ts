import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export const FOLDERS = {
  projects: 'portfolio/projects',
  blog: 'portfolio/blog',
  tools: 'portfolio/tools',
  fonts: 'portfolio/fonts',
  audio: 'portfolio/audio',
  site: 'portfolio/site',
  gallery: 'portfolio/gallery',
} as const;

export type CloudinaryFolder = typeof FOLDERS[keyof typeof FOLDERS];
