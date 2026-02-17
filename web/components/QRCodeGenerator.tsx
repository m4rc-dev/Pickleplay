import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  QrCode,
  Download,
  Copy,
  Palette,
  Link,
  Image as ImageIcon,
  X,
  Check,
  RefreshCw,
  Sparkles,
  Eye,
  Trash2,
  Plus,
  Share2,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  CornerDownRight,
} from 'lucide-react';
import QRCode from 'qrcode';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════
type PatternStyle = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded';
type CornerSquareStyle = 'none' | 'square' | 'rounded' | 'circle' | 'outpoint' | 'inpoint';
type CornerDotStyle = 'none' | 'square' | 'rounded' | 'circle' | 'diamond' | 'star';
type GradientDirection = 'horizontal' | 'vertical' | 'diagonal' | 'radial';
type FrameStyle = 'none' | 'simple' | 'rounded' | 'banner-bottom' | 'badge-top' | 'ticket' | 'circle-badge' | 'bold-bottom';

interface GradientConfig {
  enabled: boolean;
  color1: string;
  color2: string;
  direction: GradientDirection;
}

interface QRConfig {
  url: string;
  label: string;
  patternStyle: PatternStyle;
  patternColor: string;
  patternGradient: GradientConfig;
  bgColor: string;
  transparentBg: boolean;
  bgGradient: GradientConfig;
  cornerSquareStyle: CornerSquareStyle;
  cornerSquareColor: string;
  cornerDotStyle: CornerDotStyle;
  cornerDotColor: string;
  logoUrl: string;
  frameStyle: FrameStyle;
  frameColor: string;
  frameTextColor: string;
  frameText: string;
  size: number;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
}

interface SavedQR {
  id: string;
  config: QRConfig;
  createdAt: string;
}

const DEFAULT_CONFIG: QRConfig = {
  url: 'https://pickleplay.ph',
  label: 'PicklePlay Marketing',
  patternStyle: 'square',
  patternColor: '#1a7a4c',
  patternGradient: { enabled: false, color1: '#AFD137', color2: '#1057A7', direction: 'horizontal' },
  bgColor: '#ffffff',
  transparentBg: false,
  bgGradient: { enabled: false, color1: '#ffffff', color2: '#f0f0f0', direction: 'vertical' },
  cornerSquareStyle: 'square',
  cornerSquareColor: '#1a7a4c',
  cornerDotStyle: 'square',
  cornerDotColor: '#1a7a4c',
  logoUrl: '',
  frameStyle: 'none',
  frameColor: '#1a7a4c',
  frameTextColor: '#ffffff',
  frameText: 'Scan Me !',
  size: 280,
  errorCorrection: 'H',
};

const PATTERN_STYLES: { id: PatternStyle; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'dots', label: 'Dots' },
  { id: 'classy', label: 'Classy' },
  { id: 'classy-rounded', label: 'Classy Round' },
  { id: 'extra-rounded', label: 'Extra Round' },
];

const CORNER_SQUARE_STYLES: { id: CornerSquareStyle; label: string }[] = [
  { id: 'none', label: '⊘' },
  { id: 'circle', label: '○' },
  { id: 'square', label: '□' },
  { id: 'rounded', label: '▢' },
  { id: 'outpoint', label: '◇' },
  { id: 'inpoint', label: '◈' },
];

const CORNER_DOT_STYLES: { id: CornerDotStyle; label: string }[] = [
  { id: 'none', label: '⊘' },
  { id: 'circle', label: '●' },
  { id: 'square', label: '■' },
  { id: 'rounded', label: '▪' },
  { id: 'diamond', label: '◆' },
  { id: 'star', label: '★' },
];

const FRAME_STYLES: { id: FrameStyle; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'simple', label: 'Simple' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'banner-bottom', label: 'Banner' },
  { id: 'badge-top', label: 'Badge Top' },
  { id: 'ticket', label: 'Ticket' },
  { id: 'circle-badge', label: 'Circle' },
  { id: 'bold-bottom', label: 'Bold' },
];

