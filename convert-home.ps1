$src = "C:\Users\Randytech\Desktop\Portfolio\Portfolio.html"
$dst = "C:\Users\Randytech\Desktop\Portfolio\cms\src\public\views\home.ejs"

$html = [System.IO.File]::ReadAllText($src, [System.Text.Encoding]::UTF8)

# ─── 1. Title (dynamic from SEO settings) ────────────────────────────────────
$html = $html -replace '<title>Portfolio.*?</title>',
  '<title><%- (typeof seo !== "undefined" && seo.siteTitle) ? seo.siteTitle : "Josh Studios" %></title>'

# ─── 2. Inject backend data right after <body> opens ─────────────────────────
$html = $html -replace '<div id="root"></div>',
  '<script>window.__D = <%- JSON.stringify(portfolioData) %>;</script>' + "`n  " + '<div id="root"></div>'

# ─── 3. TWEAK_DEFAULTS → read from backend theme ─────────────────────────────
$html = $html -replace '(?s)const TWEAK_DEFAULTS = /\*EDITMODE-BEGIN\*/\{.*?\}/\*EDITMODE-END\*/;',
  'const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{"fontFamily":"<%- (typeof theme !== `"undefined`" && theme.fontFamily) ? theme.fontFamily : `"DM Sans`" %>","pattern":"<%- (typeof theme !== `"undefined`" && theme.patternStyle) ? theme.patternStyle : `"geometric`" %>","showViewAllProjects":true,"showSubtitle":true}/*EDITMODE-END*/;'

# ─── 4. Typing words → dynamic ───────────────────────────────────────────────
$html = $html -replace "(?s)(const typedWord = useTypingEffect\(\[).*?(\]\))",
  'const typedWord = useTypingEffect((window.__D&&window.__D.hero&&window.__D.hero.typingWords)||["websites","AI automations","SEO strategies","backend solutions","SaaS platforms"])'

# ─── 5. Song title → dynamic ─────────────────────────────────────────────────
$html = $html -replace "}, 'Midnight Drive'\),",
  "}, (window.__D&&window.__D.music&&window.__D.music.title)||'Midnight Drive'),"

# ─── 6. Song artist → dynamic ────────────────────────────────────────────────
$html = $html -replace "}, 'Lo-Fi Chill Beats'\),",
  "}, (window.__D&&window.__D.music&&window.__D.music.artist)||'Lo-Fi Chill Beats'),"

# ─── 7. Gallery items → dynamic ──────────────────────────────────────────────
$galleryDefault = "    { label: 'SaaS Dashboard', color: '#1a3a4a' }," + "`n    { label: 'E-commerce Store', color: '#2d1b3d' }," + "`n    { label: 'Landing Page', color: '#1B6B2E' }," + "`n    { label: 'Mobile Banking', color: '#3a2a1a' }," + "`n    { label: 'Portfolio Site', color: '#1a2a3d' }," + "`n    { label: 'Health App', color: '#2E4A3A' }," + "`n    { label: 'Travel Platform', color: '#3d2a2a' }," + "`n    { label: 'AI Dashboard', color: '#1a3a3a' }," + "`n    { label: 'Food Delivery', color: '#3a3a1a' }," + "`n    { label: 'Social Network', color: '#2a1a3a' }," + "`n    { label: 'Fintech App', color: '#1a2a2a' }," + "`n    { label: 'Real Estate', color: '#3a2a3a' },"
$html = $html.Replace($galleryDefault,
  "    ...(window.__D&&window.__D.galleryItems)||[{ label: 'SaaS Dashboard', color: '#1a3a4a' }],")

# ─── 8. Services categories → dynamic ────────────────────────────────────────
# Replace the static services categories array with a dynamic version
$html = [regex]::Replace($html,
  "(?s)(function Services\(\) \{[\r\n]+)  const categories = \[.+?\];\r?\n",
  {
    param($m)
    $m.Groups[1].Value + "  const categories = (window.__D&&window.__D.services) || [{title:'Websites',items:[{name:'Figma to Website',desc:'Pixel-perfect conversion of Figma designs into responsive, production-ready websites.'}]},{title:'Automation',items:[{name:'n8n Workflows',desc:'Complex automation workflows connecting your apps and services seamlessly.'}]},{title:'Backend',items:[{name:'Node.js APIs',desc:'Scalable REST and GraphQL APIs built with Node.js and Express.'}]}];`n"
  },
  [System.Text.RegularExpressions.RegexOptions]::Singleline)

# ─── 9. Projects → dynamic ───────────────────────────────────────────────────
$html = [regex]::Replace($html,
  "(?s)(function FeaturedProjects\(\{.+?\} = true\) \{[\r\n]+)  const projects = \[.+?\];\r?\n",
  {
    param($m)
    $m.Groups[1].Value + "  const projects = (window.__D&&window.__D.projects) || [{title:'CloudSync Pro',category:'SaaS Platform',desc:'Cloud storage and collaboration platform.',color:'#1a3a5a',slug:'cloudsync-pro',tall:true}];`n"
  },
  [System.Text.RegularExpressions.RegexOptions]::Singleline)

