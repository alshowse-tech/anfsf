// [generated]
import { z } from 'zod';

// TODO: implement full investment plan validation schema
const createPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  totalBudget: z.number().positive('Budget must be positive'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
});

const updatePlanSchema = createPlanSchema.partial();

export { createPlanSchema, updatePlanSchema };
