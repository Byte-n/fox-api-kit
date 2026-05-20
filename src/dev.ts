const pkg = require('../package.json');

(globalThis as any).__VERSION__ = pkg.version;
(globalThis as any).__DESCRIPTION__ = pkg.description;

import { run } from './cli';

run();
