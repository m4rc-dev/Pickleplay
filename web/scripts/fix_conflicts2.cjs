// fix_conflicts2.cjs – line-based resolution for all 3 conflicts in App.tsx
const fs = require('fs');
const filePath = 'c:/Users/Jea Bayona/Documents/PicklePlay/Pickleplay/web/App.tsx';

let src = fs.readFileSync(filePath, 'utf8');

// Normalise CRLF → LF for easy string matching, we'll restore CRLF at the end
const hasCRLF = src.includes('\r\n');
src = src.replace(/\r\n/g, '\n');

// ── Conflict 1 (lines 500-513): sidebar NavItems ──────────────────────────────
// Keep feat() checks from "stashed" side + add Achievements item
const c1_old =
`<<<<<<< Updated upstream
                )}
                <NavItem to="/messages" icon={<MessageCircle size={22} />} label="Messages" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/tournaments" icon={<Trophy size={22} />} label="Tournaments" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/guides" icon={<BookOpen size={22} />} label="Guides & Quizzes" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/teams" icon={<UsersRound size={22} />} label="My Squads" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
                <NavItem to="/achievements" icon={<Trophy size={22} />} label="Achievements" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />
=======
                ))}
                {feat('messages') && <NavItem to="/messages" icon={<MessageCircle size={22} />} label="Messages" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                {feat('tournaments') && <NavItem to="/tournaments" icon={<Trophy size={22} />} label="Tournaments" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                {feat('guides') && <NavItem to="/guides" icon={<BookOpen size={22} />} label="Guides & Quizzes" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                {feat('teams') && <NavItem to="/teams" icon={<UsersRound size={22} />} label="My Squads" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
>>>>>>> Stashed changes`;

const c1_new =
`                ))}
                {feat('messages') && <NavItem to="/messages" icon={<MessageCircle size={22} />} label="Messages" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                {feat('tournaments') && <NavItem to="/tournaments" icon={<Trophy size={22} />} label="Tournaments" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                {feat('guides') && <NavItem to="/guides" icon={<BookOpen size={22} />} label="Guides & Quizzes" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                {feat('teams') && <NavItem to="/teams" icon={<UsersRound size={22} />} label="My Squads" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}
                {feat('achievements') && <NavItem to="/achievements" icon={<Trophy size={22} />} label="Achievements" isCollapsed={isSidebarCollapsed} themeColor={themeColor} />}`;

// ── Conflict 2 (lines 888-897): Routes ────────────────────────────────────────
// Keep feat() checks from "stashed" + add achievements route from "upstream"
const c2_old =
`<<<<<<< Updated upstream
              <Route path="/teams" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <Teams userRole={role} isSidebarCollapsed={isSidebarCollapsed} /> : <Navigate to="/" />} />
              <Route path="/achievements" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <Achievements userRole={role} isSidebarCollapsed={isSidebarCollapsed} /> : <Navigate to="/" />} />
              <Route path="/profile" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <Profile userRole={role} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} followedUsers={followedUsers} onFollow={handleFollow} posts={posts} setPosts={setPosts} onRoleSwitch={handleRoleSwitch} /> : <Navigate to="/" />} />
              <Route path="/profile/:userId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <Profile userRole={role} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} followedUsers={followedUsers} onFollow={handleFollow} posts={posts} setPosts={setPosts} onRoleSwitch={handleRoleSwitch} /> : <Navigate to="/" />} />
=======
              <Route path="/teams" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('teams') ? <FeatureUnavailable featureName="teams" /> : role !== 'guest' ? <Teams userRole={role} isSidebarCollapsed={isSidebarCollapsed} /> : <Navigate to="/" />} />
              <Route path="/profile" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('profile') ? <FeatureUnavailable featureName="profile" /> : role !== 'guest' ? <Profile userRole={role} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} followedUsers={followedUsers} onFollow={handleFollow} posts={posts} setPosts={setPosts} onRoleSwitch={handleRoleSwitch} /> : <Navigate to="/" />} />
              <Route path="/profile/:userId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('profile') ? <FeatureUnavailable featureName="profile" /> : role !== 'guest' ? <Profile userRole={role} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} followedUsers={followedUsers} onFollow={handleFollow} posts={posts} setPosts={setPosts} onRoleSwitch={handleRoleSwitch} /> : <Navigate to="/" />} />
>>>>>>> Stashed changes`;

const c2_new =
`              <Route path="/teams" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('teams') ? <FeatureUnavailable featureName="teams" /> : role !== 'guest' ? <Teams userRole={role} isSidebarCollapsed={isSidebarCollapsed} /> : <Navigate to="/" />} />
              <Route path="/achievements" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : role !== 'guest' ? <Achievements userRole={role} isSidebarCollapsed={isSidebarCollapsed} /> : <Navigate to="/" />} />
              <Route path="/profile" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('profile') ? <FeatureUnavailable featureName="profile" /> : role !== 'guest' ? <Profile userRole={role} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} followedUsers={followedUsers} onFollow={handleFollow} posts={posts} setPosts={setPosts} onRoleSwitch={handleRoleSwitch} /> : <Navigate to="/" />} />
              <Route path="/profile/:userId" element={isTwoFactorPending ? <Navigate to="/verify-2fa" replace /> : !feat('profile') ? <FeatureUnavailable featureName="profile" /> : role !== 'guest' ? <Profile userRole={role} authorizedProRoles={authorizedProRoles} currentUserId={currentUserId} followedUsers={followedUsers} onFollow={handleFollow} posts={posts} setPosts={setPosts} onRoleSwitch={handleRoleSwitch} /> : <Navigate to="/" />} />`;

// ── Conflict 3 (lines 1729-1742): handleLogout ────────────────────────────────
// Merge both sides: came_from_logout + is_actual_admin cleanup
const c3_old =
`<<<<<<< Updated upstream
    localStorage.setItem('came_from_logout', 'true');
    setRole('guest');
    setAuthorizedProRoles([]);
    setUserName(null);
    setUserAvatar(null);
    setCurrentUserId(null);
    await supabase.auth.signOut();
=======
    localStorage.removeItem('is_actual_admin');
    setRole('guest');
    setAuthorizedProRoles([]);
    setIsActualAdmin(false);
>>>>>>> Stashed changes`;

const c3_new =
`    localStorage.setItem('came_from_logout', 'true');
    localStorage.removeItem('is_actual_admin');
    setRole('guest');
    setAuthorizedProRoles([]);
    setUserName(null);
    setUserAvatar(null);
    setCurrentUserId(null);
    setIsActualAdmin(false);
    await supabase.auth.signOut();`;

// Apply all replacements
[
  [c1_old, c1_new, 'Conflict 1 (sidebar NavItems)'],
  [c2_old, c2_new, 'Conflict 2 (routes)'],
  [c3_old, c3_new, 'Conflict 3 (handleLogout)'],
].forEach(([old, next, label]) => {
  if (src.includes(old)) {
    src = src.replace(old, next);
    console.log(`✔ ${label}`);
  } else {
    console.error(`✘ ${label} – pattern not found!`);
  }
});

// Restore original line endings
if (hasCRLF) src = src.replace(/\n/g, '\r\n');

fs.writeFileSync(filePath, src, 'utf8');

// Verify
const remaining = src.split('\n').filter(l => /^<{7}|^={7}$|^>{7}/.test(l.replace(/\r$/, '')));
console.log(`\nRemaining conflict markers: ${remaining.length}`);
console.log('Done.');
