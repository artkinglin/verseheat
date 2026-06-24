import { createApp } from './server.js';
import { config, validateConfig } from './config.js';

const missing = validateConfig();
if (missing.length) {
  console.warn(`Missing or unsafe config: ${missing.join(', ')}`);
}

const app = createApp();

app.listen(config.port, () => {
  console.log(`Verse Heat API listening on ${config.port}`);
});
