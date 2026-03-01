import { z } from 'zod'

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

const validUnits = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece'] as const
const unitListStr = validUnits.join(', ')

export const MealItemSchema = z.object({
  food: z
    .string({ error: "missing or invalid 'food' field" })
    .min(1, { error: "'food' must be a non-empty string" }),
  quantity: z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? "missing 'quantity' field"
          : "'quantity' must be a number",
    })
    .positive({ error: "'quantity' must be a positive number" }),
  unit: z.enum(validUnits, {
    error: `'unit' must be one of: ${unitListStr}`,
  }),
})

export const MealSchema = z.object({
  name: z
    .string({ error: "missing or invalid 'name' field" })
    .min(1, { error: "'name' must be a non-empty string" }),
  time: z
    .string({ error: "missing or invalid 'time' field" })
    .regex(timeRegex, { error: "'time' must be in HH:mm format (e.g., 07:00)" }),
  items: z
    .array(MealItemSchema, { error: "missing or invalid 'items' field" })
    .min(1, { error: "each meal must have at least 1 item" }),
})

export const MealPlanSchema = z.object({
  planName: z
    .string({ error: "missing or invalid 'planName' field" })
    .min(1, { error: "'planName' must be a non-empty string" }),
  meals: z
    .array(MealSchema, { error: "missing or invalid 'meals' field" })
    .min(1, { error: "meal plan must have at least 1 meal" }),
})

export type MealItemInput = z.infer<typeof MealItemSchema>
export type MealInput = z.infer<typeof MealSchema>
export type MealPlanInput = z.infer<typeof MealPlanSchema>
