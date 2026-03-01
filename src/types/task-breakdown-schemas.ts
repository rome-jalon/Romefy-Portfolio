import { z } from 'zod'

export const instructionSchema = z.string().min(20, 'Instruction must be at least 20 characters').max(1000, 'Instruction must be at most 1,000 characters')

export const geminiTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  estimatedTime: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']),
  parentIndex: z.number().int().nullable(),
})

export const geminiResponseSchema = z.array(geminiTaskSchema)
