// ═══════════════════════════════════════════════════════════════
// Admin ID Training Panel — Train TF.js Model for ID Template Detection
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain,
  Upload,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image,
  X,
  BarChart3,
  Shield,
  Camera,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ID_CLASSES,
  ID_CLASS_LABELS,
  type IDClass,
  type TrainingImage,
  type TrainingProgress,
  trainClassifier,
  initClassifier,
  isClassifierTrained,
  deleteClassifier,
  getModelInfo,
  classifyID,
} from '../../services/idClassifier.ts';
import { supabase } from '../../services/supabase';

const AdminIDTrainingPanel: React.FC = () => {
  // ─── State ─────────────────────────────────────────────────
  const [trainingImages, setTrainingImages] = useState<Record<IDClass, File[]>>(
    () => Object.fromEntries(ID_CLASSES.filter(c => c !== 'unknown').map((c) => [c, []])) as Record<IDClass, File[]>
  );
  const [previews, setPreviews] = useState<Record<IDClass, string[]>>(
    () => Object.fromEntries(ID_CLASSES.filter(c => c !== 'unknown').map((c) => [c, []])) as Record<IDClass, string[]>
  );
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [modelInfo, setModelInfo] = useState<{ exists: boolean; dateSaved?: Date; modelSizeBytes?: number } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedClass, setExpandedClass] = useState<IDClass | null>(null);
  const [epochs, setEpochs] = useState(20);
  const [isInitializing, setIsInitializing] = useState(true);

  // Test prediction
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testPreview, setTestPreview] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // ─── Init on mount ─────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        await initClassifier();
        const info = await getModelInfo();
        setModelInfo(info);
      } catch (err) {
        console.error('Classifier init error:', err);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  // ─── Image Upload Handler ─────────────────────────────────
  const handleUploadImages = useCallback((idClass: IDClass, files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (newFiles.length === 0) return;

    setTrainingImages((prev) => ({
      ...prev,
      [idClass]: [...prev[idClass], ...newFiles],
    }));

    // Generate previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => ({
          ...prev,
          [idClass]: [...prev[idClass], reader.result as string],
        }));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeImage = useCallback((idClass: IDClass, index: number) => {
    setTrainingImages((prev) => ({
      ...prev,
      [idClass]: prev[idClass].filter((_, i) => i !== index),
    }));
    setPreviews((prev) => ({
      ...prev,
      [idClass]: prev[idClass].filter((_, i) => i !== index),
    }));
  }, []);

  // ─── Count total training images ──────────────────────────
  const totalImages = (Object.values(trainingImages) as File[][]).reduce((sum, arr) => sum + arr.length, 0);
  const classesWithImages = (Object.entries(trainingImages) as [IDClass, File[]][]).filter(([_, arr]) => arr.length > 0).length;

  // ─── Train Model ───────────────────────────────────────────
  const handleTrain = async () => {
    if (totalImages < 2) {
      setError('Please upload at least 2 training images.');
      return;
    }
    if (classesWithImages < 1) {
      setError('Please upload images for at least 1 ID type.');
      return;
    }

    setError('');
    setSuccess('');
    setIsTraining(true);
    setProgress(null);

    try {
      // Build training data
      const images: TrainingImage[] = [];
      for (const [idClass, files] of Object.entries(trainingImages) as [IDClass, File[]][]) {
        for (const file of files) {
          images.push({ file, label: idClass as IDClass });
        }
      }

      const result = await trainClassifier(images, epochs, (p) => setProgress(p));

      // Upload training images to Supabase for persistence (cross-device)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Clear old training data first
          await supabase.from('id_training_datasets').delete().neq('id', '00000000-0000-0000-0000-000000000000');

          for (const img of images) {
            const fileName = `${img.label}/${Date.now()}_${Math.random().toString(36).slice(2)}_${img.file.name}`;
            const { data: uploadData } = await supabase.storage
              .from('id-training-images')
              .upload(fileName, img.file, { upsert: true });

            if (uploadData?.path) {
              const { data: urlData } = supabase.storage
                .from('id-training-images')
                .getPublicUrl(uploadData.path);

              await supabase.from('id_training_datasets').insert({
                admin_id: session.user.id,
                id_class: img.label,
                image_url: urlData.publicUrl || uploadData.path,
                file_name: img.file.name,
              });
            }
          }
          console.log('[AdminIDTraining] Training images uploaded to Supabase');
        }
      } catch (uploadErr) {
        console.warn('[AdminIDTraining] Failed to upload training images to Supabase (model still works locally):', uploadErr);
      }

      setSuccess(`✅ Training complete! Accuracy: ${(result.finalAccuracy * 100).toFixed(1)}% — embeddings saved locally + images backed up to Supabase`);

      // Refresh model info
      const info = await getModelInfo();
      setModelInfo(info);
    } catch (err: any) {
      setError(`Training failed: ${err.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  // ─── Delete Model ──────────────────────────────────────────
  const handleDeleteModel = async () => {
    if (!window.confirm('Are you sure you want to delete the trained model? Users will not get ID template verification until you retrain.')) return;
    await deleteClassifier();

    // Also clear Supabase training data
    try {
      await supabase.from('id_training_datasets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Clear training images from bucket
      const { data: files } = await supabase.storage.from('id-training-images').list('', { limit: 1000 });
      if (files && files.length > 0) {
        const paths = files.map(f => f.name);
        await supabase.storage.from('id-training-images').remove(paths);
      }
    } catch (err) {
      console.warn('[AdminIDTraining] Failed to clean up Supabase training data:', err);
    }

    setModelInfo({ exists: false });
    setSuccess('Model deleted and Supabase training data cleared.');
  };

  // ─── Test Prediction ──────────────────────────────────────
  const handleTest = async () => {
    if (!testFile) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      await initClassifier();
      const result = await classifyID(testFile);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ message: `Error: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  // ─── ID class that are trainable (excluding 'unknown') ────
  const trainableClasses = ID_CLASSES.filter((c) => c !== 'unknown') as IDClass[];

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-blue-600 mr-3" />
        <span className="text-sm font-bold text-slate-500">Loading TensorFlow.js...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm p-8 md:p-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-violet-200">
              <Brain size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">ID Template Training</h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">Train TensorFlow.js to detect Philippine Government ID types</p>
            </div>
          </div>
        </div>

        {/* Model Status Card */}
        <div className={`rounded-3xl p-5 border-2 ${modelInfo?.exists ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {modelInfo?.exists ? (
                <CheckCircle2 size={20} className="text-emerald-600" />
              ) : (
                <AlertCircle size={20} className="text-amber-600" />
              )}
              <div>
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {modelInfo?.exists ? 'Model Trained & Active' : 'No Model Trained Yet'}
                </p>
                {modelInfo?.exists && modelInfo.dateSaved && (
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                    Last trained: {modelInfo.dateSaved.toLocaleDateString()} {modelInfo.dateSaved.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
            {modelInfo?.exists && (
              <button
                type="button"
                onClick={handleDeleteModel}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-black rounded-xl text-[9px] uppercase tracking-wider hover:bg-red-600 transition-all"
              >
                <Trash2 size={12} /> Delete Model
              </button>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-5 bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-500 font-bold space-y-1">
              <p><strong className="text-slate-700">How it works:</strong> Upload sample images for any ID type you want to detect. Even 1 ID type works! The AI extracts visual features using MobileNet V2 (transfer learning) and learns to recognize each ID template.</p>
              <p>When a user uploads an ID, the model verifies it matches the template of the ID type they selected. Mismatches trigger a warning.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Training Data Upload */}
      <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm p-8 md:p-10">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-1 flex items-center gap-2">
          <Upload size={20} className="text-blue-600" />
          Upload Training Images
        </h3>
        <p className="text-[10px] text-slate-400 font-bold mb-6">Upload clear photos of real Philippine Government IDs for each type. More images = better detection.</p>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-6 bg-slate-50 rounded-2xl p-3 border border-slate-100">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100">
            <Image size={12} className="text-blue-600" />
            <span className="text-[10px] font-black text-slate-900">{totalImages} Images</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100">
            <Shield size={12} className="text-emerald-600" />
            <span className="text-[10px] font-black text-slate-900">{classesWithImages}/{trainableClasses.length} ID Types</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Epochs:</label>
            <input
              type="number"
              min={5}
              max={100}
              value={epochs}
              onChange={(e) => setEpochs(parseInt(e.target.value) || 20)}
              className="w-16 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-center focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* ID Class Cards */}
        <div className="space-y-3">
          {trainableClasses.map((idClass) => {
            const images = trainingImages[idClass] || [];
            const classPrews = previews[idClass] || [];
            const isExpanded = expandedClass === idClass;

            return (
              <div
                key={idClass}
                className={`rounded-3xl border-2 transition-all ${
                  isExpanded ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                {/* Class Header */}
                <button
                  type="button"
                  onClick={() => setExpandedClass(isExpanded ? null : idClass)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      images.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Shield size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{ID_CLASS_LABELS[idClass]}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{images.length} images uploaded</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {images.length >= 10 && (
                      <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">GOOD</span>
                    )}
                    {images.length > 0 && images.length < 10 && (
                      <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">NEED MORE</span>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded Upload Area */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Image Grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {classPrews.map((preview, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square">
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idClass, idx)}
                            className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}

                      {/* Upload button */}
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all aspect-square">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            handleUploadImages(idClass, e.target.files);
                            e.target.value = '';
                          }}
                        />
                        <Upload size={14} className="text-slate-300" />
                        <p className="text-[7px] font-bold text-slate-400 mt-0.5">ADD</p>
                      </label>
                    </div>

                    <p className="text-[9px] text-slate-400 font-bold">
                      💡 Upload 2+ clear images of this ID for training. More images (10-20) = better detection. Different angles and lighting help.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Training Controls */}
      <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm p-8 md:p-10">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
          <Zap size={20} className="text-amber-500" />
          Train Model
        </h3>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold mb-4">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-xs font-bold mb-4">
            <CheckCircle2 size={14} /> {success}
          </div>
        )}

        {/* Progress Bar */}
        {progress && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black text-slate-600 uppercase">
              <span>{progress.message}</span>
              {progress.phase === 'training' && (
                <span>{progress.epoch}/{progress.totalEpochs}</span>
              )}
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress.phase === 'done' ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{
                  width: progress.phase === 'extracting' ? '10%'
                    : progress.phase === 'training' ? `${10 + (progress.epoch / progress.totalEpochs) * 80}%`
                    : progress.phase === 'saving' ? '95%'
                    : '100%',
                }}
              />
            </div>
            {progress.phase === 'training' && (
              <div className="flex gap-6 text-[10px] font-bold text-slate-400">
                <span>Loss: <strong className="text-slate-700">{progress.loss}</strong></span>
                <span>Accuracy: <strong className="text-slate-700">{(progress.accuracy * 100).toFixed(1)}%</strong></span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isTraining || totalImages < 2 || classesWithImages < 1}
            onClick={handleTrain}
            className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-violet-200 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isTraining ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Training...
              </>
            ) : (
              <>
                <Play size={16} /> Start Training ({totalImages} images, {epochs} epochs)
              </>
            )}
          </button>
        </div>

        {totalImages < 2 && (
          <p className="text-[10px] text-amber-600 font-bold mt-3 flex items-center gap-1">
            <AlertCircle size={12} /> Upload at least 2 images for 1 or more ID types to start training
          </p>
        )}
      </div>

      {/* Test Prediction */}
      {modelInfo?.exists && (
        <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm p-8 md:p-10">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" />
            Test Prediction
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mb-4">Upload an ID image to test the trained model's detection accuracy.</p>

          <div className="flex gap-4">
            {/* Upload test image */}
            <div className="flex-1">
              {testPreview ? (
                <div className="relative group rounded-2xl overflow-hidden border-2 border-blue-200 bg-blue-50">
                  <img src={testPreview} alt="Test" className="w-full h-48 object-contain bg-white" />
                  <button
                    type="button"
                    onClick={() => { setTestFile(null); setTestPreview(''); setTestResult(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.type.startsWith('image/')) {
                        setTestFile(f);
                        const reader = new FileReader();
                        reader.onloadend = () => setTestPreview(reader.result as string);
                        reader.readAsDataURL(f);
                        setTestResult(null);
                      }
                      e.target.value = '';
                    }}
                  />
                  <Upload size={20} className="text-slate-300 mb-1" />
                  <p className="text-[10px] font-black text-slate-400 uppercase">Upload Test Image</p>
                </label>
              )}
            </div>

            {/* Results */}
            <div className="flex-1 flex flex-col justify-center">
              {testResult && (
                <div className={`rounded-2xl p-4 border ${
                  testResult.confidence >= 70 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">
                    {testResult.predictedClass !== 'unknown' ? ID_CLASS_LABELS[testResult.predictedClass as IDClass] : 'Unknown'}
                  </p>
                  <p className="text-xs font-bold text-slate-600 mb-2">
                    Confidence: {testResult.confidence}%
                  </p>
                  <p className="text-[10px] font-bold text-slate-500">{testResult.message}</p>

                  {/* Score breakdown */}
                  {testResult.allScores && (
                    <div className="mt-3 space-y-1">
                      {Object.entries(testResult.allScores)
                        .filter(([key]) => key !== 'unknown')
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([key, score]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-[8px] font-bold text-slate-500 w-28 truncate">{ID_CLASS_LABELS[key as IDClass]}</span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(score as number) * 100}%` }}
                              />
                            </div>
                            <span className="text-[8px] font-bold text-slate-600 w-10 text-right">{((score as number) * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={!testFile || isTesting}
                onClick={handleTest}
                className="mt-3 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isTesting ? (
                  <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
                ) : (
                  <><BarChart3 size={14} /> Run Prediction</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminIDTrainingPanel;
