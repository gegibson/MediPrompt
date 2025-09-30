#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PROMPTS_DIR = path.join(DATA_DIR, 'prompts');
const OUT_DIR = path.join(ROOT, 'public', 'data');

/** @typedef {{
 *  id: string,
 *  title: string,
 *  shortDescription: string,
 *  categoryId: string,
 *  tags?: string[],
 *  keywords?: string[],
 *  createdAt?: string,
 *  featuredWeight?: number,
 *  body?: string
 * }} PromptBody
 */

/** Minimal validation helper */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function readJsonIfExists(file) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
}

function toIndexItem(prompt) {
  const { body, ...meta } = prompt;
  return meta;
}

function bySort(a, b) {
  const aw = a.featuredWeight ?? 0;
  const bw = b.featuredWeight ?? 0;
  if (aw !== bw) return bw - aw;
  const ad = a.createdAt ? Date.parse(a.createdAt) : 0;
  const bd = b.createdAt ? Date.parse(b.createdAt) : 0;
  if (ad !== bd) return bd - ad;
  return String(a.title).localeCompare(String(b.title));
}

async function main() {
  console.log('[library] Building prompts.index.json ...');
  await ensureDir(OUT_DIR);

  // Copy categories.json (if present) to public/data
  const categoriesPath = path.join(DATA_DIR, 'categories.json');
  const categories = await readJsonIfExists(categoriesPath);
  if (categories) {
    await fs.writeFile(path.join(OUT_DIR, 'categories.json'), JSON.stringify(categories, null, 2));
    console.log(`[library] Copied categories.json (${categories.length} categories)`);
  } else {
    console.log('[library] No categories.json found (ok for early steps)');
  }

  // Read prompt bodies
  let files = [];
  try {
    files = (await fs.readdir(PROMPTS_DIR)).filter((f) => f.endsWith('.json'));
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      console.warn('[library] No prompts directory found; emitting empty index');
      files = [];
    } else {
      throw err;
    }
  }

  const seen = new Set();
  const index = [];
  const outPromptsDir = path.join(OUT_DIR, 'prompts');
  await ensureDir(outPromptsDir);

  for (const file of files) {
    const full = path.join(PROMPTS_DIR, file);
    const raw = await fs.readFile(full, 'utf8');
    /** @type {PromptBody} */
    const prompt = JSON.parse(raw);

    // Validate required fields
    assert(typeof prompt.id === 'string' && prompt.id.length > 0, `${file}: missing id`);
    assert(typeof prompt.title === 'string' && prompt.title.length > 0, `${file}: missing title`);
    assert(typeof prompt.shortDescription === 'string' && prompt.shortDescription.length > 0, `${file}: missing shortDescription`);
    assert(typeof prompt.categoryId === 'string' && prompt.categoryId.length > 0, `${file}: missing categoryId`);

    // Optional arrays sanity
    if (prompt.tags) assert(Array.isArray(prompt.tags), `${file}: tags must be array`);
    if (prompt.keywords) assert(Array.isArray(prompt.keywords), `${file}: keywords must be array`);

    // Unique IDs
    assert(!seen.has(prompt.id), `${file}: duplicate id ${prompt.id}`);
    seen.add(prompt.id);

    index.push(toIndexItem(prompt));

    // Copy body file to public/data/prompts/<id>.json for on-demand fetch
    const outBodyPath = path.join(outPromptsDir, `${prompt.id}.json`);
    await fs.writeFile(outBodyPath, JSON.stringify(prompt, null, 2));
  }

  index.sort(bySort);

  const outPath = path.join(OUT_DIR, 'prompts.index.json');
  await fs.writeFile(outPath, JSON.stringify(index, null, 2));
  console.log(`[library] Wrote ${index.length} items to ${path.relative(ROOT, outPath)}`);

  console.log('[library] Done.');
}

main().catch((err) => {
  console.error('[library] Build failed:', err.message || err);
  process.exit(1);
});
