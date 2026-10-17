import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const errors = [];
const warnings = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
  const rel = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(rel) : [rel];
});
const files = walk('src');
const sourceFiles = files.filter((f) => /\.(ts|tsx)$/.test(f));
const routeFiles = files.filter((f) => /src\/app\/.*\/(page|route)\.tsx?$/.test(f) || /src\/app\/(page|route)\.tsx?$/.test(f));
const pages = files.filter((f) => /src\/app\/.*page\.tsx$/.test(f) || f === 'src/app/page.tsx');
const routes = new Set();
for (const file of pages) {
  let route = file.replace(/^src\/app/, '').replace(/\/page\.tsx$/, '').replace(/^\/page\.tsx$/, '/');
  route = route.replace(/\[\.\.\.([\w]+)\]/g, '*').replace(/\[\[\.\.\.([\w]+)\]\]/g, '*').replace(/\[([\w]+)\]/g, ':$1');
  routes.add(route || '/');
}
// Resolve every relative and @/ import against the local source tree.
for (const file of sourceFiles) {
  const src = read(file);
  for (const match of src.matchAll(/(?:from\s*|import\s*)['\"]([^'\"]+)['\"]/g)) {
    const specifier = match[1];
    if (!specifier.startsWith('@/') && !specifier.startsWith('.')) continue;
    const base = specifier.startsWith('@/') ? path.join(root, 'src', specifier.slice(2)) : path.resolve(path.dirname(path.join(root, file)), specifier);
    const candidates = [base, ...['.ts','.tsx','.js','.jsx','.mjs','.json'].map((ext) => base + ext), ...['index.ts','index.tsx','index.js','index.jsx'].map((name) => path.join(base, name))];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) errors.push(`Unresolved local import: ${file} -> ${specifier}`);
  }
}
for (const route of ['/', '/explore', '/categories', '/cart', '/checkout', '/login', '/register', '/dashboard', '/sell', '/seller-studio', '/admin', '/support', '/contact', '/privacy', '/terms', '/refunds', '/wishlist', '/notifications', '/orders/confirmation', '/products/:id', '/seller/:id', '/category/:slug', '/orders/:id']) {
  if (!routes.has(route)) errors.push(`Required page route missing: ${route}`);
}
const sqlFiles = walk('supabase/migrations').filter((f) => f.endsWith('.sql'));
const sql = sqlFiles.map(read).join('\n');
const apiFiles = files.filter((f) => /src\/app\/api\/.*route\.ts$/.test(f));
const rpcCalls = new Set();
for (const file of sourceFiles) {
  const src = read(file);
  for (const match of src.matchAll(/\.rpc\(['"]([^'"]+)['"]/g)) rpcCalls.add(match[1]);
}
for (const rpc of rpcCalls) if (!new RegExp(`(?:function|procedure)\\s+public\\.${rpc}\\s*\\(`, 'i').test(sql)) errors.push(`RPC used in app but not defined in migrations: ${rpc}`);
for (const name of ['create_marketplace_order','update_marketplace_order_status','get_public_seller_summaries','become_seller','admin_moderate_product','admin_review_report','admin_set_seller_verification','admin_update_support_case']) {
  if (!new RegExp(`(?:function|procedure)\\s+public\\.${name}\\s*\\(`, 'i').test(sql)) errors.push(`Required database function missing: ${name}`);
}
for (const file of apiFiles) {
  const src = read(file);
  if (/export async function (POST|PUT|PATCH|DELETE)/.test(src) && !/auth\.getUser\(\)|auth\.getSession\(\)/.test(src)) {
    if (!file.includes('/auth/')) warnings.push(`Review authentication/authorization on mutating API: ${file}`);
  }
}
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
if (lock.packages?.['']?.name !== pkg.name) errors.push('package.json and package-lock root package names differ');
for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
  const locked = lock.packages?.[`node_modules/${name}`]?.version;
  if (!locked) errors.push(`Dependency absent from lockfile: ${name}`);
  else if (!satisfiesSimple(version, locked)) warnings.push(`Dependency lock version ${locked} may not satisfy declared range ${version} (${name})`);
}
function satisfiesSimple(range, version) {
  const exact = range.match(/^\d+\.\d+\.\d+$/);
  if (exact) return range === version;
  const wanted = range.match(/^[~^](\d+)\.(\d+)\.(\d+)/);
  if (!wanted) return true;
  const [maj,min,pat] = version.split('.').map(Number);
  const w = wanted.slice(1).map(Number);
  return maj === w[0] && (range.startsWith('^') ? (min > w[1] || min === w[1] && pat >= w[2]) : min === w[1] && pat >= w[2]);
}
const footer = read('src/components/SiteFooter.tsx');
if ((footer.match(/href="\/support"/g) ?? []).length > 1) warnings.push('Footer contains duplicate support links');
if (!fs.existsSync(path.join(root, '.env.example'))) errors.push('.env.example missing');
const env = read('.env.example');
for (const key of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','OMNI_DELIVERY_FEE_KES']) if (!env.includes(`${key}=`)) errors.push(`Missing environment documentation: ${key}`);
console.log(`Omni Market static verification\n- Source files: ${sourceFiles.length}\n- Page routes: ${pages.length}\n- API routes: ${apiFiles.length}\n- SQL migrations: ${sqlFiles.length}\n- Database RPCs referenced: ${rpcCalls.size}`);
for (const warning of warnings) console.log(`WARN: ${warning}`);
for (const error of errors) console.error(`FAIL: ${error}`);
if (errors.length) process.exit(1);
console.log('PASS: required route inventory, RPC definitions, environment docs, and lockfile presence checks passed.');
console.log('NOTE: this is a static audit, not a substitute for npm build, live Supabase/RLS tests, or browser checkout tests.');
