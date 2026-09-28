require("./src/config/env");

const { createApp } = require("./src/app");
const { closePool } = require("./src/config/database");

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";
const app = createApp();

function startServer(port) {
  const server = app.listen(port, () => console.log(`Server running at http://localhost:${port}`));

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && !isProduction) {
      console.log(`Port ${port} is busy. Retrying on ${port + 1}...`);
      return startServer(port + 1);
    }
    throw error;
  });

  const shutdown = () => server.close(() => closePool().finally(() => process.exit(0)));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer(PORT);
