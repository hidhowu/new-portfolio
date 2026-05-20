import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

// ─── Hardcoded seed data extracted from backup JSX files ──────────────────────
// Source: backup/components-original/*.jsx

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hidhowugreat@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!Secure';

async function seedAdmin() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, passwordHash: hash, name: 'Josh' },
    update: { passwordHash: hash },
  });
  console.log('✓ Admin user seeded');
}

async function seedSiteSettings() {
  const settings = [
    {
      key: 'hero',
      value: {
        typingWords: ['websites', 'AI automations', 'SEO strategies', 'backend solutions', 'SaaS platforms'],
        heading: 'that grow businesses',
        subtitle: 'Transforming ideas into elegant, high-performance digital solutions that drive real results.',
        showSubtitle: true,
        primaryCta: { label: 'Book a Call', href: '/#contact' },
        ghostCtas: [
          { label: 'GitHub', href: '#' },
          { label: 'Resume', href: '#' },
        ],
        profileImageUrl: null,
      },
    },
    {
      key: 'about',
      value: {
        lines: [
          "I'm a designer & developer who thrives",
          'at the intersection of aesthetics and engineering.',
          'From custom websites to AI-powered automations,',
          "I build digital products that don't just look good —",
          'they perform, convert, and scale.',
          'Every pixel is intentional.',
          'Every interaction, purposeful.',
        ],
      },
    },
    {
      key: 'footer',
      value: {
        logoUrl: '/uploads/logo.png',
        copyrightText: '© 2026 All rights reserved.',
      },
    },
    {
      key: 'music',
      value: {
        trackUrl: '',
        title: 'Midnight Drive',
        artist: 'Lo-Fi Chill Beats',
        durationSec: 252,
        artUrl: null,
        autoplayMuted: false,
      },
    },
    {
      key: 'theme',
      value: {
        fontFamily: 'DM Sans',
        patternStyle: 'dot',
        primaryColor: '#1B6B2E',
      },
    },
    {
      key: 'nav',
      value: {
        links: [
          { label: 'Home', href: '/#home', isActive: true },
          { label: 'About', href: '/#about', isActive: true },
          { label: 'Services', href: '/#services', isActive: true },
          { label: 'Projects', href: '/projects', isActive: true },
          { label: 'Skills', href: '/#skills', isActive: true },
          { label: 'Blog', href: '/blog', isActive: true },
        ],
      },
    },
    {
      key: 'cta',
      value: {
        heading: 'Have a project in mind?',
        subheading: "Need a website, automation, or backend solution? Let's chat and bring your vision to life.",
        buttonLabel: 'Book a Call',
        buttonHref: '#',
      },
    },
    {
      key: 'stats',
      value: {
        items: [
          { value: '42+', label: 'Projects shipped' },
          { value: '8', label: 'Industries served' },
          { value: '5yrs', label: 'Building products' },
          { value: '100%', label: 'Repeat-client rate' },
        ],
      },
    },
    {
      key: 'seo',
      value: {
        siteTitle: 'Josh Studios — Designer & Developer',
        description: 'Designer & developer building thoughtful digital products that perform, convert, and scale.',
        ogImageUrl: null,
        twitterHandle: '',
      },
    },
    {
      key: 'newsletter',
      value: {
        enabled: false,
        heading: 'Subscribe to our newsletter',
        subheading: 'Get weekly thoughts on design, code, and business.',
        provider: 'none',
        apiKey: null,
      },
    },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value },
    });
  }
  console.log('✓ Site settings seeded');
}

async function seedSocialLinks() {
  const links = [
    { name: 'GitHub', url: '#', iconKey: 'github', sortOrder: 0 },
    { name: 'X', url: '#', iconKey: 'x', sortOrder: 1 },
    { name: 'Behance', url: '#', iconKey: 'behance', sortOrder: 2 },
    { name: 'Dribbble', url: '#', iconKey: 'dribbble', sortOrder: 3 },
    { name: 'LinkedIn', url: '#', iconKey: 'linkedin', sortOrder: 4 },
  ];
  await prisma.socialLink.deleteMany();
  await prisma.socialLink.createMany({ data: links });
  console.log('✓ Social links seeded');
}

