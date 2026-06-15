import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export const register = async (req: Request, res: Response) => {
  try {
    const { full_name, username, password, phone_number, role_id } = req.body;

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if role exists
    const role = await prisma.role.findUnique({ where: { id: role_id } });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        full_name,
        username,
        password_hash: hashedPassword,
        phone_number,
        role_id,
      },
    });

    // Strip password_hash from response
    const { password_hash: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(404).json({ message: 'Username tidak ditemukan' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash || '');
    if (!validPassword) {
      return res.status(400).json({ message: 'Password salah' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Fetch user with role (excluding password_hash)
    const userWithRole = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true },
    });

    if (!userWithRole) {
      return res.status(500).json({ message: 'Failed to retrieve user data' });
    }

    const token = jwt.sign(
      { id: user.id, role: userWithRole.role?.role_name },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' },
    );

    const { password_hash: _, ...safeUser } = userWithRole;
    res.json({ token, user: safeUser });
  } catch (error) {
    res.status(500).json(error);
  }
};
