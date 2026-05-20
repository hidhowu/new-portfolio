import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { normalizeMusic } from '../../utils/normalize-music';

export default async function homeController(req: Request, res: Response) {
  try {
    const [
      heroSetting,
      aboutSetting,
      themeSetting,
      ctaSetting,
      musicSetting,
      navSetting,
      footerSetting,
      seoSetting,
      resumeSetting,
      mobileMenuSetting,
      categories,
      featuredProjects,
      toolGroups,
      workExperience,
      recentPosts,
      socialLinks,
      galleryItems,
    ] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: 'hero' } }),
      prisma.siteSetting.findUnique({ where: { key: 'about' } }),
      prisma.siteSetting.findUnique({ where: { key: 'theme' } }),
      prisma.siteSetting.findUnique({ where: { key: 'cta' } }),
      prisma.siteSetting.findUnique({ where: { key: 'music' } }),
      prisma.siteSetting.findUnique({ where: { key: 'nav' } }),
      prisma.siteSetting.findUnique({ where: { key: 'footer' } }),
      prisma.siteSetting.findUnique({ where: { key: 'seo' } }),
      prisma.siteSetting.findUnique({ where: { key: 'resume' } }),
      prisma.siteSetting.findUnique({ where: { key: 'mobileMenu' } }),
      prisma.serviceCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { subservices: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
      }),
      prisma.project.findMany({
        where: { isFeatured: true, isPublished: true, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        take: 5,
      }),
      prisma.toolGroup.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { tools: { orderBy: { sortOrder: 'asc' } } },
      }),
      prisma.workExperience.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.blogPost.findMany({
        where: { isPublished: true, deletedAt: null },
        orderBy: { publishedAt: 'desc' },
        take: 3,
        include: { category: { select: { name: true } } },
      }),
      prisma.socialLink.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.galleryStripItem.findMany({
        where: { isActive: true },
        orderBy: [{ row: 'asc' }, { sortOrder: 'asc' }],
      }),
    ]);

    const hero = (heroSetting?.value as any) ?? {};
    const about = (aboutSetting?.value as any) ?? {};
    const theme = (themeSetting?.value as any) ?? {};
    const cta = (ctaSetting?.value as any) ?? {};
    const music = normalizeMusic(musicSetting?.value);
    const nav = (navSetting?.value as any) ?? {};
    const footer = (footerSetting?.value as any) ?? {};
    const seo = (seoSetting?.value as any) ?? {};
    const resume = (resumeSetting?.value as any) ?? {};
    const mobileMenu = (mobileMenuSetting?.value as any) ?? {};

    // Shape data to match what the JSX components expect
    const portfolioData = {
      hero,
      about,
      theme,
      cta,
      music,
      nav,
      footer,
      resume,
      mobileMenu,

      // Services: [{title, items:[{name, desc, upworkUrl?}]}]
      services: categories.map(cat => ({
        title: cat.name,
        items: cat.subservices.map(sub => ({
          name: sub.name,
          desc: sub.description ?? '',
          upworkUrl: sub.externalUrl ?? null,
        })),
      })),

      // Projects: [{title, category, desc, color, imageUrl, slug, tall}]
      projects: featuredProjects.map((p, i) => ({
        title: p.title,
        category: p.category,
        desc: p.shortDesc,
        color: p.coverColor ?? '#1a3a5a',
        imageUrl: p.coverImageUrl ?? null,
        slug: p.slug,
        tall: p.gridSize === 'TALL',
        wide: p.gridSize === 'WIDE',
      })),

      // Skills: [{name, skills:[{name, iconUrl}]}]
      skillGroups: toolGroups.map(g => ({
        name: g.name,
        skills: g.tools.map(t => ({ name: t.name, iconUrl: t.iconUrl ?? null })),
      })),

      // Work experience: [{role, company, period, desc}]
      workExperience: workExperience.map(w => ({
        role: w.role,
        company: w.company,
        period: w.period,
        desc: w.description,
        logoUrl: w.logoUrl ?? null,
      })),

      // Blog posts: [{title, date, tag, readTime, slug}]
      recentPosts: recentPosts.map(p => ({
        title: p.title,
        date: (p.publishedAt ?? p.createdAt).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
        tag: p.category?.name ?? 'Article',
        readTime: `${p.readMinutes} min`,
        slug: p.slug,
      })),

      // Social links: [{name, href, iconKey}]
      socials: socialLinks.map(s => ({
        name: s.name,
        href: s.url,
        iconKey: s.iconKey,
      })),

      // SEO surfaced to the client React for tab-title updates etc.
      seo,

      // Gallery items: [{label, color, imageUrl, row}]
      galleryItems: galleryItems.map(g => ({
        label: g.label,
        color: g.color ?? '#1a3a4a',
        imageUrl: g.imageUrl ?? null,
        row: g.row,
      })),
    };

    res.render('home', { portfolioData, hero, theme, seo });
  } catch (err) {
    console.error('Home controller error:', err);
    res.status(500).send('Internal server error — check server console');
  }
}
