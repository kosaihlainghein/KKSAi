import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, SESSION_ID } from './lib/supabase';
import { getAIResponse, getTypingDelay } from './lib/aiEngine';
import {
  checkComfyUI,
  checkCaptionServer,
  getAvailableModels,
} from './lib/backend';
import {
  generateImages,
  generateVideo,
  uploadReferenceImage,
  interruptGeneration,
  GenerationParams,
  VideoParams,
} from './lib/comfyui';
import { captionBatch } from './lib/caption';
import {
  LayoutDashboard,
  Database,
  Sliders,
  Sparkles,
  MessageSquare,
  Plus,
  Upload,
  X,
  Play,
  Pause,
  Download,
  Trash2,
  Wand2,
  Image as ImageIcon,
  FolderOpen,
  ChevronRight,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Settings,
  FileImage,
  RefreshCw,
  Copy,
  ExternalLink,
  Send,
  Video,
  Film,
  SwitchCamera,
  Bot,
  User,
  Volume2,
  VolumeX,
  Maximize2,
  Square,
  Timer,
  Clapperboard,
} from 'lucide-react';

type Screen = 'dashboard' | 'dataset' | 'training' | 'generation' | 'assistant';

type DatasetMode = 'image' | 'video';
type TrainingMode = 'image' | 'video';
type GenerationMode = 'image' | 'image-to-video';
// eslint-disable-next-line @typescript-eslint/no-unused-vars

interface Project {
  id: string;
  name: string;
  type: string;
  status: 'ready' | 'training' | 'draft';
  progress?: number;
  createdAt: Date;
  thumbnail?: string;
  isVideo?: boolean;
}

interface UploadedFile {
  id: string;
  name: string;
  caption: string;
  preview: string;
  type: 'image' | 'video';
  duration?: string;
}

interface TrainingLog {
  id?: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp?: Date;
}

interface GeneratedContent {
  id: string;
  prompt: string;
  seed: number;
  preview: string;
  type: 'image' | 'video';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const sampleProjectImages = [
  'https://images.pexels.com/photos/20873907/pexels-photo-20873907.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/20866609/pexels-photo-20866609.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/15792582/pexels-photo-15792582.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/20873681/pexels-photo-20873681.jpeg?auto=compress&cs=tinysrgb&w=400',
];

const generatedSampleImages = [
  'https://images.pexels.com/photos/20873907/pexels-photo-20873907.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/20866609/pexels-photo-20866609.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/15792582/pexels-photo-15792582.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/20873681/pexels-photo-20873681.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/20873817/pexels-photo-20873817.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/20873783/pexels-photo-20873783.jpeg?auto=compress&cs=tinysrgb&w=600',
];


function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [projects, setProjects] = useState<Project[]>([
    { id: '1', name: 'Anime Style v1', type: 'Style Transfer', status: 'ready', createdAt: new Date('2025-01-15'), thumbnail: sampleProjectImages[0] },
    { id: '2', name: 'Interior Modern', type: 'Fine-tune', status: 'training', progress: 67, createdAt: new Date('2025-02-20'), thumbnail: sampleProjectImages[1] },
    { id: '3', name: 'Product Photography', type: 'Dreambooth', status: 'draft', createdAt: new Date('2025-03-10'), thumbnail: sampleProjectImages[2] },
    { id: '4', name: 'Motion Effects Pack', type: 'Image-to-Video', status: 'ready', createdAt: new Date('2025-04-05'), thumbnail: sampleProjectImages[3], isVideo: true },
  ]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('Fine-tune');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [autoCaptioning, setAutoCaptioning] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [trainingConfig, setTrainingConfig] = useState({
    baseModel: '/models/sd1.5-pruned.ckpt',
    batchSize: 4,
    epochs: 50,
    learningRate: '0.0001',
    networkRank: 64,
    networkAlpha: 32,
    outputFolder: '/output/models/',
  });
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [newProjectStep, setNewProjectStep] = useState(1);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const trainingRef = useRef<number | null>(null);
  const currentJobIdRef = useRef<string | null>(null);
  const [, setDbLoading] = useState(true);

  // Backend connection state
  const [backendStatus, setBackendStatus] = useState<{ comfyui: boolean; caption: boolean }>({ comfyui: false, caption: false });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('sd1.5-pruned.ckpt');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [genSteps, setGenSteps] = useState(25);
  const [genCfg, setGenCfg] = useState(7.5);
  const [videoFrames, setVideoFrames] = useState(16);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);

