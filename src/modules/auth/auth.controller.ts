import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/db';
import { issueToken, clearToken } from '../../middleware/auth';
import { AppError } from '../../middleware/error';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  issueToken(res, { userId: user.id, email: user.email });
  res.json({ ok: true, name: user.name, email: user.email });
}

export async function logout(_req: Request, res: Response) {
  clearToken(res);
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, lastLoginAt: true },
  });
  if (!user) throw new AppError(404, 'User not found');
  res.json(user);
}

export async function changePassword(req: Request, res: Response) {
  const { current, next } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) throw new AppError(404, 'User not found');

  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) throw new AppError(401, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(next, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ ok: true });
}
