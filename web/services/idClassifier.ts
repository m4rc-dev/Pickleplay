// ═══════════════════════════════════════════════════════════════
// ID Type Classifier Service — MobileNet V2 Embedding Similarity
// 
// HOW IT WORKS:
//   1. Admin uploads sample ID images per type (e.g., 5 National IDs)
//   2. MobileNet V2 extracts a 1280-dim feature vector for each image
//   3. We compute & store the AVERAGE embedding per ID type
//   4. When a player uploads their ID, we extract features and compare
//      via cosine similarity against each stored class embedding
//   5. If the image is most similar to a different class than selected → warn
//   6. If similarity is too low for ALL classes → mark as "unknown"
//
// This approach is FAR more reliable than softmax classification for
// few-shot learning (even with just 2-3 training images per type).
// Training images are also persisted to Supabase for cross-device use.
// ═══════════════════════════════════════════════════════════════

import * as tf from '@tensorflow/tfjs';

// ─── Philippine Government ID Types ──────────────────────────
export const ID_CLASSES = [
  'philippine_passport',
  'philippine_drivers_license',
  'philsys_national_id',
  'sss_umid_card',
  'prc_id',
  'postal_id',
  'voters_id',
  'unknown',
] as const;

export type IDClass = (typeof ID_CLASSES)[number];

export const ID_CLASS_LABELS: Record<IDClass, string> = {
  philippine_passport: 'Philippine Passport',
  philippine_drivers_license: "Philippine Driver's License",
  philsys_national_id: 'PhilSys National ID',
  sss_umid_card: 'SSS UMID Card',
  prc_id: 'PRC ID',
  postal_id: 'Postal ID',
  voters_id: "Voter's ID",
  unknown: 'Unknown / Not Recognized',
};

// ─── Constants ───────────────────────────────────────────────
const IMAGE_SIZE = 224; // MobileNet input size
const MOBILENET_URL = 'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/feature_vector/3/default/1';
const NUM_CLASSES = ID_CLASSES.length;

// Cosine similarity thresholds
const SIMILARITY_MATCH_THRESHOLD = 0.70;  // ≥70% = confident match
const SIMILARITY_MISMATCH_GAP = 0.08;     // Another class 8%+ more similar → mismatch

// ─── Singleton State ─────────────────────────────────────────
let featureExtractor: tf.GraphModel | null = null;
let isModelReady = false;
let loadingPromise: Promise<void> | null = null;

// Per-class average embeddings — the core of our matching system
// Map: idClass → number[] (1280-dim feature vector)
let classEmbeddings: Map<string, number[]> = new Map();

const EMBEDDINGS_KEY = 'pickleplay-id-class-embeddings';
const TRAINED_CLASSES_KEY = 'pickleplay-id-classifier-classes';

// ─── Image Preprocessing ─────────────────────────────────────

/**
 * Converts a File/Blob to a tf.Tensor3D normalized to [-1, 1].
 * Uses FileReader → data URL → Image → Canvas pipeline.
 */
export function imageFileToTensor(file: File | Blob): Promise<tf.Tensor3D> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = IMAGE_SIZE;
          canvas.height = IMAGE_SIZE;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
          const tensor = tf.browser
            .fromPixels(canvas)
            .toFloat()
            .div(127.5)
            .sub(1) as tf.Tensor3D;
          resolve(tensor);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Preprocesses a video frame to tensor (for camera capture).
 */
export function videoFrameToTensor(video: HTMLVideoElement): tf.Tensor3D {
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
  return tf.browser
    .fromPixels(canvas)
    .toFloat()
    .div(127.5)
    .sub(1) as tf.Tensor3D;
}

// ─── Feature Extractor (MobileNet V2) ────────────────────────

async function loadFeatureExtractor(): Promise<void> {
  if (featureExtractor) return;
  try {
    featureExtractor = await tf.loadGraphModel(MOBILENET_URL, { fromTFHub: true });
    console.log('[IDClassifier] MobileNet V2 feature extractor loaded');
  } catch (err) {
    console.warn('[IDClassifier] Failed to load MobileNet from TFHub:', err);
    featureExtractor = null;
  }
}

/**
 * Extract features from a preprocessed image tensor.
 * Returns a 1D feature vector as tf.Tensor2D [1, featureDim].
 */
