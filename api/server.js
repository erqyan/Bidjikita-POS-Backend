require("dotenv").config();

const app = require("./src/app");
const sequelize = require("./src/config/database");

require("./src/models/ShiftUser");
require("./src/models/Transaction");
require("./src/models/Bundle");
require("./src/models/BundleItem");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    await sequelize.sync({ alter: true });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
}

startServer();
