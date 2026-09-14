import { GoogleGenAI } from '@google/genai';

// Firestore's vector index supports at most 2048 dimensions; gemini-embedding-001
// defaults to 3072, so the reduced size must be requested explicitly. This value
// must stay in sync with the vector index definition in firestore.indexes.json
// and the queryVector dimensionality used in searchMemories.ts.
export const EMBEDDING_DIMENSION = 768;

const DESCRIPTION_PROMPT =
  'Describe this photo in one short sentence (max 20 words), focused on who, ' +
  'what, and where — suitable as a caption for family photo search.';

export async function generateDescription(
  ai: GoogleGenAI,
  imageBytes: Buffer,
  mimeType: string,
): Promise<string> {
  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: DESCRIPTION_PROMPT },
          { inlineData: { data: imageBytes.toString('base64'), mimeType } },
        ],
      },
    ],
  });

  const text = result.text?.trim();
  if (!text) throw new Error('Empty description from Gemini');
  return text;
}

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export async function embedText(
  ai: GoogleGenAI,
  text: string,
  taskType: EmbeddingTaskType,
): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { taskType, outputDimensionality: EMBEDDING_DIMENSION },
  });

  const values = result.embeddings?.[0]?.values;
  if (!values) throw new Error('Empty embedding from Gemini');
  return values;
}
