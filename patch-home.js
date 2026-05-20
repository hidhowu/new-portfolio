const fs = require('fs');
const file = __dirname + '/src/public/views/home.ejs';
let html = fs.readFileSync(file, 'utf8');

// ── Services: rename const categories → const _defaultServices ──────────────
// Only the FIRST occurrence (the Services component, ~line 1626)
let servicesFixed = false;
html = html.replace(/const categories = \[(\s*\{\s*title: 'Websites')/,  (m, g1) => {
  servicesFixed = true;
  return 'const _defaultServices = [' + g1;
});
if (servicesFixed) console.log('✓ services categories renamed');

// Find the closing ];\n after the services array and add dynamic override
// The services array ends just before `  return React.createElement('section', {\n    id: 'services'`
html = html.replace(
  /(\s*\],\n  \];\n)(\s*return React\.createElement\('section', \{\s*id: 'services')/,
  (m, close, ret) => close + "  const categories = (window.__D&&window.__D.services)||_defaultServices;\n" + ret
);

// ── Skills: rename second const categories → const _defaultSkillCats ────────
// The skills categories array has `name: 'Websites'` property (not `title`)
html = html.replace(/const categories = \[(\s*\{\s*name: 'Websites',\s*skills:)/, (m, g1) => {
  console.log('✓ skills categories renamed');
  return 'const _defaultSkillCats = [' + g1;
});
// Add override before `return React.createElement('section', { id: 'skills'`
html = html.replace(
  /(\s*\];\n)(\s*const sectionStyle = \{\s*maxWidth: 'var\(--max-width\)', margin: '0 auto',\s*padding: 'clamp\(60px, 10vw, 120px\) 24px',\s*position: 'relative', zIndex: 1,\s*\};\s*\n\s*return React\.createElement\('section', \{ id: 'skills')/,
  (m, close, rest) => {
    console.log('✓ skills categories dynamic override added');
    return close + "  const categories = (window.__D&&window.__D.skillGroups)||_defaultSkillCats;\n" + rest;
  }
);

// ── Work experience: add dynamic override ────────────────────────────────────
html = html.replace(
  /(const experiences = \[[\s\S]*?\];\n)/,
  (m) => {
    console.log('✓ work experience made dynamic');
    return m.replace('const experiences = [', 'const _defaultExp = [')
      + '  const experiences = (window.__D&&window.__D.workExperience)||_defaultExp;\n';
  }
);

// ── Blog posts: add dynamic override ────────────────────────────────────────
html = html.replace(
  /(const posts = \[[\s\S]*?\{ title: 'Design Systems That Actually Scale'[\s\S]*?\];\n)/,
  (m) => {
    console.log('✓ blog posts made dynamic');
    return m.replace('const posts = [', 'const _defaultPosts = [')
      + "  const posts = (window.__D&&window.__D.recentPosts)||_defaultPosts;\n";
  }
);

// ── Social links: add dynamic override ──────────────────────────────────────
html = html.replace(
  /(const socials = \[\s*\{ name: 'GitHub', href: '#' \}[\s\S]*?\{ name: 'LinkedIn', href: '#' \},\s*\];\n)/,
  (m) => {
    console.log('✓ social links made dynamic');
    return m.replace('const socials = [', 'const _defaultSocials = [')
      + "  const socials = (window.__D&&window.__D.socials)||_defaultSocials;\n";
  }
);

fs.writeFileSync(file, html, 'utf8');
console.log('✅ patch complete');
