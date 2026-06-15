import { defineConfig } from 'prisma/config';

export default defineConfig({
  environments: {
    default: {
      database: {
        url: process.env['DATABASE_URL'] || '',
      },
    },
  },
});
