import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error';
import { setCsrfCookie, getCsrfToken } from './middleware/csrf';
import { adminLimiter } from './middleware/rateLimit';
import { requireAuth } from './middleware/auth';

// Module routers (Phase 1+)
import authRouter from './modules/auth/auth.router';
import servicesRouter from './modules/services/services.router';
import projectsRouter from './modules/projects/projects.router';
import blogRouter from './modules/blog/blog.router';
import workExperienceRouter from './modules/work-experience/work-experience.router';
import skillsRouter from './modules/skills/skills.router';
import siteRouter from './modules/site/site.router';
import mediaRouter from './modules/media/media.router';
import uploadRouter from './modules/media/upload.router';
import galleryStripRouter from './modules/site/gallery-strip.router';

// Public site controllers (Phase 3+)
import homeController from './public/controllers/home';
import projectsController from './public/controllers/projects';
import blogController from './public/controllers/blog';
import feedController from './public/controllers/feed';

const app = express();

// ─── Security ──────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://res.cloudinary.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://res.cloudinary.com', 'https://unpkg.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        mediaSrc: ["'self'", 'https://res.cloudinary.com', 'https://unpkg.com'],
        connectSrc: ["'self'", 'https://api.cloudinary.com', 'https://unpkg.com'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
  }),
);

// ─── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── View engine (EJS) ────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public', 'views'));

// Expose helpers to all EJS templates
import { getSocialIcon, renderBlocks } from './utils/ejsHelpers';
app.locals.getSocialIcon = getSocialIcon;
app.locals.renderBlocks = renderBlocks;

// ─── Static files ─────────────────────────────────────────
app.use('/static', express.static(path.join(__dirname, '..', 'public', 'static')));

// ─── Health check ─────────────────────────────────────────
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

// ─── CSRF token endpoint ──────────────────────────────────
app.get('/api/admin/csrf', setCsrfCookie, getCsrfToken);

// ─── Admin API ────────────────────────────────────────────
app.use('/api/admin/auth', authRouter);
app.use('/api/admin', requireAuth, adminLimiter, setCsrfCookie);
app.use('/api/admin/services', servicesRouter);
app.use('/api/admin/projects', projectsRouter);
app.use('/api/admin/blog', blogRouter);
app.use('/api/admin/work-experience', workExperienceRouter);
app.use('/api/admin/skills', skillsRouter);
app.use('/api/admin/site', siteRouter);
app.use('/api/admin/gallery-strip', galleryStripRouter);
app.use('/api/admin/media', mediaRouter);
app.use('/api/admin/upload', uploadRouter);

// ─── Admin SPA (catch-all for /admin/*) ──────────────────
app.use(
  '/admin',
  express.static(path.join(__dirname, '..', 'public', 'admin')),
);
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html'));
});

// ─── Public site routes ───────────────────────────────────
app.get('/', homeController);
app.get('/projects', projectsController.index);
app.get('/projects/:slug', projectsController.detail);
app.get('/blog', blogController.index);
app.get('/blog/:slug', blogController.detail);
app.get('/rss.xml', feedController.rss);
app.get('/sitemap.xml', feedController.sitemap);

// ─── Error handler ────────────────────────────────────────
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`Portfolio CMS running at http://localhost:${env.PORT}`);
  logger.info(`Admin panel: http://localhost:${env.PORT}/admin`);
});

export default app;
