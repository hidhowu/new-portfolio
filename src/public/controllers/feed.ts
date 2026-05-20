import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { env } from '../../config/env';

async function rss(_req: Request, res: Response) {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true, deletedAt: null },
    orderBy: { publishedAt: 'desc' },
    take: 20,
    include: { category: { select: { name: true } } },
  });

  const items = posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${env.SITE_URL}/blog/${post.slug}</link>
      <guid>${env.SITE_URL}/blog/${post.slug}</guid>
      <pubDate>${post.publishedAt?.toUTCString() ?? post.createdAt.toUTCString()}</pubDate>
      <description><![CDATA[${post.excerpt}]]></description>
      ${post.category ? `<category>${post.category.name}</category>` : ''}
    </item>`).join('');

  res.set('Content-Type', 'application/rss+xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Josh Studios — Blog</title>
    <link>${env.SITE_URL}/blog</link>
    <description>Thoughts on design, code, and the craft of shipping work that lasts.</description>
    <atom:link href="${env.SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`);
}

async function sitemap(_req: Request, res: Response) {
  const [projects, posts] = await Promise.all([
    prisma.project.findMany({ where: { isPublished: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
    prisma.blogPost.findMany({ where: { isPublished: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
  ]);

  const staticUrls = ['/', '/projects', '/blog'].map(path => `
  <url>
    <loc>${env.SITE_URL}${path}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);

  const projectUrls = projects.map(p => `
  <url>
    <loc>${env.SITE_URL}/projects/${p.slug}</loc>
    <lastmod>${p.updatedAt.toISOString().split('T')[0]}</lastmod>
    <priority>0.7</priority>
  </url>`);

  const postUrls = posts.map(p => `
  <url>
    <loc>${env.SITE_URL}/blog/${p.slug}</loc>
    <lastmod>${p.updatedAt.toISOString().split('T')[0]}</lastmod>
    <priority>0.6</priority>
  </url>`);

  res.set('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${[...staticUrls, ...projectUrls, ...postUrls].join('')}
</urlset>`);
}

export default { rss, sitemap };
