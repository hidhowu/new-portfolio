import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { normalizeMusic } from '../../utils/normalize-music';
import { getPageBundle } from '../../utils/page-bundle';

async function index(req: Request, res: Response) {
  try {
    const [bundle, projects, statsSetting, musicSetting] = await Promise.all([
      getPageBundle(),
      prisma.project.findMany({
        where: { isPublished: true, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.siteSetting.findUnique({ where: { key: 'stats' } }),
      prisma.siteSetting.findUnique({ where: { key: 'music' } }),
    ]);

    res.render('projects-index', {
      ...bundle,
      projects,
      stats: (statsSetting?.value as any)?.items ?? [],
      navSetting: bundle.nav,
      music: normalizeMusic(musicSetting?.value),
    });
  } catch (err) {
    console.error('Projects index error:', err);
    res.status(500).send('Internal server error');
  }
}

async function detail(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const [bundle, project, musicSetting] = await Promise.all([
      getPageBundle(),
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
      prisma.siteSetting.findUnique({ where: { key: 'music' } }),
    ]);

    if (!project) return res.status(404).render('404', { message: 'Project not found' });

    res.render('project-detail', {
      ...bundle,
      project,
      music: normalizeMusic(musicSetting?.value),
    });
  } catch (err) {
    console.error('Project detail error:', err);
    res.status(500).send('Internal server error');
  }
}

export default { index, detail };
