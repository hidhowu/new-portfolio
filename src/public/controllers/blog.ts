import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { renderBlocks } from '../../utils/renderBlocks';
import { normalizeMusic } from '../../utils/normalize-music';

async function index(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const categorySlug = req.query.category as string;
    const pageSize = 9;

    const [categories, navSetting, socialLinks, musicSetting, seoSetting, themeSetting, heroSetting] = await Promise.all([
      prisma.blogCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.siteSetting.findUnique({ where: { key: 'nav' } }),
      prisma.socialLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.siteSetting.findUnique({ where: { key: 'music' } }),
      prisma.siteSetting.findUnique({ where: { key: 'seo' } }),
      prisma.siteSetting.findUnique({ where: { key: 'theme' } }),
      prisma.siteSetting.findUnique({ where: { key: 'hero' } }),
    ]);

    const categoryFilter = categorySlug
      ? await prisma.blogCategory.findUnique({ where: { slug: categorySlug } })
      : null;

    const where: any = { isPublished: true, deletedAt: null };
    if (categoryFilter) where.categoryId = categoryFilter.id;

    const [total, featuredPost, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findFirst({
        where: { ...where, isFeatured: true },
        include: { category: { select: { name: true } } },
      }),
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: { category: { select: { name: true } } },
      }),
    ]);

    res.render('blog-index', {
      posts,
      featuredPost,
      categories,
      currentCategory: categorySlug ?? 'all',
      page,
      totalPages: Math.ceil(total / pageSize),
      nav: (navSetting?.value as any) ?? {},
      socialLinks,
      music: normalizeMusic(musicSetting?.value),
      seo: (seoSetting?.value as any) ?? {},
      theme: (themeSetting?.value as any) ?? {},
      hero: (heroSetting?.value as any) ?? {},
    });
  } catch (err) {
    console.error('Blog index error:', err);
    res.status(500).send('Internal server error');
  }
}

async function detail(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const [post, navSetting, socialLinks, musicSetting, seoSetting, themeSetting, heroSetting] = await Promise.all([
      prisma.blogPost.findFirst({
        where: { slug, isPublished: true, deletedAt: null },
        include: { category: true },
      }),
      prisma.siteSetting.findUnique({ where: { key: 'nav' } }),
      prisma.socialLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.siteSetting.findUnique({ where: { key: 'music' } }),
      prisma.siteSetting.findUnique({ where: { key: 'seo' } }),
      prisma.siteSetting.findUnique({ where: { key: 'theme' } }),
      prisma.siteSetting.findUnique({ where: { key: 'hero' } }),
    ]);

    if (!post) return res.status(404).render('404', { message: 'Post not found' });

    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
        id: { not: post.id },
        ...(post.categoryId ? { categoryId: post.categoryId } : {}),
      },
      take: 3,
      orderBy: { publishedAt: 'desc' },
      include: { category: { select: { name: true } } },
    });

    const contentHtml = renderBlocks(post.contentJson as any);

    // Increment likes (simple counter — just expose on a separate endpoint in prod)
    res.render('blog-detail', {
      post,
      contentHtml,
      relatedPosts,
      nav: (navSetting?.value as any) ?? {},
      socialLinks,
      music: normalizeMusic(musicSetting?.value),
      seo: (seoSetting?.value as any) ?? {},
      theme: (themeSetting?.value as any) ?? {},
      hero: (heroSetting?.value as any) ?? {},
    });
  } catch (err) {
    console.error('Blog detail error:', err);
    res.status(500).send('Internal server error');
  }
}

export default { index, detail };
