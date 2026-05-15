const Shift = require(
  "../models/Shift"
);

const User = require(
  "../models/User"
);

// CREATE SHIFT
exports.createShift = async (
  req,
  res
) => {
  try {

    const {
      shift_name,
      shift_date,
      start_time,
      end_time,
      user_ids,
    } = req.body;

    const users = await User.findAll({
      where: {
        id: user_ids,
      },
    });

    const shift = await Shift.create({
      shift_name,
      shift_date,
      start_time,
      end_time,
    });

    await shift.setUsers(users);

    const result =
      await Shift.findByPk(
        shift.id,
        {
          include: User,
        }
      );

    res.status(201).json(result);

  } catch (error) {

    res.status(500).json(error);

  }
};

// GET ALL SHIFTS
exports.getShifts = async (
  req,
  res
) => {
  try {

    const shifts =
      await Shift.findAll({
        include: User,
      });

    res.json(shifts);

  } catch (error) {

    res.status(500).json(error);

  }
};

// GET SHIFT BY ID
exports.getShiftById = async (
  req,
  res
) => {
  try {

    const shift =
      await Shift.findByPk(
        req.params.id,
        {
          include: User,
        }
      );

    if (!shift) {
      return res.status(404).json({
        message: "Shift not found",
      });
    }

    res.json(shift);

  } catch (error) {

    res.status(500).json(error);

  }
};

// UPDATE SHIFT
exports.updateShift = async (
  req,
  res
) => {
  try {

    const shift =
      await Shift.findByPk(
        req.params.id
      );

    if (!shift) {
      return res.status(404).json({
        message: "Shift not found",
      });
    }

    const {
      shift_name,
      shift_date,
      start_time,
      end_time,
      status,
      user_ids,
    } = req.body;

    // cek users exists
    const users =
      await User.findAll({
        where: {
          id: user_ids,
        },
      });

    if (
      users.length !== user_ids.length
    ) {
      return res.status(404).json({
        message:
          "Some users not found",
      });
    }

    // update shift
    await shift.update({
      shift_name,
      shift_date,
      start_time,
      end_time,
      status,
    });

    // update shift users
    await shift.setUsers(users);

    // ambil data terbaru
    const updatedShift =
      await Shift.findByPk(
        shift.id,
        {
          include: User,
        }
      );

    res.json(updatedShift);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: error.message,
    });

  }
};

// DELETE SHIFT
exports.deleteShift = async (
  req,
  res
) => {
  try {

    const shift =
      await Shift.findByPk(
        req.params.id
      );

    if (!shift) {
      return res.status(404).json({
        message: "Shift not found",
      });
    }

    await shift.destroy();

    res.json({
      message:
        "Shift deleted successfully",
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: error.message,
    });

  }
};