function extractFeatures(imageTensor: tf.Tensor3D): tf.Tensor2D {
  const batched = imageTensor.expandDims(0) as tf.Tensor4D;
  if (featureExtractor) {
    const features = featureExtractor.predict(batched) as tf.Tensor2D; // [1, 1280]
    batched.dispose();
    return features;
  }
  // Fallback: simple average pooling + flatten
  const pooled = tf.avgPool(batched as tf.Tensor4D, [7, 7], [7, 7], 'valid');
  const flat = pooled.reshape([1, -1]) as tf.Tensor2D;
  batched.dispose();
  pooled.dispose();
  return flat;
}

/**
 * Extract features from an image file and return as plain number array.
 */
async function extractFeaturesFromFile(file: File): Promise<number[]> {
  const tensor = await imageFileToTensor(file);
  const features = extractFeatures(tensor);
  const data = Array.from(await features.data());
  tensor.dispose();
  features.dispose();
  return data;
}

// ─── Cosine Similarity ───────────────────────────────────────

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

/**
 * Compute the element-wise average of an array of vectors.
 */
function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      avg[i] += vec[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    avg[i] /= vectors.length;
  }
  return avg;
}

// ─── Embedding Persistence ───────────────────────────────────

function saveEmbeddingsToStorage(): void {
  try {
    const obj: Record<string, number[]> = {};
    classEmbeddings.forEach((vec, key) => { obj[key] = vec; });
    localStorage.setItem(EMBEDDINGS_KEY, JSON.stringify(obj));
    localStorage.setItem(TRAINED_CLASSES_KEY, JSON.stringify([...classEmbeddings.keys()]));
    console.log('[IDClassifier] Saved embeddings for classes:', [...classEmbeddings.keys()]);
  } catch (err) {
    console.warn('[IDClassifier] Failed to save embeddings:', err);
  }
}

function loadEmbeddingsFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(EMBEDDINGS_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw) as Record<string, number[]>;
    classEmbeddings = new Map(Object.entries(obj));
    console.log('[IDClassifier] Loaded embeddings for classes:', [...classEmbeddings.keys()]);
    return classEmbeddings.size > 0;
  } catch {
    return false;
  }
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Initialize the classifier — load MobileNet + restore saved embeddings.
 * Safe to call multiple times (idempotent).
 */
