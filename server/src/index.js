import { createApp } from './server.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Verse Heat API listening on ${config.port}`);
});
