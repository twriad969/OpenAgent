import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BACKEND_ROOT = path.resolve(__dirname, '..');
export const PROJECTS_ROOT = path.join(BACKEND_ROOT, 'projects');
export const AGENTS_PATH = path.join(BACKEND_ROOT, 'AGENTS.md');