# ─── 10. Skills categories → dynamic ────────────────────────────────────────
$html = [regex]::Replace($html,
  "(?s)(function Skills\(\) \{[\r\n]+(?:  const \[.+?[\r\n]+  const ref.+?[\r\n]+[\r\n]+))  const categories = \[.+?\];\r?\n",
  {
    param($m)
    $m.Groups[1].Value + "  const categories = (window.__D&&window.__D.skillGroups) || [{name:'Websites',skills:['HTML','CSS','JavaScript','React','Next.js','WordPress','Tailwind']},{name:'Automation',skills:['n8n','Make.com','Zapier','Python','AI/LLM']},{name:'Backend',skills:['Node.js','Express','MongoDB','PostgreSQL','REST API']}];`n"
  },
  [System.Text.RegularExpressions.RegexOptions]::Singleline)

# ─── 11. Work experience → dynamic ──────────────────────────────────────────
$html = [regex]::Replace($html,
  "(?s)(function WorkExperience\(\) \{[\r\n]+(?:.+?[\r\n]+){1,3})  const experiences = \[.+?\];\r?\n",
  {
    param($m)
    $m.Groups[1].Value + "  const experiences = (window.__D&&window.__D.workExperience) || [{role:'Senior UI/UX Designer',company:'TechCorp Global',period:'2023 — Present',desc:'Leading the design system team.'}];`n"
  },
  [System.Text.RegularExpressions.RegexOptions]::Singleline)

# ─── 12. Blog posts → dynamic ───────────────────────────────────────────────
$oldPosts = "  const posts = [
    { title: 'The Future of Web Design in 2026', date: 'May 12, 2026', tag: 'Design', readTime: '5 min' },
    { title: 'Building Accessible SaaS Dashboards', date: 'Apr 28, 2026', tag: 'Development', readTime: '8 min' },
    { title: 'Design Systems That Actually Scale', date: 'Mar 15, 2026', tag: 'Systems', readTime: '6 min' },
  ];"
$newPosts = "  const posts = (window.__D&&window.__D.recentPosts)||[{ title: 'The Future of Web Design in 2026', date: 'May 12, 2026', tag: 'Design', readTime: '5 min', slug: 'the-future-of-web-design-in-2026' }];"
$html = $html.Replace($oldPosts, $newPosts)

# ─── 13. Social links → dynamic ─────────────────────────────────────────────
$oldSocials = "  const socials = [
    { name: 'GitHub', href: '#' },
    { name: 'X', href: '#' },
    { name: 'Behance', href: '#' },
    { name: 'Dribbble', href: '#' },
    { name: 'LinkedIn', href: '#' },
  ];"
$newSocials = "  const socials = (window.__D&&window.__D.socials)||[{ name: 'GitHub', href: '#', iconKey: 'github' },{ name: 'X', href: '#', iconKey: 'x' },{ name: 'Behance', href: '#', iconKey: 'behance' },{ name: 'Dribbble', href: '#', iconKey: 'dribbble' },{ name: 'LinkedIn', href: '#', iconKey: 'linkedin' }];"
$html = $html.Replace($oldSocials, $newSocials)

# ─── 14. Social icon rendering → use iconKey or name ────────────────────────
# The original renders icons[s.name] — keep as-is since icons object has the keys
# But update the href to use s.href (already there)

# ─── 15. Blog post hrefs → /blog/:slug ──────────────────────────────────────
$html = $html -replace "href: 'Blog Post\.html', className",
  "href: '/blog/' + (post.slug || 'the-future-of-web-design-in-2026'), className"

# ─── 16. View All Projects href ──────────────────────────────────────────────
$html = $html -replace "href: 'Projects\.html', style: \{ \.\.\.linkBtn, fontSize: 15",
  "href: '/projects', style: { ...linkBtn, fontSize: 15"

# ─── 17. Project card href ───────────────────────────────────────────────────
$html = $html -replace "href: 'Project\.html', style: \{ \.\.\.linkBtn",
  "href: '/projects/' + (project.slug || ''), style: { ...linkBtn"

# ─── 18. Footer copyright → dynamic ─────────────────────────────────────────
$html = $html -replace "'© 2026 Josh Studios\. All rights reserved\.'",
  "(window.__D&&window.__D.footer&&window.__D.footer.copyrightText)||'© 2026 Josh Studios. All rights reserved.'"

# ─── 19. Nav logo src → dynamic ──────────────────────────────────────────────
# Keep as-is (served via /uploads/logo.png)

# ─── 20. Write output ────────────────────────────────────────────────────────
[System.IO.File]::WriteAllText($dst, $html, [System.Text.Encoding]::UTF8)
Write-Host "home.ejs written to $dst"
