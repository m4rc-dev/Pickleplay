// ═══════════════════════════════════════════════════════════════
// Image Validation Service
// - Blur Detection via Laplacian Variance (pure Canvas, no OpenCV)
// - OCR Name Matching via Tesseract.js (lazy-loaded for speed)
// ═══════════════════════════════════════════════════════════════

// Lazy-load Tesseract.js — only fetched when OCR is actually needed
let _tesseract: typeof import('tesseract.js') | null = null;
async function getTesseract() {
  if (!_tesseract) _tesseract = await import('tesseract.js');
  return _tesseract;
}

// ─── Blur Detection ──────────────────────────────────────────
// Uses Laplacian variance calculated on a canvas-based grayscale image.
// If variance < threshold → image is blurry.

const BLUR_THRESHOLD = 15; // Tune this: lower = more lenient, higher = stricter

/**
 * Loads an image File into an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculates the Laplacian variance of a grayscale image on a canvas.
 * Higher variance = sharper image. Lower = blurry.
 */
function calculateLaplacianVariance(imageData: ImageData): number {
  const { data, width, height } = imageData;

  // Convert to grayscale luminance array
  const gray = new Float64Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Apply 3x3 Laplacian kernel: [0, 1, 0], [1, -4, 1], [0, 1, 0]
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const laplacian =
        gray[idx - width] +      // top
        gray[idx + width] +      // bottom
        gray[idx - 1] +          // left
        gray[idx + 1] -          // right
        4 * gray[idx];           // center * -4

      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  // Variance = E[X²] - (E[X])²
  const mean = sum / count;
  const variance = (sumSq / count) - (mean * mean);
  return variance;
}

export interface BlurCheckResult {
  isBlurry: boolean;
  variance: number;
  threshold: number;
  message: string;
}

/**
 * Checks if an image file is blurry using Laplacian variance.
 * Only works with image files (not PDFs).
 */
