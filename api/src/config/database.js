const { Sequelize } = require("sequelize");
require("dotenv").config();

// Validate required environment variables
const required = ["DB_NAME", "DB_USER", "DB_HOST"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    port: process.env.DB_PORT || 3306,
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;
