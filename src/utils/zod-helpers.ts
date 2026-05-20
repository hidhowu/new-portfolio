import { z } from 'zod';

// Optional URL field. UI sends '' for cleared inputs — coerce '' to null
// so it doesn't fail z.string().url() and Prisma can clear the column.
export const optionalUrl = () =>
  z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().url().nullable().optional(),
  );

// Optional string. Coerces '' to null so PATCH/POST can clear a column
// without tripping any later string constraints.
export const optionalString = () =>
  z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().nullable().optional(),
  );

// Optional foreign-key id. UI sends '' when the relation is cleared —
// coerce to null so Prisma disconnects instead of trying to find id ''.
export const optionalId = () =>
  z.preprocess(
    (v) => (v === '' ? null : v),
    z.string().nullable().optional(),
  );