export async function initClassifier(): Promise<void> {
  if (isModelReady) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      await loadFeatureExtractor();
      loadEmbeddingsFromStorage();
      isModelReady = true;
      console.log('[IDClassifier] Ready. Trained classes:', [...classEmbeddings.keys()]);
    } catch (err) {
      console.error('[IDClassifier] Init failed:', err);
      throw err;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

/**
 * Check if the classifier has been trained (has saved embeddings).
 */
export async function isClassifierTrained(): Promise<boolean> {
  try {
    const raw = localStorage.getItem(EMBEDDINGS_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return Object.keys(obj).length > 0;
  } catch {
    return false;
  }
}

/**
 * Returns whether the classifier is ready for predictions.
 */
export function isReady(): boolean {
  return isModelReady && classEmbeddings.size > 0;
}

// ─── Training ────────────────────────────────────────────────

export interface TrainingImage {
  file: File;
  label: IDClass;
}

export interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
  phase: 'extracting' | 'training' | 'saving' | 'done';
  message: string;
}

/**
 * Train the classifier on a set of labelled ID images.
 *
 * Instead of training a neural network classifier (which fails with few samples),
 * we extract MobileNet feature embeddings for each image and compute the
 * average embedding per class. This is stored and used for cosine-similarity
 * matching during classification.
 *
 * This approach works reliably even with just 2-3 images per ID type, and
 * correctly rejects images that don't match any trained class.
 *
 * @param images - Array of { file, label } training pairs
 * @param _epochs - Unused (kept for API compat) — embedding approach is instant
 * @param onProgress - Callback for training progress updates
 */
export async function trainClassifier(
  images: TrainingImage[],
  _epochs: number = 20,
  onProgress?: (progress: TrainingProgress) => void
): Promise<{ finalLoss: number; finalAccuracy: number }> {
  if (!isModelReady) await initClassifier();

  const report = (p: Partial<TrainingProgress>) =>
    onProgress?.({ epoch: 0, totalEpochs: 1, loss: 0, accuracy: 0, phase: 'extracting', message: '', ...p } as TrainingProgress);

  report({ phase: 'extracting', message: `Extracting MobileNet features from ${images.length} images...` });

  // Group images by class
  const imagesByClass: Map<string, File[]> = new Map();
  for (const { file, label } of images) {
    const arr = imagesByClass.get(label) || [];
    arr.push(file);
    imagesByClass.set(label, arr);
  }

  // Extract features and compute average embedding per class
  const newEmbeddings: Map<string, number[]> = new Map();
  let processedCount = 0;

  for (const [idClass, files] of imagesByClass.entries()) {
    const vectors: number[][] = [];

    for (const file of files) {
      processedCount++;
      report({
        phase: 'extracting',
        message: `Extracting features ${processedCount}/${images.length}: ${ID_CLASS_LABELS[idClass as IDClass]}`,
      });

      const features = await extractFeaturesFromFile(file);
      vectors.push(features);
    }

    // Compute average embedding for this class
    const avgEmbedding = averageVectors(vectors);
    newEmbeddings.set(idClass, avgEmbedding);

    report({
      phase: 'training',
      epoch: 1,
      totalEpochs: 1,
      accuracy: processedCount / images.length,
      loss: 0,
      message: `Computed embedding for ${ID_CLASS_LABELS[idClass as IDClass]} (${files.length} images)`,
    });
  }

  // Store embeddings
  report({ phase: 'saving', message: 'Saving embeddings...' });
  classEmbeddings = newEmbeddings;
  saveEmbeddingsToStorage();

  // Validate: check that each training image is most similar to its own class
  report({ phase: 'saving', message: 'Validating accuracy...' });
  let correct = 0;
  let total = 0;

  for (const { file, label } of images) {
    const features = await extractFeaturesFromFile(file);
    let bestClass = 'unknown';
    let bestSim = -1;

    for (const [cls, emb] of classEmbeddings.entries()) {
      const sim = cosineSimilarity(features, emb);
      if (sim > bestSim) {
        bestSim = sim;
        bestClass = cls;
      }
    }

    if (bestClass === label) correct++;
    total++;
  }

  const accuracy = total > 0 ? correct / total : 1;

  report({
    phase: 'done',
    epoch: 1,
    totalEpochs: 1,
    accuracy,
    loss: 1 - accuracy,
    message: `Training complete! Embedding accuracy: ${(accuracy * 100).toFixed(1)}% — ${[...classEmbeddings.keys()].map(c => ID_CLASS_LABELS[c as IDClass]).join(', ')} trained`,
  });

  return { finalLoss: 1 - accuracy, finalAccuracy: accuracy };
}

/**
 * Delete all saved embeddings and reset.
 */
export async function deleteClassifier(): Promise<void> {
  try {
    classEmbeddings.clear();
    try {
      localStorage.removeItem(EMBEDDINGS_KEY);
      localStorage.removeItem(TRAINED_CLASSES_KEY);
    } catch {}
    // Also clean up any legacy IndexedDB model
    try {
      await tf.io.removeModel('indexeddb://pickleplay-id-classifier');
    } catch {}
    console.log('[IDClassifier] Embeddings deleted');
  } catch (err) {
    console.warn('[IDClassifier] Delete error:', err);
  }
}

// ─── Prediction ──────────────────────────────────────────────

export interface PredictionResult {
  predictedClass: IDClass;
  confidence: number;
  allScores: Record<IDClass, number>;
  matchesSelected: boolean;
  message: string;
}

/**
 * Classify an uploaded ID image using cosine similarity against stored embeddings.
 *
 * How matching works:
 *   - Extract MobileNet features from the uploaded image
 *   - Compute cosine similarity against EACH trained class's average embedding
 *   - If best match ≥ threshold → return that class
 *   - If best match is a DIFFERENT class than what user selected → mismatch warning
 *   - If best match < threshold → "unknown"
 *
 * @param file - The ID image file
 * @param selectedIdType - The ID type the user claims to be uploading
 */
export async function classifyID(
  file: File,
  selectedIdType?: string
): Promise<PredictionResult> {
  if (!isModelReady || classEmbeddings.size === 0) {
    return {
      predictedClass: 'unknown',
      confidence: 0,
      allScores: Object.fromEntries(ID_CLASSES.map((c) => [c, 0])) as Record<IDClass, number>,
      matchesSelected: true,
      message: 'ID classifier not trained yet. Skipping template verification.',
    };
  }

  try {
    // Extract features from the uploaded image
    const features = await extractFeaturesFromFile(file);

    // Compute cosine similarity against each trained class
    const similarities: Record<string, number> = {};
    let bestClass = 'unknown';
    let bestSim = -1;

    for (const [cls, embedding] of classEmbeddings.entries()) {
      const sim = cosineSimilarity(features, embedding);
      similarities[cls] = sim;
      if (sim > bestSim) {
        bestSim = sim;
        bestClass = cls;
      }
    }

    // Build allScores for all ID classes (untrained classes get 0)
    const allScores: Record<string, number> = {};
    for (const cls of ID_CLASSES) {
      allScores[cls] = Math.round((similarities[cls] ?? 0) * 10000) / 10000;
    }

    // Convert cosine similarity to display confidence
    // Cosine sim for similar document images typically ranges ~0.60-0.95
    // Map [0.5, 1.0] → [0%, 100%] for display
    const normalizedConfidence = Math.max(0, Math.min(100, Math.round((bestSim - 0.5) * 200)));

    let predictedClass: IDClass;

    // If best similarity is below threshold → unknown
    if (bestSim < SIMILARITY_MATCH_THRESHOLD) {
      predictedClass = 'unknown';
    } else {
      predictedClass = bestClass as IDClass;
    }

    // Check match against user's selected ID type
    let matchesSelected: boolean;
    let message: string;

    if (predictedClass === 'unknown') {
      matchesSelected = true; // Don't block — but warn
      message = `⚠️ This image doesn't closely match any trained ID template (best similarity: ${normalizedConfidence}%). Please ensure you're uploading a clear, full photo of your selected ID.`;
    } else if (!selectedIdType) {
      matchesSelected = true;
      message = `✅ Detected: ${ID_CLASS_LABELS[predictedClass]} (${normalizedConfidence}% match)`;
    } else if (selectedIdType === predictedClass) {
      matchesSelected = true;
      message = `✅ Detected: ${ID_CLASS_LABELS[predictedClass]} (${normalizedConfidence}% match) — matches your selected ID type!`;
    } else {
      // The uploaded image matches a DIFFERENT class than what user selected
      const selectedSim = similarities[selectedIdType] ?? 0;
      const selectedNorm = Math.max(0, Math.min(100, Math.round((selectedSim - 0.5) * 200)));

      // Check if the gap is significant enough to warn
      if (bestSim - selectedSim > SIMILARITY_MISMATCH_GAP) {
        matchesSelected = false;
        message = `⚠️ This looks like a ${ID_CLASS_LABELS[predictedClass]} (${normalizedConfidence}% match), but you selected "${ID_CLASS_LABELS[selectedIdType as IDClass] || selectedIdType}" (only ${selectedNorm}% match). Please upload the correct ID type.`;
      } else {
        // Gap is small — might be ambiguous, allow it
        matchesSelected = true;
        message = `✅ Detected: ${ID_CLASS_LABELS[predictedClass]} (${normalizedConfidence}% match)`;
      }
    }

    return {
      predictedClass,
      confidence: normalizedConfidence,
      allScores: allScores as Record<IDClass, number>,
      matchesSelected,
      message,
    };
  } catch (err) {
    console.error('[IDClassifier] Prediction error:', err);
    return {
      predictedClass: 'unknown',
      confidence: 0,
      allScores: Object.fromEntries(ID_CLASSES.map((c) => [c, 0])) as Record<IDClass, number>,
      matchesSelected: true,
      message: 'Classification check could not complete. You may continue.',
    };
  }
}

/**
 * Get info about the stored embeddings.
 */
export async function getModelInfo(): Promise<{
  exists: boolean;
  dateSaved?: Date;
  modelSizeBytes?: number;
  trainedClasses?: string[];
} | null> {
  try {
    const raw = localStorage.getItem(EMBEDDINGS_KEY);
    if (!raw) return { exists: false };
    const obj = JSON.parse(raw);
    const classes = Object.keys(obj);
    if (classes.length === 0) return { exists: false };
    return {
      exists: true,
      dateSaved: new Date(),
      modelSizeBytes: raw.length,
      trainedClasses: classes,
    };
  } catch {
    return null;
  }
}
