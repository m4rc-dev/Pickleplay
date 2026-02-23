const fs = require('fs');
const path = require('path');

const APP_PATH = path.join(__dirname, '..', 'App.tsx');
let c = fs.readFileSync(APP_PATH, 'utf8').replace(/\r\n/g, '\n');
let ok = 0;

function p(label, s, r) {
  if (c.includes(s)) { c = c.replace(s, r); console.log('OK:', label); ok++; }
  else console.log('MISS:', label);
}

// guides + teams My Squads (side by side in PLAYER section)
p('guides nav',
  `                <NavItem to="/guides" icon={<BookOpen size={22} />} label="Guides & Quizzes" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />`,
  `                {feat('guides') && <NavItem to="/guides" icon={<BookOpen size={22} />} label="Guides & Quizzes" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}`
);

p('teams My Squads nav',
  `                <NavItem to="/teams" icon={<UsersRound size={22} />} label="My Squads" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />`,
  `                {feat('teams') && <NavItem to="/teams" icon={<UsersRound size={22} />} label="My Squads" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}`
);

// partners in Others group
p('partners nav',
  `                        <NavItem to="/partners" icon={<Users size={22} />} label="Find Partners" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />`,
  `                        {feat('partners') && <NavItem to="/partners" icon={<Users size={22} />} label="Find Partners" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}`
);

// dashboard overview in Others group (PLAYER section)
p('dashboard Overview in Others group',
  `                        <NavItem to="/dashboard" icon={<LayoutDashboard size={22} />} label="Overview" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />`,
  `                        {feat('dashboard') && <NavItem to="/dashboard" icon={<LayoutDashboard size={22} />} label="Overview" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}`
);

// Book Courts - wrap the special styled Link block with feat('booking')
// It starts with {isSidebarCollapsed ? ( ... <Link to="/booking"
const BOOK_NEEDLE = `                {isSidebarCollapsed ? (\n                  <Link to="/booking"`;
const BOOK_CLOSE = `                )}`;
const bookIdx = c.indexOf(BOOK_NEEDLE);
if (bookIdx >= 0) {
  const endIdx = c.indexOf(BOOK_CLOSE, bookIdx) + BOOK_CLOSE.length;
  const block = c.substring(bookIdx, endIdx);
  if (!block.includes(`feat('booking')`)) {
    c = c.substring(0, bookIdx)
      + `                {feat('booking') && (\n`
      + block + `\n`
      + `                )}`
      + c.substring(endIdx);
    console.log('OK: Book Courts block');
    ok++;
  } else {
    console.log('SKIP: Book Courts already wrapped');
  }
} else {
  console.log('MISS: Book Courts block');
}

// Write back
c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(APP_PATH, c, 'utf8');
console.log(`\nDone. ok=${ok}, lines=${c.split('\r\n').length}`);

// Quick checks
const chk = [
  ["feat('guides')", c.includes(`feat('guides')`)],
  ["feat('teams')", c.includes(`feat('teams')`)],
  ["feat('partners')", c.includes(`feat('partners')`)],
  ["feat('booking') Book Courts", c.includes(`feat('booking') && (`) || c.includes(`feat('booking') &&(`)],
];
for (const [n, v] of chk) console.log(v ? `  OK: ${n}` : `  FAIL: ${n}`);
