import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import variantRoutes from './routes/variantRoutes';
import transactionRoutes from './routes/transactionRoutes';
import rawMaterialRoutes from './routes/rawMaterialRoutes';
import orderRoutes from './routes/orderRoutes';
import bundleRoutes from './routes/bundleRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import shiftRoutes from './routes/shiftRoutes';
import userRoutes from './routes/userRoutes';

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['*', 'https://bidjikita-dashboard.netlify.app'],
}));

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/users', userRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'POS Bidjikita API Running' });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Terjadi kesalahan server' : err.message,
  });
});

export default app;
