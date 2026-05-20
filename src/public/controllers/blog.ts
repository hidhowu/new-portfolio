import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { renderBlocks } from '../../utils/renderBlocks';
import { normalizeMusic } from '../../utils/normalize-music';
import { getPageBundle } from '../../utils/page-bundle';

async function index(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const categorySlug = req.query.category as string;
    const pageSize = 9;

    const [bundle, categories, musicSetting] = await Promise.all([
      getPageBundle(),
      prisma.blogCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.siteSetting.findUnique({ where: { key: 'music' } }),
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
      ...bundle,
      posts,
      featuredPost,
      categories,
      currentCategory: categorySlug ?? 'all',
      page,
      totalPages: Math.ceil(total / pageSize),
      music: normalizeMusic(musicSetting?.value),
    });
  } catch (err) {
    console.error('Blog index error:', err);
    res.status(500).send('Internal server error');
  }
}

async function detail(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const [bundle, post, musicSetting] = await Promise.all([
      getPageBundle(),
      prisma.blogPost.findFirst({
        where: { slug, isPublished: true, deletedAt: null },
        include: { category: true },
      }),
      prisma.siteSetting.findUnique({ where: { key: 'music' } }),
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

    res.render('blog-detail', {
      ...bundle,
      post,
      contentHtml,
      relatedPosts,
      music: normalizeMusic(musicSetting?.value),
    });
  } catch (err) {
    console.error('Blog detail error:', err);
    res.status(500).send('Internal server error');
  }
}

export default { index, detail };
