// fix_conflicts.cjs – resolve all git conflict markers in App.tsx on disk
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let src = fs.readFileSync(filePath, 'utf8');

// Helper: resolve a conflict block by choosing which side to keep.
// "both" merges both sides (de-duping identical lines).
// "ours"   = <<<<<< (Updated upstream)
// "theirs" = >>>>>>> (Stashed changes)
function resolveConflicts(text, resolver) {
  const CONFLICT_RE = /<<<<<<< [^\n]+\n([\s\S]*?)\n?=======\n([\s\S]*?)\n?>>>>>>> [^\n]+/g;
  let count = 0;
  const result = text.replace(CONFLICT_RE, (_match, ours, theirs, offset) => {
    count++;
    const resolved = resolver(ours, theirs, count);
    console.log(`Conflict #${count} resolved (${resolved.length} chars kept)`);
    return resolved;
  });
  console.log(`Total conflicts resolved: ${count}`);
  return result;
}

src = resolveConflicts(src, (ours, theirs, n) => {
  // ── Conflict 1: sidebar NavItems (feat() wrapping vs raw + Achievements) ──
  // "ours"   = raw NavItems + Achievements (no feat checks)
  // "theirs" = feat()-wrapped NavItems (no achievements)
  // Resolution: keep feat() checks from "theirs" AND add Achievements from "ours"
  if (ours.includes('NavItem to="/achievements"') && theirs.includes("feat('messages')")) {
    // Build the resolved block: feat-wrapped items + achievements at end
    return theirs.trimEnd() + '\n' +
      `                {feat('achievements') && <NavItem to="/achievements" icon={<Trophy size={22} />} label="Achievements" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}`;
  }

  // ── Conflict 2: Routes section (teams/achievements/profile routes) ──
  // "ours"   = routes without feat() checks + achievements route
  // "theirs" = routes with feat() checks (no achievements)
  // Resolution: keep feat() checks AND add achievements route
  if (ours.includes('path="/achievements"') && theirs.includes("feat('teams')")) {
    // Extract the achievements route line from ours
    const achievementsRouteLine = ours.split('\n').find(l => l.includes('path="/achievements"'));
    let base = theirs.trimEnd();
    if (achievementsRouteLine) {
      // Insert achievements route after /teams route
      base = base.replace(
        /(<Route path="\/teams"[^\n]+\/>)/,
        `$1\n              <Route path="/achievements" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <Achievements userRole={role} isSidebarCollapsed={isSidebarCollapsed} /> : <Navigate to="/" />} />`
      );
    }
    return base;
  }

  // ── Conflict 3: handleLogout localStorage cleanup ──
  // "ours"   = setItem('came_from_logout') but NO is_actual_admin removal
  // "theirs" = removeItem('is_actual_admin') + setIsActualAdmin(false) but NO came_from_logout
  // Resolution: keep both sets of operations
  if (ours.includes('came_from_logout') && theirs.includes('is_actual_admin')) {
    // Merge: keep came_from_logout from ours + is_actual_admin cleanup from theirs
    return ours.trimEnd() + '\n' +
      `    localStorage.removeItem('is_actual_admin');\n` +
      `    setIsActualAdmin(false);`;
  }

  // ── Fallback: prefer THEIRS (stashed = feature-gated version) ──
  console.log(`  (fallback → theirs for conflict #${n})`);
  return theirs;
});

fs.writeFileSync(filePath, src, 'utf8');
const finalLines = src.split('\n');
const remaining = finalLines.filter(l => /^<{7}|^={7}$|^>{7}/.test(l.trim()));
console.log(`Remaining conflict markers: ${remaining.length}`);
console.log(`Total lines: ${finalLines.length}`);