const PRESET_THEMES = [
  { name: 'PicklePlay', c1: '#AFD137', c2: '#1057A7', bg: '#ffffff', corner: '#1057A7', cornerDot: '#AFD137' },
  { name: 'Ocean', c1: '#0ea5e9', c2: '#1e3a5f', bg: '#ffffff', corner: '#1e3a5f', cornerDot: '#0ea5e9' },
  { name: 'Sunset', c1: '#f97316', c2: '#dc2626', bg: '#fff7ed', corner: '#dc2626', cornerDot: '#f97316' },
  { name: 'Royal', c1: '#7c3aed', c2: '#4f46e5', bg: '#ffffff', corner: '#4f46e5', cornerDot: '#7c3aed' },
  { name: 'Rose', c1: '#f43f5e', c2: '#be123c', bg: '#fff1f2', corner: '#be123c', cornerDot: '#f43f5e' },
  { name: 'Dark', c1: '#22d3ee', c2: '#06b6d4', bg: '#0f172a', corner: '#06b6d4', cornerDot: '#22d3ee' },
  { name: 'Classic', c1: '#000000', c2: '#333333', bg: '#ffffff', corner: '#000000', cornerDot: '#000000' },
  { name: 'Forest', c1: '#16a34a', c2: '#15803d', bg: '#f0fdf4', corner: '#15803d', cornerDot: '#16a34a' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// QR MATRIX HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function getQRMatrix(url: string, ecLevel: 'L' | 'M' | 'Q' | 'H'): boolean[][] {
  const qr = QRCode.create(url || 'https://pickleplay.ph', { errorCorrectionLevel: ecLevel });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const matrix: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      row.push(data[r * size + c] === 1);
    }
    matrix.push(row);
  }
  return matrix;
}

