import { prisma } from '../config/db';

// Fetches everything the shared nav + footer (and rich mobile menu) need.
// Public-facing controllers call this once and spread the result into res.render.
export async function getPageBundle() {
  const [
    heroSetting,
    aboutSetting,
    footerSetting,
    navSetting,
    ctaSetting,
    mobileMenuSetting,
    seoSetting,
    themeSetting,
    socialLinks,
    featuredProject,
    recentPost,
  ] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: 'hero' } }),
    prisma.siteSetting.findUnique({ where: { key: 'about' } }),
    prisma.siteSetting.findUnique({ where: { key: 'footer' } }),
    prisma.siteSetting.findUnique({ where: { key: 'nav' } }),
    prisma.siteSetting.findUnique({ where: { key: 'cta' } }),
    prisma.siteSetting.findUnique({ where: { key: 'mobileMenu' } }),
    prisma.siteSetting.findUnique({ where: { key: 'seo' } }),
    prisma.siteSetting.findUnique({ where: { key: 'theme' } }),
    prisma.socialLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.project.findFirst({
      where: { isFeatured: true, isPublished: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, title: true, category: true, coverImageUrl: true, coverColor: true },
    }),
    prisma.blogPost.findFirst({
      where: { isPublished: true, deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, title: true, excerpt: true, readMinutes: true, publishedAt: true, createdAt: true, category: { select: { name: true } } },
    }),
  ]);

  return {
    hero: (heroSetting?.value as any) ?? {},
    about: (aboutSetting?.value as any) ?? {},
    footer: (footerSetting?.value as any) ?? {},
    nav: (navSetting?.value as any) ?? {},
    cta: (ctaSetting?.value as any) ?? {},
    mobileMenu: (mobileMenuSetting?.value as any) ?? {},
    seo: (seoSetting?.value as any) ?? {},
    theme: (themeSetting?.value as any) ?? {},
    socialLinks,
    featuredProject,
    recentPost,
  };
}
