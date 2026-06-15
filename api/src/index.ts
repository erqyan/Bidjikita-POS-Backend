import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './lib/prisma';

const PORT = process.env.PORT || 5000;

async function seedDefaults() {
  const roleCount = await prisma.role.count();
  if (roleCount === 0) {
    console.log('Seeding default roles...');
    await prisma.role.createMany({
      data: [
        { id: 1, role_name: 'admin' },
        { id: 2, role_name: 'cashier' },
      ],
    });
  }

  const userCount = await prisma.user.count();
  if (userCount === 0 && process.env.DEFAULT_ADMIN_PASSWORD) {
    console.log('Seeding default admin user...');
    const hash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        full_name: process.env.DEFAULT_ADMIN_NAME || 'Admin',
        username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
        password_hash: hash,
        role_id: 1,
        is_active: true,
      },
    });
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Promise Rejection:', reason);
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    await seedDefaults();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const shutdown = (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed');
        prisma.$disconnect().then(() => {
          console.log('Database connection closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

startServer();
