import { app, cleanup, createApp } from "./app.js";
import { env } from "./config/env.js";
import { initializeStore } from "./db/vectorStore.js";

const PORT = env.PORT;
let server;

if (process.env.NODE_ENV !== "test") {
  initializeStore().then(() => {
    server = app.listen(PORT, () => {
      console.log(`🚀 SupportGeniusAI Server running on http://localhost:${PORT} [${env.NODE_ENV}]`);
    });
  });
}

export { app, cleanup, createApp };
export default app;
