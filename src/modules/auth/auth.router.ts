import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { loginLimiter } from '../../middleware/rateLimit';
import { verifyCsrf } from '../../middleware/csrf';
import { loginSchema, changePasswordSchema } from './auth.schema';
import * as ctrl from './auth.controller';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(ctrl.login));
router.post('/logout', asyncHandler(ctrl.logout));
router.get('/me', requireAuth, asyncHandler(ctrl.me));
router.post(
  '/change-password',
  requireAuth,
  verifyCsrf,
  validate(changePasswordSchema),
  asyncHandler(ctrl.changePassword),
);

export default router;
