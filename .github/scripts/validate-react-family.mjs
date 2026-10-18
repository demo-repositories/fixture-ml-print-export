import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const family = ['react', 'react-dom', '@types/react', '@types/react-dom'];
const ignored = new Set([
  '.agents',
  '.cursor',
  '.git',
  '.next',
  '.sanity',
  'dist',
  'node_modules',
  'out',
]);
const errors = [];

function directMajor(specifier) {
  if (/^(?:catalog:|file:|git|https?:|link:|npm:|workspace:)/.test(specifier)) return null;
  return specifier.match(/(?:^|[~^<>=\s])(\d+)(?:\.|$)/)?.[1] ?? null;
}

function visit(directory) {
  const manifestPath = join(directory, 'package.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const declared = [];
    for (const section of sections) {
      for (const name of family) {
        const specifier = manifest[section]?.[name];
        if (typeof specifier !== 'string') continue;
        const major = directMajor(specifier);
        if (major !== null) declared.push({ name, section, specifier, major });
      }
    }
    const majors = new Set(declared.map((item) => item.major));
    if (majors.size > 1) {
      errors.push(
        `${manifestPath}: ${declared.map((item) => `${item.name}@${item.specifier}`).join(', ')}`,
      );
    }
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || ignored.has(entry.name)) continue;
    visit(join(directory, entry.name));
  }
}

visit('.');
if (errors.length > 0) {
  console.error('Mixed direct React runtime/type majors:\n' + errors.join('\n'));
  process.exit(1);
}
