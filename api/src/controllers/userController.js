const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Role = require("../models/Role");

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: Role, attributes: ["id", "role_name"] }],
      attributes: { exclude: ["password_hash"] },
      order: [["createdAt", "DESC"]],
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: Role,
      attributes: { exclude: ["password_hash"] },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { full_name, username, password, phone_number, role_id } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Resolve role: use provided role_id or fall back to cashier
    let resolvedRoleId = role_id;
    if (!resolvedRoleId) {
      const cashierRole = await Role.findOne({
        where: { role_name: "cashier" },
      });
      if (!cashierRole) {
        return res
          .status(400)
          .json({ message: "role_id is required and no default cashier role found" });
      }
      resolvedRoleId = cashierRole.id;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      full_name,
      username,
      password_hash,
      phone_number,
      role_id: resolvedRoleId,
    });

    const userWithRole = await User.findByPk(user.id, {
      include: [{ model: Role, attributes: ["id", "role_name"] }],
      attributes: { exclude: ["password_hash"] },
    });

    res.status(201).json(userWithRole);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { full_name, phone_number } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({ full_name, phone_number });

    const updated = await User.findByPk(user.id, {
      include: [{ model: Role, attributes: ["id", "role_name"] }],
      attributes: { exclude: ["password_hash"] },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleUserActive = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({ is_active: !user.is_active });

    res.json({
      message: `User ${user.is_active ? "activated" : "deactivated"} successfully`,
      is_active: user.is_active,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ message: "new_password is required" });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await user.update({ password_hash });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user.id === parseInt(req.params.id)) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
