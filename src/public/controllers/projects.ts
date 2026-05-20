import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { normalizeMusic } from '../../utils/normalize-music';

async function index(req: Request, res: Response) {
  try {
    const [projects, statsSetting, navSetting, socialLinks, musicSetting, seoSetting, themeSetting, heroSetting] = await Promise.all([
      prisma.project.findMany({
        where: { isPublished: true, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.siteSetting.findUnique({ where: { key: 'stats' } }),
      prisma.siteSetting.findUnique({ where: { key: 'nav' } }),
      prisma.socialLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.siteSetting.findUnique({ where: { key: 'music' } }),
      prisma.siteSetting.findUnique({ where: { key: 'seo' } }),
      prisma.siteSetting.findUnique({ where: { key: 'theme' } }),
      prisma.siteSetting.findUnique({ where: { key: 'hero' } }),
    ]);

    res.render('projects-index', {
      projects,
      stats: (statsSetting?.value as any)?.items ?? [],
      nav: statsSetting?.value ?? {},
      navSetting: (navSetting?.value as any) ?? {},
      socialLinks,
      music: normalizeMusic(musicSetting?.value),
      seo: (seoSetting?.value as any) ?? {},
      theme: (themeSetting?.value as any) ?? {},
      hero: (heroSetting?.value as any) ?? {},
    });
  } catch (err) {
    console.error('Projects index error:', err);
    res.status(500).send('Internal server error');
  }
}

async function detail(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const [project, navSetting, socialLinks, musicSetting, seoSetting, themeSetting, heroSetting] = await Promise.all([
      prisma.project.findFirst({
        where: { slug, isPublished: true, deletedAt: null },
        include: {
          typography: true,
          colors: { orderBy: { sortOrder: 'asc' } },
          galleryImages: { orderBy: { sortOrder: 'asc' } },
          impactMetrics: { orderBy: { sortOrder: 'asc' } },
          relatedProjects: {
            where: { isPublished: true, deletedAt: null },
            select: { id: true, slug: true, title: true, category: true, coverImageUrl: true, coverColor: true, year: true },
          },
        },
      }),
      prisma.siteSetting.findUnique({ where: { key: 'nav' } }),
      prisma.socialLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.siteSetting.findUnique({ where: { key: 'music' } }),
      prisma.siteSetting.findUnique({ where: { key: 'seo' } }),
      prisma.siteSetting.findUnique({ where: { key: 'theme' } }),
      prisma.siteSetting.findUnique({ where: { key: 'hero' } }),
    ]);

    if (!project) return res.status(404).render('404', { message: 'Project not found' });

    res.render('project-detail', {
      project,
      nav: (navSetting?.value as any) ?? {},
      socialLinks,
      music: normalizeMusic(musicSetting?.value),
      seo: (seoSetting?.value as any) ?? {},
      theme: (themeSetting?.value as any) ?? {},
      hero: (heroSetting?.value as any) ?? {},
    });
  } catch (err) {
    console.error('Project detail error:', err);
    res.status(500).send('Internal server error');
  }
}

export default { index, detail };