async function seedServices() {
  const categories = [
    {
      slug: 'websites',
      name: 'Websites',
      sortOrder: 0,
      subservices: [
        'Figma to Website', 'WooCommerce', 'Booking Sites',
        'Shopify Stores', 'Landing Pages', 'WordPress',
      ],
    },
    {
      slug: 'automation',
      name: 'Automation',
      sortOrder: 1,
      subservices: ['n8n Workflows', 'Make.com', 'Lead Gen', 'AI Chatbots'],
    },
    {
      slug: 'backend',
      name: 'Backend',
      sortOrder: 2,
      subservices: ['Node.js APIs', 'SaaS MVPs', 'Payment Integration'],
    },
  ];

  for (const cat of categories) {
    const { subservices, ...catData } = cat;
    const created = await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      create: catData,
      update: catData,
    });
    await prisma.subservice.deleteMany({ where: { categoryId: created.id } });
    await prisma.subservice.createMany({
      data: subservices.map((name, i) => ({ categoryId: created.id, name, sortOrder: i })),
    });
  }
  console.log('✓ Services seeded');
}

async function seedSkills() {
  const groups = [
    {
      name: 'Websites',
      tools: ['HTML', 'CSS', 'JavaScript', 'React', 'Next.js', 'WordPress', 'Elementor', 'Divi', 'Shopify', 'Tailwind'],
    },
    {
      name: 'Automation',
      tools: ['n8n', 'Make.com', 'Zapier', 'Python', 'AI/LLM', 'API Integration'],
    },
    {
      name: 'Backend',
      tools: ['Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'REST API', 'Firebase'],
    },
  ];

  await prisma.tool.deleteMany();
  await prisma.toolGroup.deleteMany();

  for (const [i, group] of groups.entries()) {
    const created = await prisma.toolGroup.create({ data: { name: group.name, sortOrder: i } });
    await prisma.tool.createMany({
      data: group.tools.map((name, j) => ({ groupId: created.id, name, sortOrder: j })),
    });
  }
  console.log('✓ Skills & tools seeded');
}

async function seedWorkExperience() {
  const entries = [
    {
      role: 'Senior UI/UX Designer',
      company: 'TechCorp Global',
      period: '2023 — Present',
      description: 'Leading the design system team, creating scalable component libraries and establishing design standards across 12 product teams.',
      sortOrder: 0,
    },
    {
      role: 'Frontend Developer & Designer',
      company: 'DesignStudio Inc.',
      period: '2021 — 2023',
      description: 'Built and shipped 20+ client projects ranging from marketing websites to complex SaaS dashboards, bridging design and engineering.',
      sortOrder: 1,
    },
    {
      role: 'Junior UI Designer',
      company: 'StartupHub',
      period: '2019 — 2021',
      description: 'Designed mobile and web interfaces for early-stage startups, iterating quickly through user testing and rapid prototyping.',
      sortOrder: 2,
    },
  ];

  await prisma.workExperience.deleteMany();
  await prisma.workExperience.createMany({ data: entries });
  console.log('✓ Work experience seeded');
}

async function seedProjects() {
  const projects = [
    { slug: 'cloudsync-pro', title: 'CloudSync Pro', category: 'SaaS Platform', shortDesc: 'Cloud storage and collaboration platform with real-time sync.', coverColor: '#1a3a5a', isFeatured: true, isPublished: true, gridSize: 'TALL' as const, sortOrder: 0, client: 'TechVentures Inc.', year: 2025, role: 'Design & Development', duration: '3 months' },
    { slug: 'nexos-ai', title: 'Nexos AI', category: 'AI Dashboard', shortDesc: 'Intelligent analytics dashboard powered by machine learning.', coverColor: '#1B6B2E', isFeatured: true, isPublished: true, gridSize: 'STD' as const, sortOrder: 1 },
    { slug: 'invoicedesk', title: 'InvoiceDesk', category: 'Fintech App', shortDesc: 'Streamlined invoice management for small businesses.', coverColor: '#4a2a5a', isFeatured: true, isPublished: true, gridSize: 'STD' as const, sortOrder: 2 },
    { slug: 'ecostream', title: 'EcoStream', category: 'Sustainability', shortDesc: 'Environmental impact tracking and reporting platform.', coverColor: '#2a5a4a', isFeatured: true, isPublished: true, gridSize: 'STD' as const, sortOrder: 3 },
    { slug: 'healthpulse', title: 'HealthPulse', category: 'Health Tech', shortDesc: 'Personal health monitoring and wellness tracking app.', coverColor: '#5a3a2a', isFeatured: true, isPublished: true, gridSize: 'WIDE' as const, sortOrder: 4 },
  ];

  for (const p of projects) {
    await prisma.project.upsert({
      where: { slug: p.slug },
      create: p,
      update: p,
    });
  }

  // Seed CloudSync Pro with detail content
  const cloudSync = await prisma.project.findUnique({ where: { slug: 'cloudsync-pro' } });
  if (cloudSync) {
    await prisma.projectColor.deleteMany({ where: { projectId: cloudSync.id } });
    await prisma.projectColor.createMany({
      data: [
        { projectId: cloudSync.id, label: 'Primary', hex: '#1a3a5a', isPrimary: true, sortOrder: 0 },
        { projectId: cloudSync.id, label: 'Accent', hex: '#2a6a9a', sortOrder: 1 },
        { projectId: cloudSync.id, label: 'Success', hex: '#1B6B2E', sortOrder: 2 },
        { projectId: cloudSync.id, label: 'Border', hex: '#E8E6E1', sortOrder: 3 },
        { projectId: cloudSync.id, label: 'Text', hex: '#1A1A1A', sortOrder: 4 },
      ],
    });

    await prisma.projectTypography.upsert({
      where: { projectId: cloudSync.id },
      create: {
        projectId: cloudSync.id,
        fontFamily: 'DM Sans',
        samples: [
          { label: 'Heading Display', sizePx: 32, weight: 700, letterSpacing: '-0.02em', sampleText: 'The quick brown fox' },
          { label: 'Section Title', sizePx: 20, weight: 600, letterSpacing: 'normal', sampleText: 'Section Title Text' },
          { label: 'Body', sizePx: 16, weight: 400, letterSpacing: 'normal', sampleText: 'Body text at 16px regular' },
          { label: 'Caption', sizePx: 13, weight: 400, letterSpacing: 'normal', sampleText: 'Caption Secondary' },
        ],
      },
      update: {},
    });

    await prisma.projectMetric.deleteMany({ where: { projectId: cloudSync.id } });
    await prisma.projectMetric.createMany({
      data: [
        { projectId: cloudSync.id, value: '+47%', label: 'User retention increase', sortOrder: 0 },
        { projectId: cloudSync.id, value: '3.2x', label: 'Faster task completion', sortOrder: 1 },
        { projectId: cloudSync.id, value: '+120%', label: 'Revenue growth (Q1)', sortOrder: 2 },
      ],
    });

    await prisma.project.update({
      where: { id: cloudSync.id },
      data: {
        spacingScale: [{ label: '4px', valuePx: 4 }, { label: '8px', valuePx: 8 }, { label: '16px', valuePx: 16 }, { label: '24px', valuePx: 24 }],
        showImpact: true,
        impactIntro: 'CloudSync Pro delivered measurable results within the first quarter of launch.',
      },
    });
  }

  console.log('✓ Projects seeded');
}

async function seedBlog() {
  const designCat = await prisma.blogCategory.upsert({
    where: { slug: 'design' },
    create: { slug: 'design', name: 'Design', sortOrder: 0 },
    update: {},
  });
  const devCat = await prisma.blogCategory.upsert({
    where: { slug: 'development' },
    create: { slug: 'development', name: 'Development', sortOrder: 1 },
    update: {},
  });
  const sysCat = await prisma.blogCategory.upsert({
    where: { slug: 'systems' },
    create: { slug: 'systems', name: 'Systems', sortOrder: 2 },
    update: {},
  });

  const posts = [
    {
      slug: 'the-future-of-web-design-in-2026',
      title: 'The Future of Web Design in 2026',
      excerpt: 'How adaptive interfaces, AI workflows, and performance-first thinking are reshaping the discipline.',
      categoryId: designCat.id,
      isFeatured: true,
      isPublished: true,
      readMinutes: 5,
      publishedAt: new Date('2026-05-12'),
      contentJson: {
        blocks: [
          { type: 'paragraph', data: { text: 'Web design in 2026 is no longer a static craft. It is a living system of rules, constraints, and adaptive patterns that respond to context, device, and user intent in real time.' } },
          { type: 'header', data: { text: 'The Rise of Adaptive Interfaces', level: 2 } },
          { type: 'paragraph', data: { text: 'Modern design systems don\'t ship fixed layouts — they ship constraints. The designer\'s job has shifted from specifying pixels to defining relationships.' } },
          { type: 'quote', data: { text: "Design is no longer about creating fixed layouts — it's about defining rules for how interfaces should behave across infinite contexts.", caption: '' } },
          { type: 'header', data: { text: 'Performance as a Design Principle', level: 2 } },
          { type: 'paragraph', data: { text: 'Speed is no longer a concern for engineers alone. Every design decision — from image weight to animation complexity — has a performance cost that translates directly to user experience.' } },
          { type: 'header', data: { text: 'Key Strategies', level: 3 } },
          { type: 'list', data: { style: 'unordered', items: ['Design with real content, not lorem ipsum', 'Build and test on low-end hardware', 'Treat Core Web Vitals as design constraints', 'Collaborate with engineers from the first wireframe'] } },
          { type: 'header', data: { text: 'AI in the Design Workflow', level: 2 } },
          { type: 'paragraph', data: { text: 'AI tools are not replacing designers — they are compressing the time between idea and prototype. The designers winning today are those who have learned to direct these tools with precision.' } },
        ],
      },
    },
    {
      slug: 'building-accessible-saas-dashboards',
      title: 'Building Accessible SaaS Dashboards',
      excerpt: 'Practical techniques for shipping dashboards that work for everyone, including users with disabilities.',
      categoryId: devCat.id,
      isPublished: true,
      readMinutes: 8,
      publishedAt: new Date('2026-04-28'),
      contentJson: {
        blocks: [
          { type: 'paragraph', data: { text: 'Accessibility in SaaS products is often treated as an afterthought. This is a mistake that compounds over time.' } },
          { type: 'header', data: { text: 'Why Dashboards Are Hard to Accessibilize', level: 2 } },
          { type: 'paragraph', data: { text: 'Dashboards are dense. They combine charts, tables, filters, and real-time data updates into a single surface. Each of these elements has its own accessibility challenges.' } },
        ],
      },
    },
    {
      slug: 'design-systems-that-actually-scale',
      title: 'Design Systems That Actually Scale',
      excerpt: 'Most design systems die in the first year. Here\'s what separates the ones that last.',
      categoryId: sysCat.id,
      isPublished: true,
      readMinutes: 6,
      publishedAt: new Date('2026-03-15'),
      contentJson: {
        blocks: [
          { type: 'paragraph', data: { text: 'A design system that no one uses is just a library. The hard part is not building it — it\'s making it indispensable to the teams it serves.' } },
          { type: 'header', data: { text: 'Start With the Hardest Component', level: 2 } },
          { type: 'paragraph', data: { text: 'Most teams start with buttons and colors. That\'s fine. But the real test of a design system is whether it can handle the complex cases: data tables, multi-step forms, modals with nested state.' } },
        ],
      },
    },
  ];

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: post,
      update: post,
    });
  }
  console.log('✓ Blog posts seeded');
}

