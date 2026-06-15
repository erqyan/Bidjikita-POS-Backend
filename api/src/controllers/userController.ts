import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

// Helper: remove password_hash from user object for API response
function sanitizeUser(user: Record<string, unknown>) {
  const { password_hash: _, ...safe } = user as { password_hash?: unknown; [key: string]: unknown };
  return safe;
}

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: { select: { id: true, role_name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users.map(sanitizeUser));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { full_name, username, password, phone_number, role_id } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Validate and sanitize phone_number
    const sanitizedPhone = phone_number ? phone_number.trim() : null;
    if (sanitizedPhone && !/^\d+$/.test(sanitizedPhone)) {
      return res.status(400).json({ message: 'No. telepon hanya boleh mengandung angka' });
    }

    // Resolve role: use provided role_id or fall back to cashier
    let resolvedRoleId = role_id;
    if (!resolvedRoleId) {
      const cashierRole = await prisma.role.findFirst({ where: { role_name: 'cashier' } });
      if (!cashierRole) {
        return res.status(400).json({ message: 'role_id is required and no default cashier role found' });
      }
      resolvedRoleId = cashierRole.id;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        full_name,
        username,
        password_hash,
        phone_number: sanitizedPhone,
        role_id: resolvedRoleId,
      },
    });

    const userWithRole = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: { select: { id: true, role_name: true } } },
    });

    res.status(201).json(sanitizeUser(userWithRole || user));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { full_name, phone_number } = req.body;

    // Validate and sanitize phone_number
    const sanitizedPhone =
      phone_number !== undefined ? (phone_number ? phone_number.trim() : null) : undefined;
    if (sanitizedPhone && !/^\d+$/.test(sanitizedPhone)) {
      return res.status(400).json({ message: 'No. telepon hanya boleh mengandung angka' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.user.update({
      where: { id },
      data: {
        full_name,
        phone_number: sanitizedPhone !== undefined ? sanitizedPhone : user.phone_number,
      },
    });

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { role: { select: { id: true, role_name: true } } },
    });

    res.json(sanitizeUser(updated || user));
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const toggleUserActive = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { is_active: !user.is_active },
    });

    res.json({
      message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`,
      is_active: updated.is_active,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ message: 'new_password is required' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await prisma.user.update({ where: { id }, data: { password_hash } });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);

    if (req.user?.id === id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
