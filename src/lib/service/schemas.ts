// src/lib/service/schemas.ts
// ============================================================================
// Schemas (Zod) para APIs service-only — nível PhD
// ----------------------------------------------------------------------------
// Centraliza validações de entrada para as rotas de serviço, facilitando
// manutenção e respostas de erro consistentes.
// ============================================================================

import { z } from 'zod';

export const PutWebStoryBody = z.object({
  storyContent: z.string().min(20, 'storyContent (HTML) é obrigatório e deve ter conteúdo'),
  coverUrl: z.string().url('coverUrl deve ser uma URL válida').optional(),
  publish: z.boolean().optional().default(false),
  storyOptions: z.any().optional(),
});