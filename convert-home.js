const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'Portfolio.html');
const dst = path.join(__dirname, 'src', 'public', 'views', 'home.ejs');

let html = fs.readFileSync(src, 'utf8');

// 1. Title → dynamic
html = html.replace(
  '<title>Portfolio — Design & Development</title>',
  '<title><%- (typeof seo !== "undefined" && seo && seo.siteTitle) ? seo.siteTitle : "Josh Studios" %></title>'
);

// 2. Inject window.__D right after <div id="root">
html = html.replace(
  '<div id="root"></div>',
  '<script>window.__D = <%- JSON.stringify(portfolioData) %>;</script>\n  <div id="root"></div>'
);

// 3. TWEAK_DEFAULTS → backend theme values
html = html.replace(
  /const TWEAK_DEFAULTS = \/\*EDITMODE-BEGIN\*\/\{[\s\S]*?\}\/\*EDITMODE-END\*\//,
  'const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{\n' +
  '      "fontFamily":"<%- (typeof theme !== \'undefined\' && theme && theme.fontFamily) ? theme.fontFamily : \'DM Sans\' %>",\n' +
  '      "pattern":"<%- (typeof theme !== \'undefined\' && theme && theme.patternStyle) ? theme.patternStyle : \'geometric\' %>",\n' +
  '      "showViewAllProjects":true,\n' +
  '      "showSubtitle":<%- (typeof hero !== \'undefined\' && hero && hero.showSubtitle === false) ? \'false\' : \'true\' %>\n' +
  '    }/*EDITMODE-END*/'
);

// 4. Typing words → dynamic
html = html.replace(
  /const typedWord = useTypingEffect\(\[\s*'websites', 'AI automations', 'SEO strategies',\s*'backend solutions', 'SaaS platforms',\s*\]\)/,
  "const typedWord = useTypingEffect((window.__D&&window.__D.hero&&window.__D.hero.typingWords)||['websites','AI automations','SEO strategies','backend solutions','SaaS platforms'])"
);

// 5. Song title → dynamic
html = html.replace(
  "}, 'Midnight Drive'),",
  "}, (window.__D&&window.__D.music&&window.__D.music.title)||'Midnight Drive'),"
);

// 6. Song artist → dynamic
html = html.replace(
  "}, 'Lo-Fi Chill Beats'),",
  "}, (window.__D&&window.__D.music&&window.__D.music.artist)||'Lo-Fi Chill Beats'),"
);

