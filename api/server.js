const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = require("./src/app");
const sequelize = require("./src/config/database");

require("./src/models/Transaction");
require("./src/models/Bundle");
require("./src/models/BundleItem");
require("./src/models/OrderDetailVariant");
require("./src/models/VariantIngredient");

const Role = require("./src/models/Role");
const User = require("./src/models/User");

const PORT = process.env.PORT || 5000;

// ── Seed default data for fresh deployments ─────────────────────────────────
async function seedDefaults() {
  const roleCount = await Role.count();
  if (roleCount === 0) {
    console.log("Seeding default roles...");
    await Role.bulkCreate([
      { id: 1, role_name: "admin" },
      { id: 2, role_name: "cashier" },
    ]);
  }

  const userCount = await User.count();
  if (userCount === 0 && process.env.DEFAULT_ADMIN_PASSWORD) {
    console.log("Seeding default admin user...");
    const hash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, 10);
    await User.create({
      full_name: process.env.DEFAULT_ADMIN_NAME || "Admin",
      username: process.env.DEFAULT_ADMIN_USERNAME || "admin",
      password_hash: hash,
      role_id: 1,
      is_active: true,
    });
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Promise Rejection:", reason);
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    await sequelize.sync();

    await seedDefaults();

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