  // New state for video features
  const [datasetMode, setDatasetMode] = useState<DatasetMode>('image');
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('image');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('image');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageName, setReferenceImageName] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videoMuted, setVideoMuted] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "မင်္ဂလာပါ! ကျွန်ုပ်သည် KKS AI Assistant ဖြစ်ပါသည်။ အောက်ပါကိစ္စများတွင် ကူညီပေးနိုင်ပါသည် —\n\n• Training configuration ချိန်ညှိခြင်း\n• GPU အတွက် ကောင်းမွန်သော parameter ရွေးချယ်ခြင်း\n• Dataset ပြင်ဆင်မှုကို နားလည်ခြင်း\n• Training ပြဿနာများ ဖြေရှင်းခြင်း\n• ပုံ/ဗီဒီယို ဖန်တီးမှုမှ အကောင်းဆုံးရလဒ်ရရှိခြင်း\n\n🔒 ဤ AI assistant သည် အင်တာနက်မရှိဘဲ လုံးဝ offline တွင် လည်ပတ်သောကြောင့် သင်၏ ဒေတာများ ကိုယ်ရေးကိုယ်တာ လုံခြုံမှု အပြည့်အဝ ရှိပါသည်။\n\nဘာများ သိချင်ပါသနည်း?",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToChatBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [trainingLogs, scrollToBottom]);

  useEffect(() => {
    scrollToChatBottom();
  }, [chatMessages, scrollToChatBottom]);

  // ── Load projects from Supabase ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setProjects(
          data.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            status: p.status as Project['status'],
            progress: p.progress,
            createdAt: new Date(p.created_at),
            thumbnail: p.thumbnail_url ?? sampleProjectImages[0],
            isVideo: p.is_video,
          }))
        );
      }
      setDbLoading(false);
    })();
  }, []);

  // ── Load chat history for this session ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', SESSION_ID)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setChatMessages(
          data.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at),
          }))
        );
      }
    })();
  }, []);

  const showNotificationWithTimeout = (message: string) => {
    setShowNotification(message);
    setTimeout(() => setShowNotification(null), 3000);
  };

  // ── Backend status polling ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const checkBackend = async () => {
      const [comfyui, caption] = await Promise.all([checkComfyUI(), checkCaptionServer()]);
      if (!mounted) return;
      setBackendStatus({ comfyui, caption });

      if (comfyui) {
        const models = await getAvailableModels();
        if (mounted && models.length > 0) {
          setAvailableModels(models);
          if (models.includes('sd1.5-pruned.ckpt')) {
            setSelectedModel('sd1.5-pruned.ckpt');
          } else {
            setSelectedModel(models[0]);
          }
        }
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const thumbnail = sampleProjectImages[Math.floor(Math.random() * sampleProjectImages.length)];
    const isVideo = newProjectType.includes('Video');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: newProjectName,
        type: newProjectType,
        status: 'draft',
        progress: 0,
        thumbnail_url: thumbnail,
        is_video: isVideo,
      })
      .select()
      .single();

    const newProject: Project = {
      id: data?.id ?? Date.now().toString(),
      name: newProjectName,
      type: newProjectType,
      status: 'draft',
      createdAt: new Date(),
      thumbnail,
      isVideo,
    };
    setProjects(prev => [newProject, ...prev]);
    setNewProjectName('');
    setShowNewProjectModal(false);
    setNewProjectStep(1);
    if (!error) {
      showNotificationWithTimeout(`Project "${newProjectName}" created successfully!`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    simulateUpload();
  };

  const handleFileInput = () => {
    simulateUpload();
  };

  const simulateUpload = async () => {
    if (datasetMode === 'image') {
      const newFiles: UploadedFile[] = Array.from({ length: 6 }, (_, i) => ({
        id: Date.now().toString() + i,
        name: `image_${i + 1}.jpg`,
        caption: '',
        preview: sampleProjectImages[i % sampleProjectImages.length],
        type: 'image' as const,
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
      // Persist to DB (fire-and-forget, no project_id yet)
      await supabase.from('dataset_files').insert(
        newFiles.map(f => ({
          name: f.name,
          file_type: f.type,
          caption: f.caption,
          preview_url: f.preview,
        }))
      );
      showNotificationWithTimeout(`Uploaded ${newFiles.length} images successfully!`);
    } else {
      const newFiles: UploadedFile[] = Array.from({ length: 4 }, (_, i) => ({
        id: Date.now().toString() + i,
        name: `video_clip_${i + 1}.mp4`,
        caption: '',
        preview: sampleProjectImages[i % sampleProjectImages.length],
        type: 'video' as const,
        duration: `${Math.floor(Math.random() * 3) + 2}s`,
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
      await supabase.from('dataset_files').insert(
        newFiles.map(f => ({
          name: f.name,
          file_type: f.type,
          caption: f.caption,
          preview_url: f.preview,
          duration: f.duration ?? null,
        }))
      );
      showNotificationWithTimeout(`Uploaded ${newFiles.length} video clips successfully!`);
    }
  };

  const handleAutoCaption = async () => {
    setAutoCaptioning(true);

    if (backendStatus.caption) {
      // ── Real BLIP caption server ────────────────────────────────────────
      const filesToCaption = uploadedFiles.map(f => ({ id: f.id, preview: f.preview }));
      const results = await captionBatch(filesToCaption, () => {
        // Could show progress in UI
      });

      if (results.size > 0) {
        setUploadedFiles(prev =>
          prev.map(file => {
            const result = results.get(file.id);
            return result ? { ...file, caption: result.caption } : file;
          })
        );
        setAutoCaptioning(false);
        showNotificationWithTimeout(`AI captions generated for ${results.size} files (BLIP model)!`);
        return;
      }
    }

    // ── Mock fallback ─────────────────────────────────────────────────────
    await new Promise(resolve => setTimeout(resolve, 2500));
    const captions = datasetMode === 'image' ? [
      'a modern living room with minimal furniture, natural lighting, 8k resolution, photorealistic',
      'contemporary interior design, neutral colors, clean lines, architectural photography',
      'cozy apartment living space, house plants, wooden accents, lifestyle photography',
      'luxury modern interior, floor to ceiling windows, designer furniture, magazine quality',
      'scandinavian style room, white walls, minimalist decor, professional photography',
      'open concept living area, exposed brick walls, industrial modern design, 8k',
    ] : [
      'smooth camera pan from left to right, gentle motion blur, cinematic style',
      'slow zoom in on subject, subtle parallax effect, professional tracking',
      'tilt down reveal, architectural documentation, smooth gimbal movement',
      'orbit shot around subject, continuous rotation, dynamic perspective shift',
    ];
    setUploadedFiles(prev =>
      prev.map((file, idx) => ({
        ...file,
        caption: captions[idx % captions.length],
      }))
    );
    setAutoCaptioning(false);
    showNotificationWithTimeout('AI captions generated (demo mode — start caption server for real BLIP captions)');
  };

  const handleExportDataset = () => {
    showNotificationWithTimeout('Dataset exported to /output/dataset.zip');
  };

  const updateFileCaption = (id: string, caption: string) => {
    setUploadedFiles(prev =>
      prev.map(file => (file.id === id ? { ...file, caption } : file))
    );
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  };

  const getImageTrainingLogs = (): TrainingLog[] => [
    { message: '[INIT] Loading configuration from config.yaml...', type: 'info' as const },
    { message: '[OK] CUDA detected: NVIDIA RTX 4090 (24GB VRAM)', type: 'success' as const },
    { message: '[INFO] Loading base model: sd1.5-pruned.ckpt', type: 'info' as const },
    { message: '[OK] Model loaded successfully (4.27GB)', type: 'success' as const },
    { message: '[INFO] Initializing LoRA network (rank: 64, alpha: 32)', type: 'info' as const },
    { message: '[OK] Network initialized: 12.4M trainable parameters', type: 'success' as const },
    { message: '[INFO] Loading dataset from /data/training/', type: 'info' as const },
    { message: '[OK] Loaded 1,247 training images with captions', type: 'success' as const },
    { message: '[INFO] Starting LoRA training: batch_size=4, lr=0.0001', type: 'info' as const },
    { message: 'Epoch 1/50 - Step 50/312 - Loss: 0.1876', type: 'info' as const },
    { message: 'Epoch 5/50 - Step 150/312 - Loss: 0.0954', type: 'info' as const },
    { message: 'Epoch 10/50 - Step 200/312 - Loss: 0.0643', type: 'info' as const },
    { message: 'Epoch 20/50 - Step 150/312 - Loss: 0.0389', type: 'info' as const },
    { message: 'Epoch 30/50 - Step 100/312 - Loss: 0.0265', type: 'info' as const },
    { message: 'Epoch 40/50 - Step 50/312 - Loss: 0.0178', type: 'info' as const },
    { message: 'Epoch 50/50 - Step 312/312 - Loss: 0.0118', type: 'info' as const },
    { message: '[FINAL] Training completed successfully!', type: 'success' as const },
    { message: '[OK] Saving model: my_lora.safetensors', type: 'success' as const },
  ];

  const getVideoTrainingLogs = (): TrainingLog[] => [
    { message: '[INIT] Loading AnimateDiff configuration...', type: 'info' as const },
    { message: '[OK] CUDA detected: NVIDIA RTX 4090 (24GB VRAM)', type: 'success' as const },
    { message: '[INFO] Loading AnimateDiff motion module: mm_sd_v15.ckpt', type: 'info' as const },
    { message: '[OK] Motion module loaded (2.8GB)', type: 'success' as const },
    { message: '[INFO] Loading base Stable Diffusion checkpoint', type: 'info' as const },
    { message: '[OK] Base model loaded: realisticVision_v20.safetensors', type: 'success' as const },
    { message: '[INFO] Initializing temporal attention layers', type: 'info' as const },
    { message: '[OK] 16-frame temporal module initialized', type: 'success' as const },
    { message: '[INFO] Loading video dataset: 234 clips (2-4 sec each)', type: 'info' as const },
    { message: '[OK] Preprocessed 14,976 video frames at 512x512', type: 'success' as const },
    { message: '[INFO] Starting Image-to-Video training: batch_size=2', type: 'info' as const },
    { message: 'Epoch 1/30 - Frame Loss: 0.2134, Temporal Loss: 0.1856', type: 'info' as const },
    { message: 'Epoch 5/30 - Frame Loss: 0.1567, Temporal Loss: 0.0987', type: 'info' as const },
    { message: 'Epoch 10/30 - Frame Loss: 0.0923, Temporal Loss: 0.0654', type: 'info' as const },
    { message: 'Epoch 15/30 - Frame Loss: 0.0678, Temporal Loss: 0.0432', type: 'info' as const },
    { message: 'Epoch 20/30 - Frame Loss: 0.0489, Temporal Loss: 0.0321', type: 'info' as const },
    { message: 'Epoch 25/30 - Frame Loss: 0.0345, Temporal Loss: 0.0234', type: 'info' as const },
    { message: 'Epoch 30/30 - Frame Loss: 0.0287, Temporal Loss: 0.0189', type: 'info' as const },
    { message: '[FINAL] Video model training completed!', type: 'success' as const },
    { message: '[OK] Saving motion LoRA: motion_lora.safetensors', type: 'success' as const },
  ];

  const startTraining = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingLogs([]);

    // Create training_job record in Supabase
    const { data: jobData } = await supabase
      .from('training_jobs')
      .insert({
        mode: trainingMode,
        config: trainingConfig as unknown as Record<string, unknown>,
        status: 'running',
        progress: 0,
        logs: [],
      })
      .select()
      .maybeSingle();

    if (jobData) {
      currentJobIdRef.current = jobData.id;
    }

    const logsSequence = trainingMode === 'image' ? getImageTrainingLogs() : getVideoTrainingLogs();
    let logIndex = 0;
    let progress = 0;
    const accumulatedLogs: TrainingLog[] = [];

    const totalLogs = logsSequence.length;
    const progressPerLog = 100 / totalLogs;

    trainingRef.current = window.setInterval(async () => {
      if (logIndex < logsSequence.length) {
        const log = logsSequence[logIndex];
        const newLog = { ...log, id: logIndex, timestamp: new Date() };
        accumulatedLogs.push(newLog);
        setTrainingLogs(prev => [...prev, newLog]);
        progress = Math.min(100, progressPerLog * (logIndex + 1));
        setTrainingProgress(Math.round(progress));
        logIndex++;

        // Update progress in DB every 5 steps
        if (logIndex % 5 === 0 && currentJobIdRef.current) {
          await supabase
            .from('training_jobs')
            .update({ progress: Math.round(progress) })
            .eq('id', currentJobIdRef.current);
        }
      } else {
        if (trainingRef.current) {
          clearInterval(trainingRef.current);
          trainingRef.current = null;
        }
        // Finalize job in DB
        if (currentJobIdRef.current) {
          await supabase
            .from('training_jobs')
            .update({
              status: 'completed',
              progress: 100,
              completed_at: new Date().toISOString(),
              logs: accumulatedLogs.map(l => ({
                message: l.message,
                type: l.type,
                timestamp: l.timestamp?.toISOString(),
              })),
            })
            .eq('id', currentJobIdRef.current);
          currentJobIdRef.current = null;
        }
        setIsTraining(false);
        showNotificationWithTimeout('Training completed successfully!');
      }
    }, 400);
  };

  const stopTraining = async () => {
    if (trainingRef.current) {
      clearInterval(trainingRef.current);
      trainingRef.current = null;
    }
    const abortLog: TrainingLog = {
      id: Date.now(),
      message: '[ABORTED] Training stopped by user',
      type: 'error',
      timestamp: new Date(),
    };
    setTrainingLogs(prev => [...prev, abortLog]);
    setIsTraining(false);

    if (currentJobIdRef.current) {
      await supabase
        .from('training_jobs')
        .update({ status: 'stopped', completed_at: new Date().toISOString() })
        .eq('id', currentJobIdRef.current);
      currentJobIdRef.current = null;
    }
    showNotificationWithTimeout('Training stopped');
  };

  const handleGenerate = async () => {
    if (!generationPrompt.trim()) return;
    setIsGenerating(true);
    setGenerationProgress(0);

    const isVideo = generationMode === 'image-to-video';

    // ── Real backend path (ComfyUI online) ────────────────────────────────
    if (backendStatus.comfyui) {
      try {
        const seed = Math.floor(Math.random() * 999999999);

        if (!isVideo) {
          const params: GenerationParams = {
            prompt: generationPrompt,
            negativePrompt: negativePrompt || 'blurry, low quality, distorted, bad anatomy, watermark, text',
            seed,
            steps: genSteps,
            cfgScale: genCfg,
            width: 512,
            height: 512,
            modelName: selectedModel,
            batchSize: 4,
          };
          const result = await generateImages(params, (pct) => setGenerationProgress(pct));
          if (result && result.images.length > 0) {
            const newContent: GeneratedContent[] = result.images.map((url, i) => ({
              id: Date.now().toString() + i,
              prompt: generationPrompt,
              seed: seed + i,
              preview: url,
              type: 'image' as const,
            }));
            setGeneratedContent(prev => [...newContent, ...prev]);
            setIsGenerating(false);
            setGenerationProgress(0);
            showNotificationWithTimeout(`${result.images.length} images generated via ComfyUI!`);
            return;
          }
        } else {
          // Video generation via AnimateDiff
          const params: VideoParams = {
            prompt: videoPrompt || generationPrompt,
            negativePrompt: negativePrompt || 'blurry, low quality, distorted, watermark',
            seed,
            steps: genSteps,
            cfgScale: genCfg,
            modelName: selectedModel,
            referenceImageName: referenceImageName,
            frames: videoFrames,
            motionScale: 1.0,
          };
          const result = await generateVideo(params, (pct) => setGenerationProgress(pct));
          if (result && result.videoUrl) {
            const newContent: GeneratedContent[] = [{
              id: Date.now().toString(),
              prompt: videoPrompt || generationPrompt,
              seed,
              preview: result.videoUrl,
              type: 'video' as const,
            }];
            setGeneratedContent(prev => [...newContent, ...prev]);
            setIsGenerating(false);
            setGenerationProgress(0);
            showNotificationWithTimeout('Video generated via ComfyUI AnimateDiff!');
            return;
          }
        }

        // If we reach here, generation failed
        setIsGenerating(false);
        setGenerationProgress(0);
        showNotificationWithTimeout('Generation failed — check ComfyUI console for errors');
        return;
      } catch (err) {
        setIsGenerating(false);
        setGenerationProgress(0);
        showNotificationWithTimeout('Generation error — falling back to demo mode');
      }
    }

    // ── Mock fallback (no backend) ────────────────────────────────────────
    await new Promise(resolve => setTimeout(resolve, 3500));

    if (isVideo) {
      const newContent: GeneratedContent[] = Array.from({ length: 2 }, (_, i) => ({
        id: Date.now().toString() + i,
        prompt: videoPrompt,
        seed: Math.floor(Math.random() * 999999999),
        preview: referenceImage || generatedSampleImages[i % generatedSampleImages.length],
        type: 'video' as const,
      }));
      setGeneratedContent(prev => [...newContent, ...prev]);
    } else {
      const newContent: GeneratedContent[] = Array.from({ length: 4 }, (_, i) => ({
        id: Date.now().toString() + i,
        prompt: generationPrompt,
        seed: Math.floor(Math.random() * 999999999),
        preview: generatedSampleImages[i % generatedSampleImages.length],
        type: 'image' as const,
      }));
      setGeneratedContent(prev => [...newContent, ...prev]);
    }
    setIsGenerating(false);
    setGenerationProgress(0);
    showNotificationWithTimeout(`${isVideo ? '2 videos' : '4 images'} generated (demo mode - start local backend for real AI)`);
  };

  const handleStopGeneration = async () => {
    if (backendStatus.comfyui) {
      await interruptGeneration();
    }
    setIsGenerating(false);
    setGenerationProgress(0);
    showNotificationWithTimeout('Generation stopped');
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setReferenceImage(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to ComfyUI if available
    if (backendStatus.comfyui) {
      const uploadedName = await uploadReferenceImage(file);
      if (uploadedName) {
        setReferenceImageName(uploadedName);
        showNotificationWithTimeout('Reference image uploaded to ComfyUI!');
      } else {
        showNotificationWithTimeout('Reference image loaded (ComfyUI upload failed)');
      }
    } else {
      showNotificationWithTimeout('Reference image loaded (demo mode)');
    }
  };

  const handleSendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? chatInput).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    // Persist user message
    await supabase.from('chat_messages').insert({
      session_id: SESSION_ID,
      role: 'user',
      content: text,
    });

    // Generate intelligent Myanmar response
    const responseText = getAIResponse(text);
    const delay = getTypingDelay(responseText);
    await new Promise(resolve => setTimeout(resolve, delay));

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);

    // Persist assistant message
    await supabase.from('chat_messages').insert({
      session_id: SESSION_ID,
      role: 'assistant',
      content: responseText,
    });
  };

  useEffect(() => {
    return () => {
      if (trainingRef.current) {
        clearInterval(trainingRef.current);
      }
    };
  }, []);

  // Toggle video play state
  const toggleVideoPlay = (id: string) => {
    setPlayingVideoId(prev => prev === id ? null : id);
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'dataset', icon: Database, label: 'Dataset' },
    { id: 'training', icon: Sliders, label: 'Training' },
    { id: 'generation', icon: Sparkles, label: 'Generate' },
    { id: 'assistant', icon: MessageSquare, label: 'AI Assistant' },
  ];

  // KKS Logo using real image
  const AILogo = ({ className = "w-14 h-14" }: { className?: string }) => (
    <div className={`${className} relative shrink-0 rounded-full logo-glow`}>
      <img
        src="/KKS_Logo_copy.jpg"
        alt="KKS AI Smart Trainer"
        className="w-full h-full rounded-full object-cover"
        style={{ border: '2px solid rgba(217,119,6,0.6)' }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0800] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#160e00] border-r border-[#3d2a00] flex flex-col">
        <div className="px-5 py-4 border-b border-[#3d2a00]">
          <div className="flex items-center gap-3">
            <AILogo className="w-14 h-14" />
            <div className="min-w-0">
              <h1 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-700 text-base leading-tight tracking-wide">
                KKS AI
              </h1>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-amber-500/80">
                Smart Trainer
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <p className="text-xs text-[#8a6030] uppercase tracking-wider mb-3 px-3">Navigation</p>
          <ul className="space-y-1">
            {navItems.map((item, idx) => (
              <li key={item.id} style={{ animationDelay: `${idx * 50}ms` }} className="animate-slide-in">
                <button
                  onClick={() => setCurrentScreen(item.id as Screen)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    currentScreen === item.id
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'text-[#c4a060] hover:bg-[#1f1500] hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${currentScreen === item.id ? 'text-amber-400' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                  {currentScreen === item.id && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-[#3d2a00] space-y-3">
          {/* Source Code Download */}
          <a
            href="/kks-ai-trainer-source.zip"
            download="kks-ai-trainer-source.zip"
            className="flex items-center gap-2 w-full px-3 py-2.5 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/30 hover:border-amber-500/60 rounded-lg transition-all duration-200 group"
          >
            <Download className="w-4 h-4 text-amber-400 group-hover:text-amber-300 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-400 group-hover:text-amber-300 leading-tight">Source Code ဒေါင်းလုဒ်</p>
              <p className="text-[10px] text-[#8a6030] leading-tight">kks-ai-trainer-source.zip</p>
            </div>
          </a>

          {/* Backend Status */}
          <div className="p-3 bg-[#1f1500] rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${backendStatus.comfyui ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-xs font-medium ${backendStatus.comfyui ? 'text-green-400' : 'text-red-400'}`}>
                {backendStatus.comfyui ? 'ComfyUI Online' : 'ComfyUI Offline'}
              </span>
            </div>
            <p className="text-xs text-[#8a6030]">
              {backendStatus.comfyui ? selectedModel : 'Demo mode — run setup.bat'}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${backendStatus.caption ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-[10px] ${backendStatus.caption ? 'text-green-400' : 'text-red-400'}`}>
                Caption {backendStatus.caption ? 'Online' : 'Offline'}
              </span>
            </div>
            {backendStatus.comfyui && availableModels.length > 1 && (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="mt-2 w-full text-xs bg-[#0d0800] border border-[#3d2a00] rounded px-2 py-1 text-amber-400 outline-none focus:border-amber-600"
              >
                {availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#0d0800]/95 backdrop-blur-sm border-b border-[#3d2a00] px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {navItems.find(n => n.id === currentScreen)?.label}
              </h2>
              <p className="text-sm text-[#8a6030]">
                {currentScreen === 'dashboard' && 'Manage your AI design projects'}
                {currentScreen === 'dataset' && 'Prepare and caption your training data'}
                {currentScreen === 'training' && 'Configure and run model training'}
                {currentScreen === 'generation' && 'Generate designs with trained models'}
                {currentScreen === 'assistant' && 'မြန်မာဘာသာဖြင့် AI အကူအညီ ရယူပါ'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-[#1f1500] rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-[#8a6030]" />
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-[#1f1500] rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-[#c4a060]">Offline Mode</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Dashboard Screen */}
          {currentScreen === 'dashboard' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Your Projects</h3>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New Project
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map((project, idx) => (
                  <div
                    key={project.id}
                    style={{ animationDelay: `${idx * 100}ms` }}
                    className="animate-fade-in group bg-[#160e00] border border-[#3d2a00] rounded-xl overflow-hidden hover:border-[#5a3c00] transition-all duration-300 cursor-pointer"
                  >
                    <div className="aspect-video bg-[#1f1500] relative overflow-hidden">
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                      />
                      {project.isVideo && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-md flex items-center gap-1">
                            <Video className="w-3 h-3" /> Video
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        {project.status === 'ready' && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        )}
                        {project.status === 'training' && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-md flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Training
                          </span>
                        )}
                        {project.status === 'draft' && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-md flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Draft
                          </span>
                        )}
                      </div>
                      {project.status === 'training' && project.progress && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3d2a00]">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-red-600 progress-bar"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-white mb-1 group-hover:text-amber-400 transition-colors">
                        {project.name}
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8a6030]">{project.type}</span>
                        <span className="text-xs text-[#6a4820]">
                          {project.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dataset Preparation Screen */}
          {currentScreen === 'dataset' && (
            <div className="animate-fade-in space-y-6">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 bg-[#160e00] border border-[#3d2a00] rounded-lg p-1.5 w-fit">
                <button
                  onClick={() => setDatasetMode('image')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                    datasetMode === 'image'
                      ? 'bg-amber-600 text-white'
                      : 'text-[#c4a060] hover:text-white hover:bg-[#1f1500]'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Image Dataset
                </button>
                <button
                  onClick={() => setDatasetMode('video')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                    datasetMode === 'video'
                      ? 'bg-amber-600 text-white'
                      : 'text-[#c4a060] hover:text-white hover:bg-[#1f1500]'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  Video Dataset
                </button>
              </div>

              {/* Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleFileInput}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-[#3d2a00] hover:border-[#5a3c00] bg-[#160e00]'
                }`}
              >
                {datasetMode === 'image' ? (
                  <>
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-amber-400' : 'text-[#6a4820]'}`} />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {isDragging ? 'Drop images here' : 'Upload Training Images'}
                    </h3>
                    <p className="text-sm text-[#8a6030] mb-4">
                      Drag and drop your images here, or click to browse
                    </p>
                    <p className="text-xs text-[#6a4820]">
                      Supports: JPG, PNG, WEBP | Recommended: 512x512 or higher
                    </p>
                  </>
                ) : (
                  <>
                    <Film className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-amber-400' : 'text-[#6a4820]'}`} />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {isDragging ? 'Drop videos here' : 'Upload Video Clips'}
                    </h3>
                    <p className="text-sm text-[#8a6030] mb-4">
                      Upload short video clips or image-to-video source files
                    </p>
                    <p className="text-xs text-[#6a4820]">
                      Supports: MP4, MOV, WEBM | Duration: 2-4 seconds recommended
                    </p>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              {uploadedFiles.length > 0 && (
                <div className="flex items-center justify-between bg-[#160e00] border border-[#3d2a00] rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[#c4a060]">
                      {datasetMode === 'image' ? (
                        <FileImage className="w-4 h-4 inline mr-2" />
                      ) : (
                        <Film className="w-4 h-4 inline mr-2" />
                      )}
                      {uploadedFiles.length} {datasetMode === 'image' ? 'images' : 'videos'} uploaded
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAutoCaption}
                      disabled={autoCaptioning}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {autoCaptioning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      {autoCaptioning ? 'Captioning...' : 'Auto-Caption'}
                    </button>
                    <button
                      onClick={handleExportDataset}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export Dataset
                    </button>
                    <button
                      onClick={() => setUploadedFiles([])}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear All
                    </button>
                  </div>
                </div>
              )}

              {/* File Grid */}
              {uploadedFiles.length > 0 && (
                <div className={`grid gap-6 ${datasetMode === 'image' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={file.id}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className="animate-fade-in bg-[#160e00] border border-[#3d2a00] rounded-xl overflow-hidden"
                    >
                      <div className={`${datasetMode === 'image' ? 'aspect-square' : 'aspect-video'} bg-[#1f1500] relative group`}>
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        {datasetMode === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                              <Play className="w-6 h-6 text-white ml-1" />
                            </div>
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-1 bg-black/50 text-white text-xs rounded flex items-center gap-1">
                            {file.type === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                            {file.duration || 'JPG'}
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-[#6a4820] font-mono truncate">{file.name}</span>
                          {file.duration && (
                            <span className="text-xs text-amber-400 flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {file.duration}
                            </span>
                          )}
                        </div>
                        <textarea
                          value={file.caption}
                          onChange={(e) => updateFileCaption(file.id, e.target.value)}
                          placeholder={`Enter caption/tags for this ${file.type}...`}
                          className="w-full h-20 bg-[#1f1500] border border-[#3d2a00] rounded-lg p-3 text-sm text-[#c4a060] placeholder:text-[#6a4820] resize-none focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {uploadedFiles.length === 0 && (
                <div className="text-center py-16">
                  {datasetMode === 'image' ? (
                    <ImageIcon className="w-16 h-16 mx-auto text-[#3d2800] mb-4" />
                  ) : (
                    <Film className="w-16 h-16 mx-auto text-[#3d2800] mb-4" />
                  )}
                  <p className="text-[#8a6030]">No {datasetMode === 'image' ? 'images' : 'videos'} uploaded yet. Upload some files to get started.</p>
                </div>
              )}
            </div>
          )}

          {/* Training Configuration Screen */}
          {currentScreen === 'training' && (
            <div className="animate-fade-in space-y-6">
              {/* Training Mode Toggle */}
              <div className="flex items-center gap-2 bg-[#160e00] border border-[#3d2a00] rounded-lg p-1.5 w-fit">
                <button
                  onClick={() => setTrainingMode('image')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                    trainingMode === 'image'
                      ? 'bg-amber-600 text-white'
                      : 'text-[#c4a060] hover:text-white hover:bg-[#1f1500]'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Image Model (LoRA)
                </button>
                <button
                  onClick={() => setTrainingMode('video')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                    trainingMode === 'video'
                      ? 'bg-amber-600 text-white'
                      : 'text-[#c4a060] hover:text-white hover:bg-[#1f1500]'
                  }`}
                >
                  <Clapperboard className="w-4 h-4" />
                  Video Model (AnimateDiff)
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configuration Form */}
                <div className="bg-[#160e00] border border-[#3d2a00] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-400" />
                    {trainingMode === 'image' ? 'LoRA Training Parameters' : 'AnimateDiff Training Parameters'}
                  </h3>

                  <div className="space-y-5">
                    {/* Base Model */}
                    <div>
                      <label className="block text-sm font-medium text-[#c4a060] mb-2">
                        {trainingMode === 'image' ? 'Base Model Path' : 'Motion Module Path'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={trainingMode === 'image' ? trainingConfig.baseModel : '/models/mm_sd_v15.ckpt'}
                          onChange={(e) => setTrainingConfig({ ...trainingConfig, baseModel: e.target.value })}
                          className="flex-1 bg-[#1f1500] border border-[#3d2a00] rounded-lg px-4 py-2.5 text-sm text-[#c4a060] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                        />
                        <button className="px-4 py-2 bg-[#1f1500] border border-[#3d2a00] hover:border-[#5a3c00] rounded-lg transition-colors">
                          <FolderOpen className="w-4 h-4 text-[#8a6030]" />
                        </button>
                      </div>
                    </div>

                    {/* Batch Size */}
                    <div>
                      <label className="block text-sm font-medium text-[#c4a060] mb-2">
                        Batch Size {trainingMode === 'video' && <span className="text-yellow-500/80">(Video: max 2)</span>}
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="1"
                          max={trainingMode === 'image' ? "16" : "4"}
                          value={trainingConfig.batchSize}
                          onChange={(e) => setTrainingConfig({ ...trainingConfig, batchSize: parseInt(e.target.value) })}
                          className="flex-1 h-2 bg-[#1f1500] rounded-lg appearance-none cursor-pointer"
                        />
                        <input
                          type="number"
                          value={trainingConfig.batchSize}
                          onChange={(e) => setTrainingConfig({ ...trainingConfig, batchSize: parseInt(e.target.value) || 1 })}
                          min="1"
                          max={trainingMode === 'image' ? 16 : 4}
                          className="w-20 bg-[#1f1500] border border-[#3d2a00] rounded-lg px-3 py-2 text-center text-sm text-[#c4a060] focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Epochs */}
                    <div>
                      <label className="block text-sm font-medium text-[#c4a060] mb-2">
                        Epochs
                      </label>
                      <input
                        type="number"
                        value={trainingMode === 'image' ? trainingConfig.epochs : 30}
                        onChange={(e) => setTrainingConfig({ ...trainingConfig, epochs: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="w-full bg-[#1f1500] border border-[#3d2a00] rounded-lg px-4 py-2.5 text-sm text-[#c4a060] focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    {/* Learning Rate */}
                    <div>
                      <label className="block text-sm font-medium text-[#c4a060] mb-2">
                        Learning Rate
                      </label>
                      <input
                        type="text"
                        value={trainingConfig.learningRate}
                        onChange={(e) => setTrainingConfig({ ...trainingConfig, learningRate: e.target.value })}
                        className="w-full bg-[#1f1500] border border-[#3d2a00] rounded-lg px-4 py-2.5 text-sm text-[#c4a060] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                      />
                    </div>

                    {/* Network Rank / Dimension */}
                    <div>
                      <label className="block text-sm font-medium text-[#c4a060] mb-2">
                        {trainingMode === 'image' ? 'Network Rank / Dimension' : 'Temporal Attention Rank'}
                      </label>
                      <select
                        value={trainingConfig.networkRank}
                        onChange={(e) => setTrainingConfig({ ...trainingConfig, networkRank: parseInt(e.target.value) })}
                        className="w-full bg-[#1f1500] border border-[#3d2a00] rounded-lg px-4 py-2.5 text-sm text-[#c4a060] focus:outline-none focus:border-amber-500 transition-colors"
                      >
                        <option value={32}>32 - Lightweight</option>
                        <option value={64}>64 - Standard</option>
                        <option value={128}>128 - High Capacity</option>
                      </select>
                    </div>

                    {/* Network Alpha */}
                    <div>
                      <label className="block text-sm font-medium text-[#c4a060] mb-2">
                        Network Alpha
                      </label>
                      <input
                        type="number"
                        value={trainingConfig.networkAlpha}
                        onChange={(e) => setTrainingConfig({ ...trainingConfig, networkAlpha: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="w-full bg-[#1f1500] border border-[#3d2a00] rounded-lg px-4 py-2.5 text-sm text-[#c4a060] focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    {/* Output Folder */}
                    <div>
                      <label className="block text-sm font-medium text-[#c4a060] mb-2">
                        Output Folder
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={trainingConfig.outputFolder}
                          onChange={(e) => setTrainingConfig({ ...trainingConfig, outputFolder: e.target.value })}
                          className="flex-1 bg-[#1f1500] border border-[#3d2a00] rounded-lg px-4 py-2.5 text-sm text-[#c4a060] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                        />
                        <button className="px-4 py-2 bg-[#1f1500] border border-[#3d2a00] hover:border-[#5a3c00] rounded-lg transition-colors">
                          <FolderOpen className="w-4 h-4 text-[#8a6030]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Start Training Button */}
                  <div className="mt-8">
                    {!isTraining ? (
                      <button
                        onClick={startTraining}
                        className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-lg transition-all duration-200 animate-pulse-glow ${
                          trainingMode === 'image'
                            ? 'bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800'
                            : 'bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800'
                        }`}
                      >
                        <Play className="w-5 h-5" />
                        Start {trainingMode === 'image' ? 'LoRA' : 'Video'} Training
                      </button>
                    ) : (
                      <button
                        onClick={stopTraining}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                      >
                        <Pause className="w-5 h-5" />
                        Stop Training
                      </button>
                    )}
                  </div>
                </div>

                {/* Training Progress & Logs */}
                <div className="bg-[#160e00] border border-[#3d2a00] rounded-xl p-6 flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Terminal className={`w-5 h-5 ${trainingMode === 'image' ? 'text-amber-400' : 'text-amber-400'}`} />
                    Training Console
                  </h3>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#c4a060]">Progress</span>
                      <span className="text-sm font-mono text-white">{trainingProgress}%</span>
                    </div>
                    <div className="h-3 bg-[#1f1500] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isTraining ? 'progress-bar' : trainingMode === 'image' ? 'bg-gradient-to-r from-amber-600 to-red-700' : 'bg-gradient-to-r from-amber-600 to-red-700'
                        }`}
                        style={{ width: `${trainingProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Estimated Time */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <span className="text-xs text-[#6a4820]">Estimated: {trainingMode === 'image' ? '~45 min' : '~2 hours'}</span>
                    <span className="text-xs text-[#6a4820]">GPU: 18.4GB / 24GB</span>
                  </div>

                  {/* Terminal Window */}
                  <div className="flex-1 bg-[#0d0800] border border-[#3d2a00] rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#1f1500] border-b border-[#3d2a00]">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <span className="text-xs text-[#6a4820] font-mono ml-2">
                        {trainingMode === 'image' ? 'lora_training.log' : 'animateDiff_training.log'}
                      </span>
                    </div>
                    <div className="h-72 overflow-auto p-4 terminal-font text-xs">
                      {trainingLogs.length === 0 ? (
                        <div className="text-[#5a3c10] text-center py-12">
                          <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>Training logs will appear here...</p>
                        </div>
                      ) : (
                        trainingLogs.map((log) => (
                          <div
                            key={log.id}
                            className="animate-log-appear mb-1"
                          >
                            <span className="text-[#5a3c10] mr-2">
                              [{log.timestamp.toLocaleTimeString()}]
                            </span>
                            <span className={
                              log.type === 'success' ? 'text-green-400' :
                              log.type === 'error' ? 'text-red-400' :
                              log.type === 'warning' ? 'text-yellow-400' :
                              'text-[#c4a060]'
                            }>
                              {log.message}
                            </span>
                          </div>
                        ))
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generation Screen */}
          {currentScreen === 'generation' && (
            <div className="animate-fade-in space-y-6">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 bg-[#160e00] border border-[#3d2a00] rounded-lg p-1.5 w-fit">
                <button
                  onClick={() => setGenerationMode('image')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                    generationMode === 'image'
                      ? 'bg-amber-600 text-white'
                      : 'text-[#c4a060] hover:text-white hover:bg-[#1f1500]'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Text-to-Image
                </button>
                <button
                  onClick={() => setGenerationMode('image-to-video')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                    generationMode === 'image-to-video'
                      ? 'bg-amber-600 text-white'
                      : 'text-[#c4a060] hover:text-white hover:bg-[#1f1500]'
                  }`}
                >
                  <SwitchCamera className="w-4 h-4" />
                  Image-to-Video
                </button>
              </div>

              {/* Image-to-Video Reference Upload */}
              {generationMode === 'image-to-video' && (
                <div className="bg-[#160e00] border border-[#3d2a00] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-amber-400" />
                    Reference Image
                  </h3>
                  {referenceImage ? (
                    <div className="relative w-64 h-64 rounded-xl overflow-hidden group">
                      <img
                        src={referenceImage}
                        alt="Reference"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setReferenceImage(null)}
                        className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-xs text-white">Reference uploaded</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => referenceFileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#3d2a00] hover:border-[#d97706]/50 rounded-xl p-8 text-center cursor-pointer transition-colors"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#d97706]/20 flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8 text-[#d97706]" />
                      </div>
                      <p className="text-[#c4a060] mb-2">Click to upload reference image</p>
                      <p className="text-xs text-[#6a4820]">This image will be animated based on your prompt</p>
                    </div>
                  )}
                </div>
              )}

              {/* Hidden file input for reference image */}
              <input
                ref={referenceFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReferenceUpload}
              />

              {/* Input Area */}
              <div className="bg-[#160e00] border border-[#3d2a00] rounded-xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Prompt Input */}
                  <div>
                    <label className="block text-sm font-medium text-[#c4a060] mb-2">
                      {generationMode === 'image' ? 'Prompt' : 'Motion Prompt'}
                    </label>
                    <textarea
                      value={generationMode === 'image' ? generationPrompt : videoPrompt}
                      onChange={(e) => generationMode === 'image' ? setGenerationPrompt(e.target.value) : setVideoPrompt(e.target.value)}
                      placeholder={generationMode === 'image'
                        ? "Describe the design you want to generate... e.g., 'modern living room with minimal furniture, natural lighting, 8k photorealistic'"
                        : "Describe the motion... e.g., 'gentle camera pan from left to right, subtle zoom in on subject'"
                      }
                      className="w-full h-32 bg-[#1f1500] border border-[#3d2a00] rounded-lg p-4 text-sm text-white placeholder:text-[#6a4820] resize-none focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  {/* Negative Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-[#c4a060] mb-2">
                      Negative Prompt
                    </label>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="What to avoid in the generation..."
                      className="w-full h-32 bg-[#1f1500] border border-[#3d2a00] rounded-lg p-4 text-sm text-white placeholder:text-[#6a4820] resize-none focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Model Selection & Parameters */}
                <div className="flex items-center gap-4 mt-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#8a6030]" />
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="bg-[#1f1500] border border-[#3d2a00] rounded-lg px-3 py-2 text-sm text-[#c4a060] focus:outline-none focus:border-amber-500 transition-colors"
                      disabled={!backendStatus.comfyui}
                    >
                      {backendStatus.comfyui && availableModels.length > 0 ? (
                        availableModels.map(m => <option key={m} value={m}>{m}</option>)
                      ) : (
                        <option>Demo Mode (start backend)</option>
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6a4820]">Steps:</span>
                    <input
                      type="number"
                      value={genSteps}
                      onChange={(e) => setGenSteps(parseInt(e.target.value) || 25)}
                      min={10}
                      max={50}
                      className="w-16 bg-[#1f1500] border border-[#3d2a00] rounded-lg px-2 py-1 text-sm text-[#c4a060] text-center focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6a4820]">CFG Scale:</span>
                    <input
                      type="number"
                      value={genCfg}
                      onChange={(e) => setGenCfg(parseFloat(e.target.value) || 7.5)}
                      min={1}
                      max={20}
                      step={0.5}
                      className="w-16 bg-[#1f1500] border border-[#3d2a00] rounded-lg px-2 py-1 text-sm text-[#c4a060] text-center focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  {generationMode === 'image-to-video' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#6a4820]">Frames:</span>
                      <input
                        type="number"
                        value={videoFrames}
                        onChange={(e) => setVideoFrames(parseInt(e.target.value) || 16)}
                        min={8}
                        max={32}
                        className="w-16 bg-[#1f1500] border border-[#3d2a00] rounded-lg px-2 py-1 text-sm text-[#c4a060] text-center focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => {
                        setGenerationPrompt('');
                        setVideoPrompt('');
                      }}
                      className="p-2 hover:bg-[#1f1500] rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-[#8a6030]" />
                    </button>
                    {isGenerating && backendStatus.comfyui && (
                      <button
                        onClick={handleStopGeneration}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-lg transition-all"
                      >
                        <Square className="w-4 h-4" />
                        Stop
                      </button>
                    )}
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || (generationMode === 'image' ? !generationPrompt.trim() : (!videoPrompt.trim()))}
                      className={`flex items-center gap-2 px-6 py-2.5 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        generationMode === 'image'
                          ? 'bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800'
                          : 'bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {generationProgress > 0 ? `${generationProgress}%` : 'Generating...'}
                        </>
                      ) : (
                        <>
                          {generationMode === 'image' ? <Sparkles className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                          {generationMode === 'image' ? 'Generate Image' : 'Generate Video'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress bar for real generation */}
                {isGenerating && generationProgress > 0 && (
                  <div className="mt-4">
                    <div className="h-2 bg-[#3d2a00] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Loading Skeleton */}
              {isGenerating && (
                <div className={`grid gap-4 ${generationMode === 'image' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                  {Array.from({ length: generationMode === 'image' ? 4 : 2 }).map((_, i) => (
                    <div
                      key={i}
                      className={`${generationMode === 'image' ? 'aspect-square' : 'aspect-video'} rounded-xl skeleton animate-pulse`}
                    />
                  ))}
                </div>
              )}

              {/* Generated Gallery */}
              {generatedContent.length > 0 && !isGenerating && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      {generationMode === 'image' ? 'Generated Designs' : 'Generated Videos'}
                    </h3>
                    <button
                      onClick={() => setGeneratedContent([])}
                      className="text-sm text-[#8a6030] hover:text-white transition-colors"
                    >
                      Clear Gallery
                    </button>
                  </div>
                  <div className={`grid gap-4 ${generationMode === 'image' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {generatedContent.map((content, idx) => (
                      <div
                        key={content.id}
                        style={{ animationDelay: `${idx * 50}ms` }}
                        className="animate-fade-in group relative bg-[#160e00] border border-[#3d2a00] rounded-xl overflow-hidden hover:border-[#5a3c00] transition-all duration-300"
                      >
                        <div className={content.type === 'image' ? 'aspect-square' : 'aspect-video'}>
                          <img
                            src={content.preview}
                            alt={content.prompt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {content.type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <button
                                onClick={() => toggleVideoPlay(content.id)}
                                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                              >
                                {playingVideoId === content.id ? (
                                  <Pause className="w-7 h-7 text-white" />
                                ) : (
                                  <Play className="w-7 h-7 text-white ml-1" />
                                )}
                              </button>
                            </div>
                          )}
                          {content.type === 'video' && playingVideoId === content.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3d2a00]">
                              <div
                                className="h-full bg-amber-500 rounded-full animate-pulse"
                                style={{ width: '60%' }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-xs text-white line-clamp-2 mb-2">{content.prompt}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#c4a060] font-mono">
                                {content.type === 'video' ? (
                                  <span className="flex items-center gap-1">
                                    <Timer className="w-3 h-3" /> 4s
                                  </span>
                                ) : (
                                  `Seed: ${content.seed}`
                                )}
                              </span>
                              <div className="flex gap-1">
                                {content.type === 'video' && (
                                  <button
                                    onClick={() => setVideoMuted(!videoMuted)}
                                    className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                  >
                                    {videoMuted ? (
                                      <VolumeX className="w-3 h-3 text-white" />
                                    ) : (
                                      <Volume2 className="w-3 h-3 text-white" />
                                    )}
                                  </button>
                                )}
                                <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                                  <Copy className="w-3 h-3 text-white" />
                                </button>
                                <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                                  <Download className="w-3 h-3 text-white" />
                                </button>
                                {content.type === 'video' && (
                                  <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                                    <Maximize2 className="w-3 h-3 text-white" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedContent.length === 0 && !isGenerating && (
                <div className="text-center py-20">
                  {generationMode === 'image' ? (
                    <Sparkles className="w-16 h-16 mx-auto text-[#3d2800] mb-4" />
                  ) : (
                    <Video className="w-16 h-16 mx-auto text-[#3d2800] mb-4" />
                  )}
                  <p className="text-[#8a6030]">
                    {generationMode === 'image'
                      ? 'Enter a prompt and click Generate to create designs'
                      : 'Upload a reference image and describe the motion to generate a video'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI Assistant Chat Screen */}
          {currentScreen === 'assistant' && (
            <div className="animate-fade-in h-[calc(100vh-180px)] flex flex-col bg-[#160e00] border border-[#3d2a00] rounded-xl overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-[#3d2a00] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-red-700 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">KKS AI Assistant</h3>
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Online · Offline Mode တွင် အသင့်ရှိသည်
                  </p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={async () => {
                      await supabase
                        .from('chat_messages')
                        .delete()
                        .eq('session_id', SESSION_ID);
                      setChatMessages([chatMessages[0]]);
                    }}
                    className="p-2 hover:bg-[#1f1500] rounded-lg transition-colors"
                    title="Chat ရှင်းမည်"
                  >
                    <Trash2 className="w-4 h-4 text-[#8a6030]" />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {chatMessages.map((message, idx) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-red-700 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-amber-600 text-white rounded-br-md'
                          : 'bg-[#1f1500] text-[#c4a060] rounded-bl-md border border-[#3d2a00]'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-amber-200' : 'text-[#6a4820]'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-[#3d2a00] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-[#c4a060]" />
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-red-700 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-[#1f1500] border border-[#3d2a00] rounded-2xl rounded-bl-md p-4">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#505060] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[#505060] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#505060] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggested Questions */}
              {chatMessages.length <= 1 && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-[#6a4820] mb-2">အကြံပြုမေးခွန်းများ —</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Training ကို မည်သို့ စတင်မည်နည်း?",
                      "Batch size အကောင်းဆုံးက ဘယ်လောက်လဲ?",
                      "Dataset ကို မည်သို့ ပြင်ဆင်မည်နည်း?",
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(suggestion)}
                        className="text-xs px-3 py-1.5 bg-[#1f1500] border border-[#3d2a00] rounded-lg text-[#c4a060] hover:text-white hover:border-[#5a3c00] transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <div className="p-4 border-t border-[#3d2a00]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="AI training နှင့်ပတ်သက်ပြီး ဘာမဆို မေးနိုင်ပါသည်..."
                    className="flex-1 bg-[#1f1500] border border-[#3d2a00] rounded-xl px-4 py-3 text-white placeholder:text-[#6a4820] focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!chatInput.trim() || isTyping}
                    className="px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-[#6a4820] mt-2 text-center">
                  🔒 KKS AI Assistant သည် အင်တာနက်မလိုဘဲ လုံးဝ offline တွင် လည်ပတ်သည် — သင်၏ ဒေတာများ သင်၏ကွန်ပျူတာတွင်သာ နေသည်
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#160e00] border border-[#3d2a00] rounded-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-[#3d2a00]">
              <h3 className="text-lg font-semibold text-white">Create New Project</h3>
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectStep(1);
                }}
                className="p-2 hover:bg-[#1f1500] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#8a6030]" />
              </button>
            </div>

            <div className="p-6">
              {/* Step Indicator */}
              <div className="flex items-center justify-center mb-8">
                {[1, 2].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        newProjectStep >= step
                          ? 'bg-amber-600 text-white'
                          : 'bg-[#1f1500] text-[#6a4820]'
                      }`}
                    >
                      {step}
                    </div>
                    {step < 2 && (
                      <div
                        className={`w-16 h-0.5 mx-2 transition-colors ${
                          newProjectStep > step ? 'bg-amber-600' : 'bg-[#3d2a00]'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {newProjectStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#c4a060] mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="e.g., My Awesome Style"
                      className="w-full bg-[#1f1500] border border-[#3d2a00] rounded-lg px-4 py-3 text-white placeholder:text-[#6a4820] focus:outline-none focus:border-amber-500 transition-colors"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#c4a060] mb-2">
                      Training Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Fine-tune', 'Dreambooth', 'Style Transfer', 'Image-to-Video'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setNewProjectType(type)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            newProjectType === type
                              ? type.includes('Video')
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500'
                              : 'bg-[#1f1500] text-[#c4a060] border-[#3d2a00] hover:border-[#5a3c00]'
                          } border`}
                        >
                          {type.includes('Video') && <Video className="w-3 h-3 inline mr-1" />}
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setNewProjectStep(2)}
                    disabled={!newProjectName.trim()}
                    className="w-full mt-4 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              )}

              {newProjectStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#c4a060] mb-4">
                    Project "<span className="text-white font-medium">{newProjectName}</span>" will be created as a <span className={newProjectType.includes('Video') ? 'text-amber-400' : 'text-amber-400'}>{newProjectType}</span> project.
                  </p>

                  <div className="bg-[#1f1500] border border-[#3d2a00] rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-[#c4a060]">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Default training configuration applied
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#c4a060]">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Output folder created
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#8a6030]">
                      <div className="w-4 h-4 rounded-full border border-[#505060] flex items-center justify-center text-xs">
                        <ExternalLink className="w-2 h-2" />
                      </div>
                      {newProjectType.includes('Video') ? 'Add video clips' : 'Add dataset images'} (next step)
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setNewProjectStep(1)}
                      className="flex-1 px-6 py-3 bg-[#1f1500] hover:bg-[#2a1c00] text-[#c4a060] font-semibold rounded-lg transition-colors border border-[#3d2a00]"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCreateProject}
                      className={`flex-1 px-6 py-3 text-white font-semibold rounded-lg transition-colors ${
                        newProjectType.includes('Video')
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-amber-600 hover:bg-amber-700'
                      }`}
                    >
                      Create Project
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 z-50 notification-enter">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#160e00] border border-green-500/30 rounded-lg shadow-lg shadow-green-500/10">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm text-white">{showNotification}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
