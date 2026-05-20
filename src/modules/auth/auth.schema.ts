import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(12, 'Password must be at least 12 characters'),
});
