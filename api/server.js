require("dotenv").config();

const app = require("./src/app");
const sequelize = require("./src/config/database");

require("./src/models/Transaction");
require("./src/models/Bundle");
require("./src/models/BundleItem");
require("./src/models/OrderDetailVariant");
require("./src/models/VariantIngredient");

const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Promise Rejection:", reason);
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    await sequelize.sync();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log("HTTP server closed");
        sequelize.close().then(() => {
          console.log("Database connection closed");
          process.exit(0);
        });
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

startServer();