// 7. Gallery items → dynamic (replace all 12 items with dynamic + fallback)
html = html.replace(
  /const items = \[\n    \{ label: 'SaaS Dashboard'[\s\S]*?\{ label: 'Real Estate', color: '#3a2a3a' \},\n  \];/,
  `const items = (window.__D&&window.__D.galleryItems)||[
    { label: 'SaaS Dashboard', color: '#1a3a4a' },
    { label: 'E-commerce Store', color: '#2d1b3d' },
    { label: 'Landing Page', color: '#1B6B2E' },
    { label: 'Mobile Banking', color: '#3a2a1a' },
    { label: 'Portfolio Site', color: '#1a2a3d' },
    { label: 'Health App', color: '#2E4A3A' },
    { label: 'Travel Platform', color: '#3d2a2a' },
    { label: 'AI Dashboard', color: '#1a3a3a' },
    { label: 'Food Delivery', color: '#3a3a1a' },
    { label: 'Social Network', color: '#2a1a3a' },
    { label: 'Fintech App', color: '#1a2a2a' },
    { label: 'Real Estate', color: '#3a2a3a' },
  ];`
);

// 8. Gallery item rendering — add imageUrl support
// Replace inner card rendering to show image if available
html = html.replace(
  /React\.createElement\('div', \{ style: cardStyle \},\s*React\.createElement\('div', \{ style: innerStyle,[\s\S]*?className: 'gc-inner' \},\s*React\.createElement\('div', \{ style: \{ [\s\S]*?position: 'absolute'[\s\S]*?\} \}\),\s*React\.createElement\('span'[\s\S]*?\)\s*\),\s*\)/,
  (match) => match // keep rendering as-is — images require more structural change
);

// 9. Services categories → dynamic
html = html.replace(
  /function Services\(\) \{\n  const categories = \[[\s\S]*?\];\n/,
  (match) => {
    return match.replace(
      '  const categories = [',
      '  const _defaultServices = ['
    ).replace(
      /\];\n$/,
      '];\n  const categories = (window.__D&&window.__D.services)||_defaultServices;\n'
    );
  }
);

// 10. Projects → dynamic
html = html.replace(
  /function FeaturedProjects\(\{ showViewAll = true \}\) \{\n  const projects = \[[\s\S]*?\];\n/,
  (match) => {
    return match.replace(
      '  const projects = [',
      '  const _defaultProjects = ['
    ).replace(
      /\];\n$/,
      '];\n  const projects = (window.__D&&window.__D.projects)||_defaultProjects;\n'
    );
  }
);

// 11. Skills categories → dynamic
// Find the second occurrence of `const categories = [` (skills one)
const skillsMatch = /function Skills\(\) \{[\s\S]*?const categories = \[/;
html = html.replace(skillsMatch, (match) =>
  match.replace('const categories = [', 'const _defaultSkillCats = [')
);
// Now add the override after the closing ];
html = html.replace(
  /(_defaultSkillCats = \[[\s\S]*?\];\n)/,
  '$1  const categories = (window.__D&&window.__D.skillGroups)||_defaultSkillCats;\n'
);

// 12. Work experience → dynamic
html = html.replace(
  /const experiences = \[\n    \{\n      role: 'Senior UI\/UX Designer'[\s\S]*?\];\n/,
  (match) => match.replace('const experiences = [', 'const _defaultExp = [')
              .replace(/\];\n$/, '];\n  const experiences = (window.__D&&window.__D.workExperience)||_defaultExp;\n')
);

// 13. Blog posts → dynamic (with slug for hrefs)
html = html.replace(
  /const posts = \[\n    \{ title: 'The Future of Web Design in 2026'[\s\S]*?\];\n/,
  "const posts = (window.__D&&window.__D.recentPosts)||[\n" +
  "    { title: 'The Future of Web Design in 2026', date: 'May 12, 2026', tag: 'Design', readTime: '5 min', slug: 'the-future-of-web-design-in-2026' },\n" +
  "    { title: 'Building Accessible SaaS Dashboards', date: 'Apr 28, 2026', tag: 'Development', readTime: '8 min', slug: 'building-accessible-saas-dashboards' },\n" +
  "    { title: 'Design Systems That Actually Scale', date: 'Mar 15, 2026', tag: 'Systems', readTime: '6 min', slug: 'design-systems-that-actually-scale' },\n" +
  "  ];\n"
);

// 14. Social links → dynamic
html = html.replace(
  /const socials = \[\n    \{ name: 'GitHub', href: '#' \},\n    \{ name: 'X', href: '#' \},\n    \{ name: 'Behance', href: '#' \},\n    \{ name: 'Dribbble', href: '#' \},\n    \{ name: 'LinkedIn', href: '#' \},\n  \];/,
  "const socials = (window.__D&&window.__D.socials)||[\n" +
  "    { name: 'GitHub', href: '#', iconKey: 'github' },\n" +
  "    { name: 'X', href: '#', iconKey: 'x' },\n" +
  "    { name: 'Behance', href: '#', iconKey: 'behance' },\n" +
  "    { name: 'Dribbble', href: '#', iconKey: 'dribbble' },\n" +
  "    { name: 'LinkedIn', href: '#', iconKey: 'linkedin' },\n" +
  "  ];"
);

// 15. Blog post href → /blog/:slug
html = html.replace(
  "href: 'Blog Post.html', className",
  "href: '/blog/' + (post.slug || 'blog'), className"
);

// 16. View All Projects link → /projects
html = html.replace(
  "href: 'Projects.html', style: { ...linkBtn, fontSize: 15",
  "href: '/projects', style: { ...linkBtn, fontSize: 15"
);

// 17. Project card href → /projects/:slug
html = html.replace(
  "href: 'Project.html', style: { ...linkBtn",
  "href: '/projects/' + (project.slug || ''), style: { ...linkBtn"
);

// Also fix Nav projects link
html = html.replace(
  "{ label: 'Projects', href: 'Projects.html' }",
  "{ label: 'Projects', href: '/projects' }"
);

// 18. Footer copyright → dynamic
html = html.replace(
  "'© 2026 Josh Studios. All rights reserved.'",
  "(window.__D&&window.__D.footer&&window.__D.footer.copyrightText)||'© 2026 Josh Studios. All rights reserved.'"
);

// 19. Nav links → dynamic
html = html.replace(
  "const links = window.__D&&window.__D.nav&&window.__D.nav.links",
  "const links = window.__D&&window.__D.nav&&window.__D.nav.links"
);
// Find the navigation links array and make it dynamic
html = html.replace(
  /const links = \[\n    \{ label: 'Home', href: '#home' \},[\s\S]*?\{ label: 'Blog', href: '#blog' \},\n  \]/,
  "const links = (window.__D&&window.__D.nav&&window.__D.nav.links)||[\n" +
  "    { label: 'Home', href: '#home' },\n" +
  "    { label: 'About', href: '#about' },\n" +
  "    { label: 'Services', href: '#services' },\n" +
  "    { label: 'Projects', href: '/projects' },\n" +
  "    { label: 'Skills', href: '#skills' },\n" +
  "    { label: 'Blog', href: '/blog' },\n" +
  "  ]"
);

// 20. Make the gallery render images when imageUrl is present
// The GalleryStrip renders a colored div — update to show img if imageUrl exists
html = html.replace(
  "React.createElement('div', { style: { ...innerStyle, background: gradients[colorHex] || fallbackGrad(colorHex) }, className: 'gc-inner' },",
  "React.createElement('div', { style: { ...innerStyle, background: item.imageUrl ? 'none' : (gradients[colorHex] || fallbackGrad(colorHex)) }, className: 'gc-inner' },\n              item.imageUrl && React.createElement('img', { src: item.imageUrl, alt: item.label, style: { width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 } }),"
);

fs.writeFileSync(dst, html, 'utf8');
console.log('✅ home.ejs written to', dst);
console.log('   Size:', Math.round(html.length / 1024), 'KB');