export async function checkImageBlur(file: File): Promise<BlurCheckResult> {
  // Skip blur check for non-image files
  if (!file.type.startsWith('image/')) {
    return {
      isBlurry: false,
      variance: 999,
      threshold: BLUR_THRESHOLD,
      message: 'PDF files skip blur check.',
    };
  }

  try {
    // Use createImageBitmap when available — faster, doesn't block main thread
    let imgSource: HTMLImageElement | ImageBitmap;
    let objectUrl = '';
    if (typeof createImageBitmap === 'function') {
      imgSource = await createImageBitmap(file);
    } else {
      imgSource = await loadImage(file);
      objectUrl = (imgSource as HTMLImageElement).src;
    }

    // Create canvas and draw image (scale down aggressively for speed)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    // Scale to max 512px — blur detection doesn't need high res
    const maxDim = 512;
    let w = imgSource.width;
    let h = imgSource.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(imgSource, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const variance = calculateLaplacianVariance(imageData);

    // Clean up
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if ('close' in imgSource) (imgSource as ImageBitmap).close();

    const isBlurry = variance < BLUR_THRESHOLD;

    return {
      isBlurry,
      variance: Math.round(variance * 100) / 100,
      threshold: BLUR_THRESHOLD,
      message: isBlurry
        ? 'This image appears blurry. Please upload a clearer photo for better verification.'
        : 'Image quality looks good!',
    };
  } catch (err) {
    console.error('Blur detection error:', err);
    // If detection fails, don't block the user
    return {
      isBlurry: false,
      variance: 999,
      threshold: BLUR_THRESHOLD,
      message: 'Could not analyze image quality.',
    };
  }
}


// ─── OCR Name Matching ──────────────────────────────────────

export interface NameMatchResult {
  matched: boolean;
  extractedText: string;
  profileName: string;
  confidence: number;
  matchDetails: string;
}

/**
 * Normalizes a name string for comparison:
 * - lowercase, trim, remove extra spaces
 * - remove common prefixes/suffixes
 * - remove special characters
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '')  // keep only letters and spaces
    .replace(/\s+/g, ' ')       // collapse multiple spaces
    .trim();
}

/**
 * Splits a full name into individual name parts (tokens).
 */
function getNameTokens(fullName: string): string[] {
  const normalized = normalizeName(fullName);
  return normalized.split(' ').filter(t => t.length >= 2); // skip 1-char tokens
}

/**
 * Calculates how many of the user's name tokens appear in the OCR text.
 * Returns a score from 0 to 1 (1 = all parts found).
 */
function calculateNameMatchScore(profileName: string, ocrText: string): number {
  const nameTokens = getNameTokens(profileName);
  if (nameTokens.length === 0) return 0;

  const normalizedOcr = normalizeName(ocrText);

  let matchedTokens = 0;
  for (const token of nameTokens) {
    // Check if this name part appears in the OCR text
    if (normalizedOcr.includes(token)) {
      matchedTokens++;
    }
  }

  return matchedTokens / nameTokens.length;
}

// Minimum match score required (0.5 = at least half the name tokens must match)
const NAME_MATCH_THRESHOLD = 0.5;

/**
 * Uses Tesseract.js OCR to extract text from an ID image,
 * then compares it against the user's registered profile name.
 *
 * @param file - The ID image file to analyze
 * @param profileFullName - The user's full_name from their profile
 * @returns NameMatchResult with match status and details
 */
export async function checkNameMatch(
  file: File,
  profileFullName: string
): Promise<NameMatchResult> {
  // Skip for non-image files
  if (!file.type.startsWith('image/')) {
    return {
      matched: true,
      extractedText: '',
      profileName: profileFullName,
      confidence: 0,
      matchDetails: 'PDF files skip OCR name check.',
    };
  }

  // If no profile name, skip
  if (!profileFullName || profileFullName.trim().length < 2) {
    return {
      matched: true,
      extractedText: '',
      profileName: profileFullName,
      confidence: 0,
      matchDetails: 'No profile name to compare against.',
    };
  }

  try {
    // Run Tesseract OCR — use English, which handles most Philippine IDs
    const Tesseract = await getTesseract();
    const result = await Tesseract.recognize(file, 'eng', {
      logger: () => {}, // suppress logs
    });

    const extractedText = result.data.text || '';
    const ocrConfidence = result.data.confidence || 0;

    if (!extractedText.trim()) {
      return {
        matched: true, // Don't block if OCR returns nothing
        extractedText: '',
        profileName: profileFullName,
        confidence: ocrConfidence,
        matchDetails: 'Could not extract text from ID. Please ensure the ID is clear and well-lit.',
      };
    }

    // Calculate name match score
    const nameTokens = getNameTokens(profileFullName);
    const score = calculateNameMatchScore(profileFullName, extractedText);
    const matchedCount = Math.round(score * nameTokens.length);
    const matched = score >= NAME_MATCH_THRESHOLD;

    return {
      matched,
      extractedText: extractedText.substring(0, 500), // truncate for safety
      profileName: profileFullName,
      confidence: ocrConfidence,
      matchDetails: matched
        ? `Name verified! Found ${matchedCount}/${nameTokens.length} name parts on the ID.`
        : `Warning: The name on your ID does not appear to match your registered name "${profileFullName}". Found ${matchedCount}/${nameTokens.length} name parts. Please upload the correct ID that matches your PicklePlay profile name.`,
    };
  } catch (err) {
    console.error('OCR name match error:', err);
    return {
      matched: true, // Don't block on OCR errors
      extractedText: '',
      profileName: profileFullName,
      confidence: 0,
      matchDetails: 'Could not perform name verification. You may continue.',
    };
  }
}


// ─── Combined Validation ────────────────────────────────────

export interface IDValidationResult {
  blur: BlurCheckResult;
  nameMatch: NameMatchResult | null; // null if name check wasn't performed
  canProceed: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Runs both blur detection and OCR name matching on an ID image.
 * Returns comprehensive validation result.
 *
 * @param file - The ID photo file
 * @param profileFullName - User's full_name from profile (for name matching)
 * @param checkName - Whether to run OCR name matching (true for front ID, false for back/selfie)
 */
export async function validateIDImage(
  file: File,
  profileFullName: string,
  checkName: boolean = false
): Promise<IDValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Run blur check
  const blur = await checkImageBlur(file);

  // Run name check only if requested (front ID only)
  let nameMatch: NameMatchResult | null = null;
  if (checkName && file.type.startsWith('image/')) {
    nameMatch = await checkNameMatch(file, profileFullName);
  }

  // Determine errors and warnings
  if (blur.isBlurry) {
    errors.push(blur.message);
  }

  if (nameMatch && !nameMatch.matched) {
    warnings.push(nameMatch.matchDetails);
  }

  // Can proceed if not blurry (name mismatch is a warning, not a blocker)
  const canProceed = !blur.isBlurry;

  return {
    blur,
    nameMatch,
    canProceed,
    warnings,
    errors,
  };
}
