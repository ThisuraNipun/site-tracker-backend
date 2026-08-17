import rateLimit from 'express-rate-limit';

// Note: In the future, we will implement Redis for rate limiting.
// To do this, install `rate-limit-redis` and `redis`, then uncomment and configure the RedisStore.

/*
import { RedisStore } from 'rate-limit-redis';
import redisClient from '../utils/redis'; // You will need to create this

const store = new RedisStore({
  sendCommand: (...args: string[]) => redisClient.sendCommand(args),
});
*/

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per `window` (here, per 15 minutes)
  message: { success: false, error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // store: store, // Uncomment this line to use Redis
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  // store: store, // Uncomment this line to use Redis
});
