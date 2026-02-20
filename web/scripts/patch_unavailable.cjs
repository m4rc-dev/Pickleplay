const fs = require('fs');
const path = require('path');

const APP_PATH = path.join(__dirname, '..', 'App.tsx');
let c = fs.readFileSync(APP_PATH, 'utf8').replace(/\r\n/g, '\n');
let ok = 0, fail = 0;

function patch(label, search, replacement) {
  if (c.includes(search)) {
    c = c.replace(search, replacement);
    console.log(`  ✅ ${label}`);
    ok++;
  } else {
    console.log(`  ❌ ${label}`);
    fail++;
  }
}

console.log('Patching: FeatureUnavailable page + nav hiding...\n');

// ── 1. Add import ──
patch('import FeatureUnavailable',
  "import MaintenanceScreen from './components/MaintenanceScreen';\n",
  "import MaintenanceScreen from './components/MaintenanceScreen';\nimport FeatureUnavailable from './components/FeatureUnavailable';\n"
);

// ── 2. Replace all <Navigate to="/" replace /> gates with <FeatureUnavailable featureName="X" /> ──
const features = [
  'shop','news','academy','rankings','dashboard','booking','my-bookings',
  'tournaments','coaches','community','partners','messages','teams','profile',
  'students','clinics','schedule','locations','bookings-admin','court-calendar',
  'tournaments-admin','revenue','court-policies','guides','booking','locations','profile'
];
const seen = new Set();
for (const feat of features) {
  if (seen.has(feat)) continue;
  seen.add(feat);
  const search = `!feat('${feat}') ? <Navigate to="/" replace /> : `;
  const replacement = `!feat('${feat}') ? <FeatureUnavailable featureName="${feat}" /> : `;
  if (c.includes(search)) {
    // Replace all occurrences
    while (c.includes(search)) {
      c = c.replace(search, replacement);
    }
    console.log(`  ✅ route gate: ${feat}`);
    ok++;
  } else {
    console.log(`  ⚠️  route gate not found: ${feat} (may already be replaced or missing)`);
  }
}

// ── 3. Wrap sidebar NavItems that aren't yet wrapped ──
// These are items that appear without feat() in the sidebar.
// Pattern: bare <NavItem to="/X" ... that isn't already wrapped in {feat(..) && ...}

const sidebarGates = [
  // [navItemSearchSnippet, featureKey]
  [`<NavItem to="/shop" icon={<ShoppingBag size={22} />} label="Pro Shop"`, 'shop'],
  [`<NavItem to="/tournaments" icon={<Trophy size={22} />}`, 'tournaments'],
  [`<NavItem to="/coaches" icon={<GraduationCap size={22} />}`, 'coaches'],
  [`<NavItem to="/rankings" icon={<BarChart3 size={22} />}`, 'rankings'],
  [`<NavItem to="/teams" icon={<Users size={22} />}`, 'teams'],
  [`<NavItem to="/partners" icon={<Handshake size={22} />}`, 'partners'],
  [`<NavItem to="/community" icon={<Globe size={22} />}`, 'community'],
  [`<NavItem to="/messages" icon={<MessageCircle size={22} />}`, 'messages'],
  [`<NavItem to="/academy" icon={<BookOpen size={22} />}`, 'academy'],
  [`<NavItem to="/booking" icon={<Calendar size={22} />}`, 'booking'],
  [`<NavItem to="/my-bookings" icon={`, 'booking'],
  [`<NavItem to="/profile" icon={<User size={22} />}`, 'profile'],
  [`<NavItem to="/dashboard" icon={<LayoutDashboard size={22} />} label="Home"`, 'dashboard'],
];

for (const [snippet, feat] of sidebarGates) {
  // Find lines with this snippet that are NOT already preceded by feat(
  // We do this by looking for the snippet and checking if it's already inside a feat() wrapper
  const alreadyWrapped = `{feat('${feat}') && ${snippet}`;
  if (c.includes(alreadyWrapped)) {
    console.log(`  ⏭️  already wrapped: ${feat} (${snippet.substring(0, 40)}...)`);
    continue;
  }
  // Find all lines containing this snippet
  const lines = c.split('\n');
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(snippet) && !lines[i].includes(`feat('${feat}')`)) {
      const trimmed = lines[i];
      const indent = trimmed.match(/^(\s*)/)?.[1] ?? '';
      const content = trimmed.trim();
      // Only wrap standalone NavItem lines (not inside existing feat wrappers)
      if (content.startsWith('<NavItem')) {
        lines[i] = `${indent}{feat('${feat}') && ${content}}`;
        changed = true;
      }
    }
  }
  if (changed) {
    c = lines.join('\n');
    console.log(`  ✅ sidebar hide: ${feat} (${snippet.substring(0, 40)}...)`);
    ok++;
  } else {
    console.log(`  ⚠️  sidebar: not found or already handled: ${snippet.substring(0, 40)}...`);
  }
}

// ── Write ──
c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(APP_PATH, c, 'utf8');
const lineCount = c.split('\r\n').length;
console.log(`\n✅ Written (${lineCount} lines). ok=${ok} fail=${fail}`);

// ── Verify ──
const checks = [
  ['FeatureUnavailable import', c.includes("import FeatureUnavailable")],
  ['FeatureUnavailable in routes', c.includes('<FeatureUnavailable featureName=')],
  ['No bare Navigate-to-/ gates remain', !c.includes('!feat(') || !c.match(/!feat\('[^']+'\) \? <Navigate to="\/" replace \/> :/g)],
];
for (const [name, pass] of checks) {
  console.log(`  ${pass ? '✅' : '❌'} ${name}`);
}
