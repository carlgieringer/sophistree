import { z } from 'zod';

// Base entity schema
const baseEntitySchema = z.object({
  id: z.string().uuid(),
  explicitVisibility: z.enum(['Visible', 'Hidden']).optional(),
  autoVisibility: z.enum(['Visible', 'Hidden'])
});

// Specific entity schemas
const propositionSchema = baseEntitySchema.extend({
  type: z.literal('Proposition'),
  text: z.string()
});

const propositionCompoundSchema = baseEntitySchema.extend({
  type: z.literal('PropositionCompound'),
  atomIds: z.array(z.string().uuid())
});

const justificationSchema = baseEntitySchema.extend({
  type: z.literal('Justification'),
  basisId: z.string().uuid(),
  targetId: z.string().uuid(),
  polarity: z.enum(['Positive', 'Negative'])
});

const urlInfoSchema = z.object({
  url: z.string().url(),
  canonicalUrl: z.string().url().optional(),
  pdfFingerprint: z.string().optional()
});

const sourceInfoSchema = z.object({
  name: z.string()
});

const mediaExcerptSchema = baseEntitySchema.extend({
  type: z.literal('MediaExcerpt'),
  quotation: z.string(),
  urlInfo: urlInfoSchema,
  sourceInfo: sourceInfoSchema,
  domAnchor: z.any() // TODO: Define specific schema for DomAnchor
});

const appearanceSchema = baseEntitySchema.extend({
  type: z.literal('Appearance'),
  apparitionId: z.string().uuid(),
  mediaExcerptId: z.string().uuid()
});

// Combined entity schema
const entitySchema = z.discriminatedUnion('type', [
  propositionSchema,
  propositionCompoundSchema,
  justificationSchema,
  mediaExcerptSchema,
  appearanceSchema
]);

// Conclusion info schema
const conclusionInfoSchema = z.object({
  propositionIds: z.array(z.string().uuid()),
  sourceNames: z.array(z.string()),
  urls: z.array(z.string().url())
});

// Complete argument map schema
export const argumentMapSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  entities: z.array(entitySchema),
  conclusions: z.array(conclusionInfoSchema),
  sourceNameOverrides: z.record(z.string())
});

// Request body schema for updateMap endpoint
export const updateMapRequestSchema = z.object({
  map: argumentMapSchema
});

// Types derived from schemas
export type ArgumentMap = z.infer<typeof argumentMapSchema>;
export type UpdateMapRequest = z.infer<typeof updateMapRequestSchema>;