async function seedGalleryStrip() {
  await prisma.galleryStripItem.deleteMany();
  const items = [
    // Row 0
    { label: 'SaaS Dashboard', color: '#1a3a4a', row: 0, sortOrder: 0 },
    { label: 'E-commerce Store', color: '#2d1b3d', row: 0, sortOrder: 1 },
    { label: 'Landing Page', color: '#1B6B2E', row: 0, sortOrder: 2 },
    { label: 'Mobile Banking', color: '#3a2a1a', row: 0, sortOrder: 3 },
    // Row 1
    { label: 'Portfolio Site', color: '#1a2a3d', row: 1, sortOrder: 0 },
    { label: 'Health App', color: '#2E4A3A', row: 1, sortOrder: 1 },
    { label: 'Travel Platform', color: '#3d2a2a', row: 1, sortOrder: 2 },
    { label: 'AI Dashboard', color: '#1a3a3a', row: 1, sortOrder: 3 },
    // Row 2
    { label: 'Food Delivery', color: '#3a3a1a', row: 2, sortOrder: 0 },
    { label: 'Social Network', color: '#2a1a3a', row: 2, sortOrder: 1 },
    { label: 'Fintech App', color: '#1a2a2a', row: 2, sortOrder: 2 },
    { label: 'Real Estate', color: '#3a2a3a', row: 2, sortOrder: 3 },
  ];
  await prisma.galleryStripItem.createMany({ data: items });
  console.log('✓ Gallery strip seeded');
}

async function main() {
  console.log('🌱 Seeding database...\n');
  await seedAdmin();
  await seedSiteSettings();
  await seedSocialLinks();
  await seedServices();
  await seedSkills();
  await seedWorkExperience();
  await seedProjects();
  await seedBlog();
  await seedGalleryStrip();
  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
