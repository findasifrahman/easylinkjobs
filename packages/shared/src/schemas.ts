import { z } from "zod";

export const LocaleSchema = z.enum(["en", "zh", "bn"]);

export const TrackingEventSchema = z.object({
  eventName: z.string().min(1),
  eventTime: z.string().datetime(),
  anonymousId: z.string().min(1),
  userId: z.string().optional(),
  sessionId: z.string().min(1),
  path: z.string().min(1),
  locale: LocaleSchema,
  properties: z.record(z.unknown()).default({})
});

export const PublicJobFilterSchema = z.object({
  locale: LocaleSchema,
  keyword: z.string().optional(),
  city: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20)
});

export type Locale = z.infer<typeof LocaleSchema>;
export type TrackingEvent = z.infer<typeof TrackingEventSchema>;
export type PublicJobFilter = z.infer<typeof PublicJobFilterSchema>;
