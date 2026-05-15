const { DataTypes } = require(
  "sequelize"
);

const sequelize = require(
  "../config/database"
);

const Shift = sequelize.define(
  "Shift",
  {
    shift_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    shift_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(
        "open",
        "closed"
      ),
      defaultValue: "open",
    },
  }
);

module.exports = Shift;