function isFinderPattern(row: number, col: number, size: number): boolean {
  if (row < 7 && col < 7) return true;
  if (row < 7 && col >= size - 7) return true;
  if (row >= size - 7 && col < 7) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS DRAW HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function createGradient(
  ctx: CanvasRenderingContext2D,
  grad: GradientConfig,
  x: number, y: number, w: number, h: number
): CanvasGradient | string {
  if (!grad.enabled) return grad.color1;
  let g: CanvasGradient;
  if (grad.direction === 'radial') {
    const cx = x + w / 2, cy = y + h / 2, r = Math.max(w, h) / 2;
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  } else if (grad.direction === 'vertical') {
    g = ctx.createLinearGradient(x, y, x, y + h);
  } else if (grad.direction === 'diagonal') {
    g = ctx.createLinearGradient(x, y, x + w, y + h);
  } else {
    g = ctx.createLinearGradient(x, y, x + w, y);
  }
  g.addColorStop(0, grad.color1);
  g.addColorStop(1, grad.color2);
  return g;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN DRAWING
// ═══════════════════════════════════════════════════════════════════════════════
function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, moduleSize: number,
  style: PatternStyle
) {
  const s = moduleSize;
  const gap = s * 0.1;
  switch (style) {
    case 'square':
      ctx.fillRect(x, y, s, s);
      break;
    case 'rounded':
      drawRoundedRect(ctx, x + gap, y + gap, s - gap * 2, s - gap * 2, s * 0.35);
      ctx.fill();
      break;
    case 'dots':
      ctx.beginPath();
      ctx.arc(x + s / 2, y + s / 2, s * 0.38, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'classy': {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x + s, y + s);
      ctx.quadraticCurveTo(x + s * 0.2, y + s, x, y + s * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'classy-rounded': {
      const r2 = s * 0.4;
      drawRoundedRect(ctx, x + gap, y + gap, s - gap * 2, s - gap * 2, r2);
      ctx.fill();
      break;
    }
    case 'extra-rounded':
      ctx.beginPath();
      ctx.arc(x + s / 2, y + s / 2, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORNER DRAWING
// ═══════════════════════════════════════════════════════════════════════════════
function drawCornerSquare(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  outerSize: number,
  style: CornerSquareStyle,
  color: string | CanvasGradient
) {
  if (style === 'none') return;
  ctx.strokeStyle = color;
  ctx.lineWidth = outerSize / 7;
  const inner = outerSize - ctx.lineWidth;
  const half = outerSize / 2;

  switch (style) {
    case 'square':
      ctx.strokeRect(cx - inner / 2, cy - inner / 2, inner, inner);
      break;
    case 'rounded': {
      const r = inner * 0.2;
      drawRoundedRect(ctx, cx - inner / 2, cy - inner / 2, inner, inner, r);
      ctx.stroke();
      break;
    }
    case 'circle':
      ctx.beginPath();
      ctx.arc(cx, cy, half - ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'outpoint': {
      const r3 = inner * 0.35;
      drawRoundedRect(ctx, cx - inner / 2, cy - inner / 2, inner, inner, r3);
      ctx.stroke();
      break;
    }
    case 'inpoint': {
      const d = inner;
      const n = d * 0.15;
      ctx.beginPath();
      ctx.moveTo(cx - d / 2 + n, cy - d / 2);
      ctx.lineTo(cx + d / 2 - n, cy - d / 2);
      ctx.lineTo(cx + d / 2, cy - d / 2 + n);
      ctx.lineTo(cx + d / 2, cy + d / 2 - n);
      ctx.lineTo(cx + d / 2 - n, cy + d / 2);
      ctx.lineTo(cx - d / 2 + n, cy + d / 2);
      ctx.lineTo(cx - d / 2, cy + d / 2 - n);
      ctx.lineTo(cx - d / 2, cy - d / 2 + n);
      ctx.closePath();
      ctx.stroke();
      break;
    }
  }
}

function drawCornerDot(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  dotSize: number,
  style: CornerDotStyle,
  color: string | CanvasGradient
) {
  if (style === 'none') return;
  ctx.fillStyle = color;
  const half = dotSize / 2;

  switch (style) {
    case 'square':
      ctx.fillRect(cx - half, cy - half, dotSize, dotSize);
      break;
    case 'rounded':
      drawRoundedRect(ctx, cx - half, cy - half, dotSize, dotSize, dotSize * 0.25);
      ctx.fill();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(cx, cy, half, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy);
      ctx.lineTo(cx, cy + half);
      ctx.lineTo(cx - half, cy);
      ctx.closePath();
      ctx.fill();
      break;
    case 'star': {
      const spikes = 5, outerR = half, innerR = half * 0.45;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI * i) / spikes - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRAME DRAWING
// ═══════════════════════════════════════════════════════════════════════════════
function drawFrame(
  ctx: CanvasRenderingContext2D,
  qrX: number, qrY: number, qrSize: number,
  style: FrameStyle,
  frameColor: string,
  textColor: string,
  text: string
) {
  if (style === 'none') return;

  const pad = 16;
  const textH = 36;

  ctx.save();

  switch (style) {
    case 'simple': {
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2 + textH);
      ctx.fillStyle = frameColor;
      ctx.fillRect(qrX - pad, qrY + qrSize + pad - 2, qrSize + pad * 2, textH);
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.round(textH * 0.45)}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(text, qrX + qrSize / 2, qrY + qrSize + pad + textH * 0.65);
      break;
    }
    case 'rounded': {
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2 + textH, 16);
      ctx.stroke();
      ctx.fillStyle = frameColor;
      drawRoundedRect(ctx, qrX - pad + 1.5, qrY + qrSize + pad - 4, qrSize + pad * 2 - 3, textH + 2, 12);
      ctx.fill();
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.round(textH * 0.45)}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(text, qrX + qrSize / 2, qrY + qrSize + pad + textH * 0.6);
      break;
    }
    case 'banner-bottom': {
      const bw = qrSize + pad * 4;
      const bh = textH + 8;
      const bx = qrX + qrSize / 2 - bw / 2;
      const by = qrY + qrSize + 8;
      ctx.fillStyle = frameColor;
      drawRoundedRect(ctx, bx, by, bw, bh, 10);
      ctx.fill();
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.round(bh * 0.4)}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(text, qrX + qrSize / 2, by + bh * 0.62);
      break;
    }
    case 'badge-top': {
      const bw2 = Math.min(qrSize * 0.7, 180);
      const bh2 = 32;
      const bx2 = qrX + qrSize / 2 - bw2 / 2;
      const by2 = qrY - bh2 - 6;
      ctx.fillStyle = frameColor;
      drawRoundedRect(ctx, bx2, by2, bw2, bh2, 16);
      ctx.fill();
      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.round(bh2 * 0.48)}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(text, qrX + qrSize / 2, by2 + bh2 * 0.67);
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(qrX - pad / 2, qrY - 4, qrSize + pad, qrSize + 8);
      break;
    }
    case 'ticket': {
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 2.5;
      const tx = qrX - pad, ty = qrY - pad;
      const tw = qrSize + pad * 2, th = qrSize + pad * 2 + textH;
      ctx.setLineDash([6, 4]);
      drawRoundedRect(ctx, tx, ty, tw, th, 12);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = frameColor;
      ctx.font = `bold ${Math.round(textH * 0.42)}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(text, qrX + qrSize / 2, qrY + qrSize + pad + textH * 0.55);
      break;
    }
    case 'circle-badge': {
      const cR = (qrSize + pad * 3) / 2;
      ctx.beginPath();
      ctx.arc(qrX + qrSize / 2, qrY + qrSize / 2, cR, 0, Math.PI * 2);
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = frameColor;
      ctx.font = `bold ${Math.round(textH * 0.4)}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(text, qrX + qrSize / 2, qrY + qrSize + pad + 14);
      break;
    }
    case 'bold-bottom': {
      const bbh = textH + 12;
      ctx.fillStyle = frameColor;
      drawRoundedRect(ctx, qrX - pad - 4, qrY + qrSize + 4, qrSize + pad * 2 + 8, bbh, 14);
      ctx.fill();
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, qrX - pad - 4, qrY - pad - 4, qrSize + pad * 2 + 8, qrSize + pad * 2 + bbh + 12, 18);
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.font = `900 ${Math.round(bbh * 0.42)}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(text, qrX + qrSize / 2, qrY + qrSize + 4 + bbh * 0.6);
      break;
    }
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const QRCodeGenerator: React.FC = () => {
  const [config, setConfig] = useState<QRConfig>(DEFAULT_CONFIG);
  const [savedQRs, setSavedQRs] = useState<SavedQR[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<'design' | 'saved'>('design');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    link: true, pattern: true, corners: false, background: false, logo: false, frame: false, themes: false,
  });

  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Load / save
  useEffect(() => {
    const stored = localStorage.getItem('pickleplay_saved_qrs_v2');
    if (stored) { try { setSavedQRs(JSON.parse(stored)); } catch { /* */ } }
  }, []);
  useEffect(() => {
    localStorage.setItem('pickleplay_saved_qrs_v2', JSON.stringify(savedQRs));
  }, [savedQRs]);

  // ─── Full QR Render ──────────────────────────────────────────────────────
  const renderQR = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let matrix: boolean[][];
    try {
      matrix = getQRMatrix(config.url, config.errorCorrection);
    } catch {
      matrix = getQRMatrix('https://pickleplay.ph', config.errorCorrection);
    }
    const moduleCount = matrix.length;
    const moduleSize = config.size / moduleCount;

    const frameExtra = config.frameStyle !== 'none' ? 70 : 0;
    const padding = 32;
    const totalW = config.size + padding * 2;
    const totalH = config.size + padding * 2 + frameExtra;

    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d')!;

    // Background
    if (config.transparentBg) {
      ctx.clearRect(0, 0, totalW, totalH);
    } else {
      if (config.bgGradient.enabled) {
        ctx.fillStyle = createGradient(ctx, config.bgGradient, 0, 0, totalW, totalH) as any;
      } else {
        ctx.fillStyle = config.bgColor;
      }
      ctx.fillRect(0, 0, totalW, totalH);
    }

    const qrX = padding;
    const qrY = padding;

    // Pattern gradient
    const patternFill = config.patternGradient.enabled
      ? createGradient(ctx, config.patternGradient, qrX, qrY, config.size, config.size)
      : config.patternColor;

    // Draw data modules (skip finder patterns)
    ctx.fillStyle = patternFill as any;
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (!matrix[r][c]) continue;
        if (isFinderPattern(r, c, moduleCount)) continue;
        const px = qrX + c * moduleSize;
        const py = qrY + r * moduleSize;
        drawDot(ctx, px, py, moduleSize, config.patternStyle);
      }
    }

    // Draw finder patterns (corners)
    const finderPositions = [
      { r: 0, c: 0 },
      { r: 0, c: moduleCount - 7 },
      { r: moduleCount - 7, c: 0 },
    ];

    for (const pos of finderPositions) {
      const outerSize = moduleSize * 7;
      const cx = qrX + pos.c * moduleSize + outerSize / 2;
      const cy = qrY + pos.r * moduleSize + outerSize / 2;

      // Clear the finder area
      const bgFill = config.transparentBg ? 'rgba(0,0,0,0)' : (
        config.bgGradient.enabled
          ? createGradient(ctx, config.bgGradient, cx - outerSize / 2, cy - outerSize / 2, outerSize, outerSize)
          : config.bgColor
      );
      ctx.fillStyle = bgFill as any;
      ctx.fillRect(cx - outerSize / 2, cy - outerSize / 2, outerSize, outerSize);

      // Outer ring
      drawCornerSquare(ctx, cx, cy, outerSize, config.cornerSquareStyle === 'none' ? 'square' : config.cornerSquareStyle, config.cornerSquareColor);

      // Inner dot (3x3 center)
      const innerSize = moduleSize * 3;
      drawCornerDot(ctx, cx, cy, innerSize, config.cornerDotStyle === 'none' ? 'square' : config.cornerDotStyle, config.cornerDotColor);
    }

    // Frame
    drawFrame(ctx, qrX, qrY, config.size, config.frameStyle, config.frameColor, config.frameTextColor, config.frameText);

    // Logo
    if (logoPreview) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const logoSize = config.size * 0.22;
        const lx = qrX + (config.size - logoSize) / 2;
        const ly = qrY + (config.size - logoSize) / 2;
        const lpad = 6;
        ctx.beginPath();
        ctx.arc(lx + logoSize / 2, ly + logoSize / 2, logoSize / 2 + lpad, 0, Math.PI * 2);
        ctx.fillStyle = config.bgColor;
        ctx.fill();
        ctx.strokeStyle = config.patternGradient.enabled ? config.patternGradient.color1 : config.patternColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.arc(lx + logoSize / 2, ly + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, lx, ly, logoSize, logoSize);
        ctx.restore();
      };
      img.src = logoPreview;
    }
  }, [config, logoPreview]);

  useEffect(() => {
    const t = setTimeout(renderQR, 120);
    return () => clearTimeout(t);
  }, [renderQR]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleDownload = (format: 'png' | 'svg') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (format === 'png') {
      const link = document.createElement('a');
      link.download = `${config.label.replace(/\s+/g, '_')}_QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } else {
      QRCode.toString(config.url || 'https://pickleplay.ph', {
        type: 'svg', width: config.size,
        color: { dark: config.patternColor, light: config.bgColor },
        errorCorrectionLevel: config.errorCorrection,
      }).then((svg) => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.download = `${config.label.replace(/\s+/g, '_')}_QR.svg`;
        link.href = URL.createObjectURL(blob);
        link.click();
      });
    }
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
      if (blob) { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); }
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert('Logo must be under 1 MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
      setConfig(p => ({ ...p, logoUrl: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setConfig(p => ({ ...p, logoUrl: '' }));
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleSaveQR = () => {
    setSavedQRs(p => [{ id: `qr_${Date.now()}`, config: { ...config }, createdAt: new Date().toISOString() }, ...p]);
  };

  const handleDeleteSavedQR = (id: string) => setSavedQRs(p => p.filter(q => q.id !== id));
  const handleLoadQR = (saved: SavedQR) => { setConfig(saved.config); setActiveSection('design'); };

  const handleApplyTheme = (t: typeof PRESET_THEMES[0]) => {
    setConfig(p => ({
      ...p,
      patternGradient: { enabled: true, color1: t.c1, color2: t.c2, direction: 'horizontal' },
      patternColor: t.c1,
      bgColor: t.bg,
      cornerSquareColor: t.corner,
      cornerDotColor: t.cornerDot,
      frameColor: t.corner,
    }));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight uppercase">
            <QrCode className="text-emerald-500" /> QR Code Marketing Studio
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Design beautifully branded QR codes with patterns, gradients, frames & your logo.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveSection('design')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'design' ? 'bg-slate-950 text-white shadow-xl' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            <Palette size={14} className="inline mr-2" /> Designer
          </button>
          <button onClick={() => setActiveSection('saved')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'saved' ? 'bg-slate-950 text-white shadow-xl' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            <Eye size={14} className="inline mr-2" /> Saved ({savedQRs.length})
          </button>
        </div>
      </div>

      {activeSection === 'design' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* ════════════ Left: All Controls ════════════ */}
          <div className="xl:col-span-2 space-y-4">

            {/* ── Destination Link ── */}
            <CollapsibleSection
              icon={<Link size={18} className="text-blue-500" />}
              title="Destination Link"
              subtitle="Set the URL that opens when people scan your QR code."
              open={openSections.link} onToggle={() => toggleSection('link')}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">QR Code URL</label>
                  <input type="url" value={config.url}
                    onChange={e => setConfig(p => ({ ...p, url: e.target.value }))}
                    placeholder="https://pickleplay.ph/event/summer-open"
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Label / Campaign Name</label>
                  <input type="text" value={config.label}
                    onChange={e => setConfig(p => ({ ...p, label: e.target.value }))}
                    placeholder="Summer Open 2026 Flyer"
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-900" />
                </div>
              </div>
            </CollapsibleSection>

            {/* ── QR Code Pattern ── */}
            <CollapsibleSection
              icon={<Grid3X3 size={18} className="text-emerald-500" />}
              title="QR Code Pattern"
              subtitle="Choose a pattern for your QR code and select colors."
              open={openSections.pattern} onToggle={() => toggleSection('pattern')}
            >
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Pattern style</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {PATTERN_STYLES.map(ps => (
                      <button key={ps.id} onClick={() => setConfig(p => ({ ...p, patternStyle: ps.id }))}
                        className={`p-4 rounded-2xl border-2 transition-all text-center ${config.patternStyle === ps.id ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                        <PatternPreview style={ps.id} color={config.patternGradient.enabled ? config.patternGradient.color1 : config.patternColor} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-2 block">{ps.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-5">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">Pattern color</h4>
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <span className="text-xs font-bold text-slate-500">Use a gradient pattern color</span>
                      <ToggleSwitch checked={config.patternGradient.enabled}
                        onChange={v => setConfig(p => ({ ...p, patternGradient: { ...p.patternGradient, enabled: v } }))} />
                    </label>
                    {config.patternGradient.enabled && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Gradient style</span>
                        <select value={config.patternGradient.direction}
                          onChange={e => setConfig(p => ({ ...p, patternGradient: { ...p.patternGradient, direction: e.target.value as GradientDirection } }))}
                          className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-emerald-400">
                          <option value="horizontal">Horizontal</option>
                          <option value="vertical">Vertical</option>
                          <option value="diagonal">Diagonal</option>
                          <option value="radial">Radial</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {config.patternGradient.enabled ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <ColorPicker label="Pattern color 1" value={config.patternGradient.color1}
                        onChange={v => setConfig(p => ({ ...p, patternGradient: { ...p.patternGradient, color1: v } }))} />
                      <ColorPicker label="Pattern color 2" value={config.patternGradient.color2}
                        onChange={v => setConfig(p => ({ ...p, patternGradient: { ...p.patternGradient, color2: v } }))} />
                    </div>
                  ) : (
                    <ColorPicker label="Pattern color" value={config.patternColor}
                      onChange={v => setConfig(p => ({ ...p, patternColor: v }))} />
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* ── QR Code Corners ── */}
            <CollapsibleSection
              icon={<CornerDownRight size={18} className="text-indigo-500" />}
              title="QR Code Corners"
              subtitle="Select your QR code's corner style."
              open={openSections.corners} onToggle={() => toggleSection('corners')}
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Frame around corner dots style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CORNER_SQUARE_STYLES.map(cs => (
                        <button key={cs.id} onClick={() => setConfig(p => ({ ...p, cornerSquareStyle: cs.id }))}
                          className={`p-3 rounded-xl border-2 transition-all text-xl ${config.cornerSquareStyle === cs.id ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                          {cs.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Corner dots type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CORNER_DOT_STYLES.map(cd => (
                        <button key={cd.id} onClick={() => setConfig(p => ({ ...p, cornerDotStyle: cd.id }))}
                          className={`p-3 rounded-xl border-2 transition-all text-xl ${config.cornerDotStyle === cd.id ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                          {cd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <ColorPicker label="Frame around corner dots color" value={config.cornerSquareColor}
                    onChange={v => setConfig(p => ({ ...p, cornerSquareColor: v }))} />
                  <ColorPicker label="Corner dots color" value={config.cornerDotColor}
                    onChange={v => setConfig(p => ({ ...p, cornerDotColor: v }))} />
                </div>
              </div>
            </CollapsibleSection>

            {/* ── Background ── */}
            <CollapsibleSection
              icon={<Palette size={18} className="text-orange-500" />}
              title="Pattern Background Color"
              subtitle="Set the background color behind your QR code pattern."
              open={openSections.background} onToggle={() => toggleSection('background')}
            >
              <div className="space-y-5">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <ToggleSwitch checked={config.transparentBg}
                    onChange={v => setConfig(p => ({ ...p, transparentBg: v }))} />
                  <span className="text-xs font-bold text-slate-600">Transparent background</span>
                </label>
                {!config.transparentBg && (
                  <>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <span className="text-xs font-bold text-slate-500">Use a gradient background color</span>
                      <ToggleSwitch checked={config.bgGradient.enabled}
                        onChange={v => setConfig(p => ({ ...p, bgGradient: { ...p.bgGradient, enabled: v } }))} />
                    </label>
                    {config.bgGradient.enabled ? (
                      <div className="space-y-4">
                        <select value={config.bgGradient.direction}
                          onChange={e => setConfig(p => ({ ...p, bgGradient: { ...p.bgGradient, direction: e.target.value as GradientDirection } }))}
                          className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm font-bold appearance-none outline-none">
                          <option value="horizontal">Horizontal</option>
                          <option value="vertical">Vertical</option>
                          <option value="diagonal">Diagonal</option>
                          <option value="radial">Radial</option>
                        </select>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <ColorPicker label="Background color 1" value={config.bgGradient.color1}
                            onChange={v => setConfig(p => ({ ...p, bgGradient: { ...p.bgGradient, color1: v } }))} />
                          <ColorPicker label="Background color 2" value={config.bgGradient.color2}
                            onChange={v => setConfig(p => ({ ...p, bgGradient: { ...p.bgGradient, color2: v } }))} />
                        </div>
                      </div>
                    ) : (
                      <ColorPicker label="Background color" value={config.bgColor}
                        onChange={v => setConfig(p => ({ ...p, bgColor: v }))} />
                    )}
                  </>
                )}
              </div>
            </CollapsibleSection>

            {/* ── Add Logo ── */}
            <CollapsibleSection
              icon={<ImageIcon size={18} className="text-pink-500" />}
              title="Add Logo"
              subtitle="Make your QR code unique by adding your logo or an image."
              open={openSections.logo} onToggle={() => toggleSection('logo')}
            >
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-slate-400">Upload your logo (Maximum size: 1 MB)</p>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload-v2" />
                <div className="flex items-center gap-5">
                  {logoPreview ? (
                    <div className="relative group">
                      <img src={logoPreview} alt="Logo" className="w-20 h-20 rounded-2xl object-cover border-2 border-dashed border-emerald-300 shadow-sm" />
                      <button onClick={() => logoInputRef.current?.click()}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs shadow-lg hover:bg-slate-700 transition-all">
                        ✏️
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => logoInputRef.current?.click()}
                      className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 hover:border-emerald-300 hover:text-emerald-400 transition-all">
                      <Plus size={24} />
                    </button>
                  )}
                  {logoPreview && (
                    <button onClick={handleRemoveLogo}
                      className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-100">
                      Delete
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  For best results use a square PNG/SVG with transparent background. Error correction is set to High (H) for scannability.
                </p>
              </div>
            </CollapsibleSection>

            {/* ── Frame ── */}
            <CollapsibleSection
              icon={<span className="text-lg">🖼️</span>}
              title="Frame"
              subtitle="Frames make your QR Code stand out from the crowd, inspiring more scans."
              open={openSections.frame} onToggle={() => toggleSection('frame')}
            >
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Frame style</label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {FRAME_STYLES.map(fs => (
                      <button key={fs.id} onClick={() => setConfig(p => ({ ...p, frameStyle: fs.id }))}
                        className={`p-3 rounded-2xl border-2 transition-all text-center ${config.frameStyle === fs.id ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                        <FramePreviewIcon style={fs.id} color={config.frameColor} />
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 mt-1 block">{fs.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {config.frameStyle !== 'none' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Frame Text</label>
                      <input type="text" value={config.frameText}
                        onChange={e => setConfig(p => ({ ...p, frameText: e.target.value }))}
                        placeholder="Scan Me !"
                        className="w-full bg-slate-50 border border-slate-100 rounded-3xl py-4 px-6 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-900" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <ColorPicker label="Frame color" value={config.frameColor}
                        onChange={v => setConfig(p => ({ ...p, frameColor: v }))} />
                      <ColorPicker label="Frame text color" value={config.frameTextColor}
                        onChange={v => setConfig(p => ({ ...p, frameTextColor: v }))} />
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>

            {/* ── Quick Themes ── */}
            <CollapsibleSection
              icon={<Sparkles size={18} className="text-amber-500" />}
              title="Quick Themes"
              subtitle="Apply a complete color theme in one click."
              open={openSections.themes} onToggle={() => toggleSection('themes')}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESET_THEMES.map(theme => (
                  <button key={theme.name} onClick={() => handleApplyTheme(theme)}
                    className="group p-4 rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-lg transition-all text-left">
                    <div className="flex gap-1.5 mb-3">
                      <div className="w-7 h-7 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: theme.c1 }} />
                      <div className="w-7 h-7 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: theme.c2 }} />
                      <div className="w-7 h-7 rounded-full border-2 border-slate-200 shadow-sm" style={{ backgroundColor: theme.bg }} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 transition-colors">{theme.name}</span>
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── Size & Error Correction ── */}
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Size: {config.size}px</label>
                  <input type="range" min={150} max={600} step={10} value={config.size}
                    onChange={e => setConfig(p => ({ ...p, size: parseInt(e.target.value) }))}
                    className="w-full accent-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Error Correction</label>
                  <select value={config.errorCorrection}
                    onChange={e => setConfig(p => ({ ...p, errorCorrection: e.target.value as QRConfig['errorCorrection'] }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-sm appearance-none">
                    <option value="L">Low (7%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="Q">Quartile (25%)</option>
                    <option value="H">High (30%) — Best for logos</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ════════════ Right: Live Preview & Actions ════════════ */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm sticky top-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <Eye size={14} /> Live Preview
              </h3>
              <div className="flex justify-center mb-6">
                <div className="rounded-3xl overflow-hidden shadow-2xl bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] p-1">
                  <canvas ref={canvasRef} className="max-w-full h-auto" />
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Scan Destination</p>
                <p className="text-sm font-bold text-emerald-600 truncate">{config.url || '—'}</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleDownload('png')}
                    className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2">
                    <Download size={14} /> PNG
                  </button>
                  <button onClick={() => handleDownload('svg')}
                    className="py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2">
                    <Download size={14} /> SVG
                  </button>
                </div>
                <button onClick={handleCopyImage}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2">
                  {copied ? <><Check size={14} className="text-emerald-500" /> Copied!</> : <><Copy size={14} /> Copy to Clipboard</>}
                </button>
                <button onClick={handleSaveQR}
                  className="w-full py-4 border-2 border-dashed border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2">
                  <Plus size={14} /> Save This QR Code
                </button>
                <button onClick={() => { setConfig(DEFAULT_CONFIG); handleRemoveLogo(); }}
                  className="w-full py-3 text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  <RefreshCw size={12} /> Reset to Default
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ Saved Gallery ════════════ */}
      {activeSection === 'saved' && (
        <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-slate-100">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Saved QR Codes</h3>
            <p className="text-slate-500 font-medium text-sm mt-1">Previously created QR codes. Click to reload and edit.</p>
          </div>
          {savedQRs.length === 0 ? (
            <div className="px-8 py-20 text-center">
              <QrCode size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No saved QR codes yet.</p>
              <p className="text-slate-300 text-xs mt-1">Create and save your first one from the Designer tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-8">
              {savedQRs.map(saved => (
                <div key={saved.id} className="bg-slate-50 rounded-[32px] border border-slate-100 p-6 hover:shadow-xl hover:border-slate-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{saved.config.label || 'Untitled'}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-1 truncate max-w-[200px]">{saved.config.url}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleLoadQR(saved)}
                        className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all" title="Load & Edit">
                        <Share2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteSavedQR(saved.id)}
                        className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-all" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex gap-1">
                      <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: saved.config.patternGradient.enabled ? saved.config.patternGradient.color1 : saved.config.patternColor }} />
                      <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: saved.config.patternGradient.enabled ? saved.config.patternGradient.color2 : saved.config.cornerSquareColor }} />
                      <div className="w-5 h-5 rounded-full border-2 border-slate-200 shadow-sm" style={{ backgroundColor: saved.config.bgColor }} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {saved.config.patternStyle} · {saved.config.frameStyle !== 'none' ? saved.config.frameStyle : 'no frame'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-medium">{new Date(saved.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => handleLoadQR(saved)}
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-emerald-100 transition-all">
                      Load & Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const CollapsibleSection: React.FC<{
  icon: React.ReactNode; title: string; subtitle: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}> = ({ icon, title, subtitle, open, onToggle, children }) => (
  <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden transition-all">
    <button onClick={onToggle} className="w-full p-8 flex items-center gap-5 text-left hover:bg-slate-50/50 transition-colors">
      <div className="p-3 bg-slate-50 rounded-2xl shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{title}</h3>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{subtitle}</p>
      </div>
      <div className="shrink-0 text-slate-300">
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
    </button>
    {open && <div className="px-8 pb-8 pt-0 animate-slide-up">{children}</div>}
  </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button onClick={() => onChange(!checked)}
    className={`w-12 h-7 rounded-full p-1 transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}>
    <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const ColorPicker: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-2">
      <div className="relative shrink-0">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-xl cursor-pointer appearance-none overflow-hidden border-0" style={{ padding: 0 }} />
      </div>
      <input type="text" value={value.toUpperCase()} onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none font-mono font-bold text-sm uppercase text-slate-700"
        maxLength={7} />
    </div>
  </div>
);

const PatternPreview: React.FC<{ style: PatternStyle; color: string }> = ({ style, color }) => {
  const s = 8;
  const grid = [
    [1, 1, 0, 1],
    [0, 1, 1, 0],
    [1, 0, 1, 1],
    [1, 1, 0, 1],
  ];
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {grid.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          const x = 2 + c * (s + 2);
          const y = 2 + r * (s + 2);
          switch (style) {
            case 'dots':
            case 'extra-rounded':
              return <circle key={`${r}-${c}`} cx={x + s / 2} cy={y + s / 2} r={s * 0.38} fill={color} />;
            case 'rounded':
            case 'classy-rounded':
              return <rect key={`${r}-${c}`} x={x} y={y} width={s} height={s} rx={s * 0.35} fill={color} />;
            case 'classy':
              return <polygon key={`${r}-${c}`} points={`${x},${y} ${x + s},${y} ${x + s},${y + s} ${x},${y + s * 0.7}`} fill={color} />;
            default:
              return <rect key={`${r}-${c}`} x={x} y={y} width={s} height={s} fill={color} />;
          }
        })
      )}
    </svg>
  );
};

const FramePreviewIcon: React.FC<{ style: FrameStyle; color: string }> = ({ style, color }) => {
  if (style === 'none') {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="14" fill="none" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="8" y1="8" x2="28" y2="28" stroke="#cbd5e1" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width="36" height="44" viewBox="0 0 36 44">
      <rect x="6" y="4" width="24" height="24" rx="2" fill="#e2e8f0" />
      {[8, 14, 20].map(x => [6, 12, 18].map(y => (
        <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx={style === 'circle-badge' ? 2 : 0} fill="#94a3b8" />
      )))}
      {style === 'simple' && <rect x="4" y="30" width="28" height="10" rx="1" fill={color} />}
      {style === 'rounded' && <rect x="4" y="30" width="28" height="10" rx="5" fill={color} />}
      {style === 'banner-bottom' && <rect x="2" y="30" width="32" height="10" rx="5" fill={color} />}
      {style === 'badge-top' && <><rect x="8" y="0" width="20" height="8" rx="4" fill={color} /><rect x="4" y="30" width="28" height="10" rx="3" fill={color} /></>}
      {style === 'ticket' && <><rect x="4" y="2" width="28" height="38" rx="4" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" /><text x="18" y="40" textAnchor="middle" fontSize="5" fill={color} fontWeight="bold">scan</text></>}
      {style === 'circle-badge' && <circle cx="18" cy="16" r="16" fill="none" stroke={color} strokeWidth="2" />}
      {style === 'bold-bottom' && <><rect x="2" y="2" width="32" height="40" rx="4" fill="none" stroke={color} strokeWidth="2.5" /><rect x="2" y="30" width="32" height="12" rx="3" fill={color} /></>}
      {style !== 'none' && style !== 'ticket' && style !== 'circle-badge' && (
        <text x="18" y="37" textAnchor="middle" fontSize="4.5" fill="white" fontWeight="bold">scan</text>
      )}
    </svg>
  );
};

export default QRCodeGenerator;
