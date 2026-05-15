const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Role = require("../models/Role");

exports.register = async (req, res) => {
  try {

    const {
      full_name,
      username,
      password,
      phone_number,
      role_id,
    } = req.body;

    // cek username sudah ada
    const existingUser =
      await User.findOne({
        where: {
          username,
        },
      });

    if (existingUser) {
      return res.status(400).json({
        message:
          "Username already exists",
      });
    }

    // cek role exists
    const role = await Role.findByPk(
      role_id
    );

    if (!role) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    // hash password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // create user
    const user = await User.create({
      full_name,
      username,
      password_hash: hashedPassword,
      phone_number,
      role_id,
    });

    res.status(201).json(user);

  } catch (error) {

    res.status(500).json(error);

  }
};

exports.login = async (req, res) => {
  try {

    const { username, password } = req.body;

    const user = await User.findOne({
      where: { username },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!validPassword) {
      return res.status(400).json({
        message: "Wrong password",
      });
    }
    await user.update({
        last_login: new Date(),
      });

    const userWithRole =
      await User.findByPk(user.id, {
        include: Role,
      });

    const token = jwt.sign(
      {
        id: user.id,
        role:
          userWithRole.Role.role_name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      token,
    });

  } catch (error) {

    res.status(500).json(error);

  }
};