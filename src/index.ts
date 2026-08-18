import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { apiLimiter } from './middlewares/rateLimiter.middleware';
import authRoutes from './routes/auth.routes';
import roleRoutes from './routes/role.routes';
import permissionRoutes from './routes/permission.routes';
import { sendError } from './utils/response';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// Apply global rate limiter
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  sendError(res, 500, 'Internal Server Error');
});

app.listen(port, () =>
{
  console.log(`Server is running on port ${port}`);
});
