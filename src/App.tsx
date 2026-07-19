import { useState, useEffect, useRef } from 'react';
import { supabase, SESSION_ID } from './lib/supabase';
import type { DbProject, DbChatMessage, DbTrainingMetric, DbModelCheckpoint } from './lib/supabase';
import { getAIResponse, getTypingDelay } from './lib/aiEngine';
import { checkComfyUI, checkCaptionServer, getAvailableModels } from './lib/backend';
import { generateImages, generateVideo, uploadReferenceImage } from './lib/comfyui';
import type { GenerationParams, VideoParams } from './lib/comfyui';
import { captionBatch } from './lib/caption';
import { DEFAULT_TRAINING_CONFIG, createTrainingJob, completeJob, stopJob, subscribeToMetrics, subscribeToCheckpoints, runSimulatedTraining } from './lib/training';
import type { TrainingConfig } from './lib/training';
import {
  LayoutDashboard, Database, Sliders, Sparkles, MessageSquare,
  Upload, X, Play, Download, Trash2, Wand2, Send, Video,
  Image as ImageIcon, Terminal, CheckCircle2, Loader2, Layers,
  Cpu, TrendingDown, Save, Award, Square, Bot, User,
  FileDown, Settings,
} from 'lucide-react';

type Screen = 'dashboard' | 'dataset' | 'train' | 'generate' | 'chat';
type TrainingMode = 'image' | 'video';
type GenerationMode = 'image' | 'image-to-video';

interface UploadedFile { id: string; name: string; preview: string; caption: string; fileType: 'image' | 'video'; duration?: string; }
interface GeneratedContent { id: string; prompt: string; seed: number; preview: string; type: 'image' | 'video'; }
interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; }
interface TrainingLog { id: number; message: string; type: 'info' | 'success' | 'warning' | 'error'; timestamp?: Date; }

const SAMPLE_IMAGES = [
  'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=512',
  'https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=512',
  'https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=512',
  'https://images.pexels.com/photos/3637740/pexels-photo-3637740.jpeg?auto=compress&cs=tinysrgb&w=512',
  'https://images.pexels.com/photos/3637748/pexels-photo-3637748.jpeg?auto=compress&cs=tinysrgb&w=512',
  'https://images.pexels.com/photos/3637750/pexels-photo-3637750.jpeg?auto=compress&cs=tinysrgb&w=512',
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  const [trainingMode, setTrainingMode] = useState<TrainingMode>('image');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);
  const [trainingMetrics, setTrainingMetrics] = useState<DbTrainingMetric[]>([]);
  const [checkpoints, setCheckpoints] = useState<DbModelCheckpoint[]>([]);
  const [, setCurrentJobId] = useState<string | null>(null);
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>(DEFAULT_TRAINING_CONFIG);
  const stopFlagRef = useRef(false);

  const [generationMode, setGenerationMode] = useState<GenerationMode>('image');
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageName, setReferenceImageName] = useState<string | null>(null);
  const [genSteps, setGenSteps] = useState(25);
  const [genCfg, setGenCfg] = useState(7.5);
  const [videoFrames, setVideoFrames] = useState(16);
  const [selectedModel, setSelectedModel] = useState('sd1.5-pruned.ckpt');

  const [backendStatus, setBackendStatus] = useState({ comfyui: false, caption: false });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [autoCaptioning, setAutoCaptioning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  // Backend polling
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const [comfyui, caption] = await Promise.all([checkComfyUI(), checkCaptionServer()]);
      if (!mounted) return;
      setBackendStatus({ comfyui, caption });
      if (comfyui) {
        const models = await getAvailableModels();
        if (mounted && models.length > 0) {
          setAvailableModels(models);
          setSelectedModel(models.includes('sd1.5-pruned.ckpt') ? 'sd1.5-pruned.ckpt' : models[0]);
        }
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Load projects
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (data) setProjects(data as DbProject[]);
    })();
  }, []);

  // Load chat
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('chat_messages').select('*').eq('session_id', SESSION_ID).order('created_at', { ascending: true });
      if (data) setChatMessages((data as DbChatMessage[]).map(m => ({ id: m.id, role: m.role, content: m.content })));
    })();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newFiles: UploadedFile[] = files.map((f, i) => ({
      id: Date.now().toString() + i, name: f.name, preview: URL.createObjectURL(f),
      caption: '', fileType: f.type.startsWith('video') ? 'video' : 'image',
      duration: f.type.startsWith('video') ? '3s' : undefined,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    notify(`${files.length} ဖိုင် upload ပြီးပါပြီ`);
  };

  // Auto caption
  const handleAutoCaption = async () => {
    setAutoCaptioning(true);
    if (backendStatus.caption) {
      const files = uploadedFiles.map(f => ({ id: f.id, preview: f.preview }));
      const results = await captionBatch(files, () => {});
      if (results.size > 0) {
        setUploadedFiles(prev => prev.map(f => { const r = results.get(f.id); return r ? { ...f, caption: r.caption } : f; }));
        setAutoCaptioning(false);
        notify(`${results.size} ဖိုင်အတွက် caption ဖန်တီးပြီးပါပြီ (BLIP)`);
        return;
      }
    }
    await new Promise(r => setTimeout(r, 2000));
    const captions = [
      'ခေတ်မီ နေထိုင်ရေးအခန်း၊ ရိုးရှင်းသော ပစ္စည်းများ၊ သဘာဝ အလင်းရောင်',
      'ခေတ်မီ အတွင်းပိုင်းဒီဇိုင်း၊ သဘာဝ အရောင်များ၊ ရှင်းလင်းသော မျဉ်းများ',
      'အနွေးထိုင် အပြည့်အဝ နေထိုင်ရေးခန်း၊ အပင်များ၊ သစ်သား အသုံးအနှုန်း',
      'အဆင့်မြင့် ခေတ်မီ အတွင်းပိုင်း၊ မှောင်မှောင်ရှိရှိ ပြတင်းများ',
      'စကင်ဒီနေးဗီးယန်း စတိုင် အခန်း၊ ဖြူဖြူ နံရံများ၊ ရိုးရှင်းသော ပစ္စည်းများ',
    ];
    setUploadedFiles(prev => prev.map((f, i) => ({ ...f, caption: captions[i % captions.length] })));
    setAutoCaptioning(false);
    notify('Demo caption များ ထည့်ပြီးပါပြီ');
  };

  // Export dataset
  const handleExport = () => {
    const lines = uploadedFiles.map(f => `${f.name}\t${f.caption}`).join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dataset_captions.txt'; a.click();
    URL.revokeObjectURL(url);
    notify('Dataset ထုတ်ယူပြီးပါပြီ');
  };

  // Training
  const handleStartTraining = async () => {
    if (uploadedFiles.length === 0) { notify('Dataset ဖိုင်များ အရင် upload လုပ်ပါ'); return; }
    setIsTraining(true); setTrainingProgress(0); setTrainingLogs([]); setTrainingMetrics([]); setCheckpoints([]);
    stopFlagRef.current = false;

    let projectId = projects[0]?.id;
    if (!projectId) {
      const { data: proj } = await supabase.from('projects').insert({
        name: `Training ${trainingMode === 'image' ? 'ပုံ' : 'ဗီဒီယို'}`,
        type: trainingMode === 'image' ? 'Fine-tune' : 'Image-to-Video',
        status: 'training', is_video: trainingMode === 'video',
      }).select().maybeSingle();
      if (proj) { projectId = (proj as DbProject).id; setProjects(prev => [proj as DbProject, ...prev]); }
    }
    if (!projectId) { notify('Project ဖန်တီး၍ မရပါ'); setIsTraining(false); return; }

    const job = await createTrainingJob(projectId, trainingMode, trainingConfig);
    if (!job) { notify('Training job ဖန်တီး၍ မရပါ'); setIsTraining(false); return; }
    setCurrentJobId(job.id);

    const unsubMetrics = await subscribeToMetrics(job.id, (m) => setTrainingMetrics(prev => [...prev, m]));
    const unsubCheckpoints = await subscribeToCheckpoints(job.id, (c) => setCheckpoints(prev => [c, ...prev]));

    await runSimulatedTraining(job.id, trainingConfig, {
      onLog: (message, type) => setTrainingLogs(prev => [...prev, { id: Date.now() + Math.random(), message, type, timestamp: new Date() }]),
      onProgress: (pct) => setTrainingProgress(pct),
      shouldStop: () => stopFlagRef.current,
    });

    unsubMetrics(); unsubCheckpoints();
    if (stopFlagRef.current) await stopJob(job.id); else await completeJob(job.id);
    setIsTraining(false);
    notify(stopFlagRef.current ? 'Training ရပ်နားပြီးပါပြီ' : 'Training ပြီးမြောက်ပါပြီ!');
  };

  const handleStopTraining = () => { stopFlagRef.current = true; };

  // Generation
  const handleGenerate = async () => {
    if (!generationPrompt.trim()) return;
    setIsGenerating(true);
    if (backendStatus.comfyui) {
      try {
        const seed = Math.floor(Math.random() * 999999999);
        if (generationMode === 'image') {
          const params: GenerationParams = { prompt: generationPrompt, negativePrompt: negativePrompt || 'blurry, low quality', seed, steps: genSteps, cfgScale: genCfg, width: 512, height: 512, modelName: selectedModel, batchSize: 4 };
          const result = await generateImages(params);
          if (result && result.images.length > 0) {
            setGeneratedContent(prev => [...result.images.map((url, i) => ({ id: Date.now().toString() + i, prompt: generationPrompt, seed: seed + i, preview: url, type: 'image' as const })), ...prev]);
            setIsGenerating(false); notify('ComfyUI ဖြင့် ပုံများ ဖန်တီးပြီးပါပြီ'); return;
          }
        } else {
          const params: VideoParams = { prompt: videoPrompt || generationPrompt, negativePrompt: negativePrompt || 'blurry', seed, steps: genSteps, cfgScale: genCfg, modelName: selectedModel, referenceImageName, frames: videoFrames, motionScale: 1.0 };
          const result = await generateVideo(params);
          if (result && result.videoUrl) {
            setGeneratedContent(prev => [{ id: Date.now().toString(), prompt: videoPrompt, seed, preview: result.videoUrl, type: 'video' as const }, ...prev]);
            setIsGenerating(false); notify('ComfyUI ဖြင့် ဗီဒီယို ဖန်တီးပြီးပါပြီ'); return;
          }
        }
        setIsGenerating(false); notify('Generate လုပ်၍ မရပါ'); return;
      } catch { setIsGenerating(false); notify('Generate အမှား - demo mode သို့ ပြောင်းပါမယ်'); }
    }
    // Mock fallback
    await new Promise(r => setTimeout(r, 3000));
    const isVideo = generationMode === 'image-to-video';
    const newContent: GeneratedContent[] = Array.from({ length: isVideo ? 2 : 4 }, (_, i) => ({
      id: Date.now().toString() + i, prompt: isVideo ? videoPrompt : generationPrompt,
      seed: Math.floor(Math.random() * 999999999), preview: SAMPLE_IMAGES[i % SAMPLE_IMAGES.length],
      type: isVideo ? 'video' as const : 'image' as const,
    }));
    setGeneratedContent(prev => [...newContent, ...prev]);
    setIsGenerating(false);
    notify(`${isVideo ? 'ဗီဒီယို ၂ ခု' : 'ပုံ ၄ ခု'} ဖန်တီးပြီးပါပြီ (demo mode)`);
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setReferenceImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (backendStatus.comfyui) {
      const name = await uploadReferenceImage(file);
      if (name) { setReferenceImageName(name); notify('Reference ပုံ ComfyUI သို့ upload ပြီးပါပြီ'); }
    }
  };

  // Chat
  const handleSendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? chatInput).trim(); if (!text) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text };
    setChatMessages(prev => [...prev, userMsg]); setChatInput(''); setIsAiTyping(true);
    await supabase.from('chat_messages').insert({ session_id: SESSION_ID, role: 'user', content: text });
    const aiResp = getAIResponse(text);
    await new Promise(r => setTimeout(r, getTypingDelay(aiResp.text)));
    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: aiResp.text };
    setChatMessages(prev => [...prev, aiMsg]);
    await supabase.from('chat_messages').insert({ session_id: SESSION_ID, role: 'assistant', content: aiResp.text });
    setIsAiTyping(false);
  };

  const navItems: Array<{ id: Screen; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'ပင်မစာမျက်နှာ', icon: LayoutDashboard },
    { id: 'dataset', label: 'Dataset', icon: Database },
    { id: 'train', label: 'သင်ကြားရေး', icon: Sliders },
    { id: 'generate', label: 'ဖန်တီးရေး', icon: Sparkles },
    { id: 'chat', label: 'AI လက်ထောက်', icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen bg-kks-bg text-kks-text font-sans">
      <aside className="w-64 bg-kks-panel border-r border-kks-border flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-kks-border">
          <h1 className="text-lg font-bold text-kks-gold flex items-center gap-2">
            <Cpu className="w-6 h-6" /> KKS AI Studio
          </h1>
          <p className="text-xs text-kks-muted mt-1">Offline AI Design Studio</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setCurrentScreen(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${currentScreen === item.id ? 'bg-kks-accent/20 text-kks-gold border border-kks-accent/30' : 'text-kks-text hover:bg-kks-card'}`}>
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-kks-border space-y-3">
          <div className="text-xs text-kks-dim font-semibold uppercase tracking-wide">Backend Status</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-kks-text">ComfyUI</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${backendStatus.comfyui ? 'bg-kks-success animate-pulse' : 'bg-kks-danger'}`} />
              <span className={`text-xs ${backendStatus.comfyui ? 'text-kks-success' : 'text-kks-danger'}`}>{backendStatus.comfyui ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-kks-text">Caption Server</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${backendStatus.caption ? 'bg-kks-success' : 'bg-kks-danger'}`} />
              <span className={`text-xs ${backendStatus.caption ? 'text-kks-success' : 'text-kks-danger'}`}>{backendStatus.caption ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-kks-text mb-1 block">Model</label>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={!backendStatus.comfyui}
              className="w-full bg-kks-bg border border-kks-border rounded-lg px-2 py-1.5 text-xs text-kks-text focus:outline-none focus:border-kks-accent disabled:opacity-50">
              {availableModels.length > 0 ? availableModels.map(m => <option key={m} value={m}>{m}</option>) : <option>Demo Mode</option>}
            </select>
          </div>
          {!backendStatus.comfyui && (
            <div className="text-xs text-kks-warn bg-kks-warn/10 border border-kks-warn/20 rounded-lg p-2">
              Demo mode ဖြင့် လည်ပတ်နေပါသည်။ setup.bat နှင့် run.bat ဖြင့် အပြည့်အဝ အသုံးပြုနိုင်ပါသည်။
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {currentScreen === 'dashboard' && <DashboardScreen projects={projects} uploadedFiles={uploadedFiles} generatedContent={generatedContent} backendStatus={backendStatus} onNavigate={setCurrentScreen} />}
        {currentScreen === 'dataset' && <DatasetScreen uploadedFiles={uploadedFiles} autoCaptioning={autoCaptioning} onUpload={handleFileUpload} onAutoCaption={handleAutoCaption} onExport={handleExport} onDelete={id => setUploadedFiles(prev => prev.filter(f => f.id !== id))} fileInputRef={fileInputRef} />}
        {currentScreen === 'train' && <TrainScreen trainingMode={trainingMode} setTrainingMode={setTrainingMode} isTraining={isTraining} trainingProgress={trainingProgress} trainingLogs={trainingLogs} trainingMetrics={trainingMetrics} checkpoints={checkpoints} trainingConfig={trainingConfig} setTrainingConfig={setTrainingConfig} onStart={handleStartTraining} onStop={handleStopTraining} uploadedCount={uploadedFiles.length} />}
        {currentScreen === 'generate' && <GenerateScreen generationMode={generationMode} setGenerationMode={setGenerationMode} generationPrompt={generationPrompt} setGenerationPrompt={setGenerationPrompt} negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt} videoPrompt={videoPrompt} setVideoPrompt={setVideoPrompt} isGenerating={isGenerating} generatedContent={generatedContent} genSteps={genSteps} setGenSteps={setGenSteps} genCfg={genCfg} setGenCfg={setGenCfg} videoFrames={videoFrames} setVideoFrames={setVideoFrames} selectedModel={selectedModel} setSelectedModel={setSelectedModel} availableModels={availableModels} backendStatus={backendStatus} onGenerate={handleGenerate} referenceImage={referenceImage} onReferenceUpload={handleReferenceUpload} referenceFileInputRef={referenceFileInputRef} />}
        {currentScreen === 'chat' && <ChatScreen messages={chatMessages} input={chatInput} setInput={setChatInput} onSend={() => handleSendMessage()} isTyping={isAiTyping} chatEndRef={chatEndRef} />}
      </main>

      {notification && (
        <div className="fixed bottom-6 right-6 bg-kks-card border border-kks-accent/50 rounded-xl px-4 py-3 shadow-2xl z-50 animate-fade-in">
          <p className="text-sm text-kks-gold">{notification}</p>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
function DashboardScreen({ projects, uploadedFiles, generatedContent, backendStatus, onNavigate }: {
  projects: DbProject[]; uploadedFiles: UploadedFile[]; generatedContent: GeneratedContent[];
  backendStatus: { comfyui: boolean; caption: boolean }; onNavigate: (s: Screen) => void;
}) {
  const stats = [
    { label: 'Projects', value: projects.length, icon: Layers, color: 'text-kks-gold' },
    { label: 'Dataset ဖိုင်များ', value: uploadedFiles.length, icon: Database, color: 'text-blue-400' },
    { label: 'ဖန်တီးပြီး', value: generatedContent.length, icon: Sparkles, color: 'text-kks-success' },
    { label: 'Backend', value: backendStatus.comfyui ? 'Online' : 'Demo', icon: Cpu, color: backendStatus.comfyui ? 'text-kks-success' : 'text-kks-warn' },
  ];
  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-2">ပင်မစာမျက်နှာ</h2>
      <p className="text-kks-muted text-sm mb-6">AI training projects များကို စီမံခန့်ခွဲပါ</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-kks-card border border-kks-border rounded-xl p-5 hover:border-kks-accent/30 transition-colors">
            <s.icon className={`w-8 h-8 ${s.color} mb-3`} />
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-sm text-kks-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { screen: 'dataset' as Screen, icon: Database, title: 'Dataset ပြင်ဆင်ရန်', desc: 'ပုံများ upload လုပ်ပြီး BLIP ဖြင့် auto-caption လုပ်ပါ' },
          { screen: 'train' as Screen, icon: Sliders, title: 'Model သင်ကြားရန်', desc: 'Live metrics နှင့် checkpoints ဖြင့် fine-tune လုပ်ပါ' },
          { screen: 'generate' as Screen, icon: Sparkles, title: 'ဖန်တီးရန်', desc: 'ComfyUI ဖြင့် ပုံနှင့် ဗီဒီယို ဖန်တီးပါ' },
          { screen: 'chat' as Screen, icon: MessageSquare, title: 'AI လက်ထောက်', desc: 'Training နှင့် generate အကြောင်း မေးမြန်းပါ' },
        ].map(card => (
          <button key={card.screen} onClick={() => onNavigate(card.screen)} className="bg-kks-card border border-kks-border rounded-xl p-6 text-left hover:border-kks-accent/50 hover:bg-kks-panel transition-all group">
            <card.icon className="w-8 h-8 text-kks-gold mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white mb-1">{card.title}</h3>
            <p className="text-sm text-kks-muted">{card.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Dataset ───────────────────────────────────────────────────────────────
function DatasetScreen({ uploadedFiles, autoCaptioning, onUpload, onAutoCaption, onExport, onDelete, fileInputRef }: {
  uploadedFiles: UploadedFile[]; autoCaptioning: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAutoCaption: () => void; onExport: () => void; onDelete: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Dataset</h2>
          <p className="text-kks-muted text-sm mt-1">ပုံများ upload လုပ်ပြီး auto-caption ဖန်တီးပါ</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onAutoCaption} disabled={autoCaptioning || uploadedFiles.length === 0} className="flex items-center gap-2 px-4 py-2 bg-kks-accent/20 hover:bg-kks-accent/30 text-kks-gold rounded-lg transition-colors disabled:opacity-50 border border-kks-accent/30">
            {autoCaptioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Auto-Caption
          </button>
          <button onClick={onExport} disabled={uploadedFiles.length === 0} className="flex items-center gap-2 px-4 py-2 bg-kks-card hover:bg-kks-panel text-kks-text rounded-lg transition-colors disabled:opacity-50 border border-kks-border">
            <FileDown className="w-4 h-4" /> ထုတ်ယူရန်
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-kks-accent hover:bg-kks-gold text-white rounded-lg transition-colors font-medium">
            <Upload className="w-4 h-4" /> Upload
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onUpload} />
        </div>
      </div>
      {uploadedFiles.length === 0 ? (
        <div className="border-2 border-dashed border-kks-border rounded-xl p-16 text-center hover:border-kks-accent/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon className="w-16 h-16 text-kks-dim mx-auto mb-4" />
          <p className="text-kks-muted">ပုံ သို့မဟုတ် ဗီဒီယိုများ upload လုပ်ရန် နှိပ်ပါ</p>
          <p className="text-xs text-kks-dim mt-2">JPG, PNG, WEBP, MP4 ဖိုင်များ ပံ့ပိုးပါသည်</p>
        </div>
      ) : (
        <>
          <div className="text-sm text-kks-muted mb-4">{uploadedFiles.length} ဖိုင် ရှိပါသည်</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uploadedFiles.map(file => (
              <div key={file.id} className="bg-kks-card border border-kks-border rounded-xl overflow-hidden group animate-slide-up">
                <div className="relative aspect-square">
                  <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                  <button onClick={() => onDelete(file.id)} className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-kks-danger rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                  {file.fileType === 'video' && <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white">{file.duration}</div>}
                </div>
                <div className="p-3">
                  <p className="text-xs text-white truncate mb-1">{file.name}</p>
                  {file.caption ? <p className="text-xs text-kks-muted line-clamp-2">{file.caption}</p> : <p className="text-xs text-kks-dim italic">Caption မရှိပါ</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Train ──────────────────────────────────────────────────────────────────
function TrainScreen({ trainingMode, setTrainingMode, isTraining, trainingProgress, trainingLogs, trainingMetrics, checkpoints, trainingConfig, setTrainingConfig, onStart, onStop, uploadedCount }: {
  trainingMode: TrainingMode; setTrainingMode: (m: TrainingMode) => void; isTraining: boolean; trainingProgress: number;
  trainingLogs: TrainingLog[]; trainingMetrics: DbTrainingMetric[]; checkpoints: DbModelCheckpoint[];
  trainingConfig: TrainingConfig; setTrainingConfig: (c: TrainingConfig) => void;
  onStart: () => void; onStop: () => void; uploadedCount: number;
}) {
  const maxLoss = Math.max(...trainingMetrics.map(m => m.loss), 1);
  const minLoss = Math.min(...trainingMetrics.map(m => m.loss), 0);
  const lossRange = maxLoss - minLoss || 1;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-2">သင်ကြားရေး</h2>
      <p className="text-kks-muted text-sm mb-6">LoRA / AnimateDiff training simulation ဖြင့် model များ သင်ကြားပါ</p>

      <div className="flex gap-2 mb-6">
        {(['image', 'video'] as TrainingMode[]).map(mode => (
          <button key={mode} onClick={() => setTrainingMode(mode)} disabled={isTraining}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${trainingMode === mode ? 'bg-kks-accent text-white' : 'bg-kks-card text-kks-text hover:bg-kks-panel border border-kks-border'}`}>
            {mode === 'image' ? <ImageIcon className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            {mode === 'image' ? 'ပုံ (LoRA)' : 'ဗီဒီယို (AnimateDiff)'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config + controls */}
        <div className="space-y-4">
          <div className="bg-kks-card border border-kks-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Settings className="w-4 h-4 text-kks-gold" /> ဆက်တင်များ</h3>
            <div className="space-y-3">
              <ConfigField label="Learning Rate" value={trainingConfig.learningRate} onChange={v => setTrainingConfig({ ...trainingConfig, learningRate: v })} step={1e-7} />
              <ConfigField label="Steps" value={trainingConfig.steps} onChange={v => setTrainingConfig({ ...trainingConfig, steps: v })} step={100} int />
              <ConfigField label="Batch Size" value={trainingConfig.batchSize} onChange={v => setTrainingConfig({ ...trainingConfig, batchSize: v })} step={1} int />
              <ConfigField label="Resolution" value={trainingConfig.resolution} onChange={v => setTrainingConfig({ ...trainingConfig, resolution: v })} step={64} int />
              <ConfigField label="LoRA Rank" value={trainingConfig.loraRank} onChange={v => setTrainingConfig({ ...trainingConfig, loraRank: v })} step={4} int />
              <ConfigField label="Save အဆင့် (N ချိုး)" value={trainingConfig.saveEveryNSteps} onChange={v => setTrainingConfig({ ...trainingConfig, saveEveryNSteps: v })} step={50} int />
            </div>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm text-kks-text cursor-pointer">
                <input type="checkbox" checked={trainingConfig.gradientCheckpointing} onChange={e => setTrainingConfig({ ...trainingConfig, gradientCheckpointing: e.target.checked })} className="accent-kks-accent w-4 h-4" />
                Gradient Checkpointing
              </label>
              <div>
                <span className="text-sm text-kks-text">Mixed Precision</span>
                <select value={trainingConfig.mixedPrecision} onChange={e => setTrainingConfig({ ...trainingConfig, mixedPrecision: e.target.value as 'fp16' | 'fp32' | 'bf16' })} className="w-full mt-1 bg-kks-bg border border-kks-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-kks-accent">
                  <option value="fp16">fp16</option><option value="bf16">bf16</option><option value="fp32">fp32</option>
                </select>
              </div>
              <div>
                <span className="text-sm text-kks-text">Optimizer</span>
                <select value={trainingConfig.optimizer} onChange={e => setTrainingConfig({ ...trainingConfig, optimizer: e.target.value as 'adamw' | 'adam8bit' | 'sgd' })} className="w-full mt-1 bg-kks-bg border border-kks-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-kks-accent">
                  <option value="adamw">AdamW</option><option value="adam8bit">Adam 8-bit</option><option value="sgd">SGD</option>
                </select>
              </div>
            </div>
          </div>
          <div className="bg-kks-card border border-kks-border rounded-xl p-5">
            {isTraining ? (
              <button onClick={onStop} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-kks-danger hover:bg-red-700 text-white font-semibold rounded-lg transition-colors">
                <Square className="w-5 h-5" /> ရပ်နားရန်
              </button>
            ) : (
              <button onClick={onStart} disabled={uploadedCount === 0} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-kks-accent to-kks-gold hover:from-amber-700 hover:to-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
                <Play className="w-5 h-5" /> Training စတင်ရန်
              </button>
            )}
            {uploadedCount === 0 && <p className="text-xs text-kks-warn mt-2 text-center">Dataset ဖိုင်များ အရင် upload လုပ်ပါ</p>}
          </div>
        </div>

        {/* Loss chart + checkpoints */}
        <div className="space-y-4">
          <div className="bg-kks-card border border-kks-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-kks-gold" /> Loss Curve</h3>
            {trainingMetrics.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-kks-dim text-sm">Metrics များ မရှိသေးပါ</div>
            ) : (
              <svg viewBox="0 0 300 200" className="w-full h-48">
                <defs>
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d97706" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="50" x2="300" y2="50" stroke="#3d2e1a" strokeWidth="0.5" />
                <line x1="0" y1="100" x2="300" y2="100" stroke="#3d2e1a" strokeWidth="0.5" />
                <line x1="0" y1="150" x2="300" y2="150" stroke="#3d2e1a" strokeWidth="0.5" />
                <polyline fill="url(#lossGrad)" stroke="none"
                  points={`0,200 ${trainingMetrics.map((m, i) => { const x = (i / Math.max(trainingMetrics.length - 1, 1)) * 300; const y = 200 - ((m.loss - minLoss) / lossRange) * 180 - 10; return `${x},${y}`; }).join(' ')} 300,200`} />
                <polyline fill="none" stroke="#d97706" strokeWidth="2"
                  points={trainingMetrics.map((m, i) => { const x = (i / Math.max(trainingMetrics.length - 1, 1)) * 300; const y = 200 - ((m.loss - minLoss) / lossRange) * 180 - 10; return `${x},${y}`; }).join(' ')} />
                {trainingMetrics.filter(m => m.val_loss != null).map((m, i) => { const x = (i / Math.max(trainingMetrics.length - 1, 1)) * 300; const y = 200 - ((m.val_loss! - minLoss) / lossRange) * 180 - 10; return <circle key={i} cx={x} cy={y} r="2" fill="#10b981" />; })}
              </svg>
            )}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div><p className="text-xs text-kks-dim">လက်ရှိ</p><p className="text-sm text-kks-gold font-mono">{trainingMetrics.length > 0 ? trainingMetrics[trainingMetrics.length - 1].loss.toFixed(4) : '—'}</p></div>
              <div><p className="text-xs text-kks-dim">အကောင်းဆုံး</p><p className="text-sm text-kks-success font-mono">{trainingMetrics.length > 0 ? Math.min(...trainingMetrics.map(m => m.loss)).toFixed(4) : '—'}</p></div>
              <div><p className="text-xs text-kks-dim">အဆင့်</p><p className="text-sm text-white font-mono">{trainingMetrics.length}</p></div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-kks-accent" /><span className="text-kks-muted">Training Loss</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-kks-success" /><span className="text-kks-muted">Validation Loss</span></div>
            </div>
          </div>

          <div className="bg-kks-card border border-kks-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white">တိုးတက်မှု</span>
              <span className="text-sm text-kks-gold font-mono">{trainingProgress}%</span>
            </div>
            <div className="h-3 bg-kks-bg rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r from-kks-accent to-kks-gold rounded-full transition-all duration-300 ${isTraining ? 'progress-stripe' : ''}`} style={{ width: `${trainingProgress}%` }} />
            </div>
          </div>

          <div className="bg-kks-card border border-kks-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Save className="w-4 h-4 text-kks-gold" /> Checkpoints ({checkpoints.length})</h3>
            {checkpoints.length === 0 ? <p className="text-xs text-kks-dim">Checkpoint များ မရှိသေးပါ</p> : (
              <div className="space-y-2 max-h-48 overflow-auto">
                {checkpoints.map(c => (
                  <div key={c.id} className="flex items-center gap-2 p-2 bg-kks-bg rounded-lg">
                    {c.is_best ? <Award className="w-4 h-4 text-kks-gold flex-shrink-0" /> : c.is_final ? <CheckCircle2 className="w-4 h-4 text-kks-success flex-shrink-0" /> : <Save className="w-4 h-4 text-kks-muted flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{c.filename}</p>
                      <p className="text-xs text-kks-dim">Step {c.step} · Loss {c.loss.toFixed(4)} · {c.file_size_mb?.toFixed(0) ?? '?'}MB</p>
                    </div>
                    <button className="p-1.5 hover:bg-kks-panel rounded"><Download className="w-3.5 h-3.5 text-kks-muted" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="bg-kks-card border border-kks-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Terminal className="w-4 h-4 text-kks-gold" /> Training Logs</h3>
          <div className="space-y-1 max-h-96 overflow-auto font-mono text-xs">
            {trainingLogs.length === 0 ? <p className="text-kks-dim">Logs များ ဤနေရာတွင် ပြပါမယ်</p> : trainingLogs.map(log => (
              <div key={log.id} className="flex gap-2">
                <span className="text-kks-dim flex-shrink-0">[{log.timestamp?.toLocaleTimeString() || 'now'}]</span>
                <span className={log.type === 'success' ? 'text-kks-success' : log.type === 'error' ? 'text-kks-danger' : log.type === 'warning' ? 'text-kks-warn' : 'text-kks-text'}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigField({ label, value, onChange, step, int }: { label: string; value: number; onChange: (v: number) => void; step: number; int?: boolean }) {
  return (
    <div>
      <label className="text-sm text-kks-text">{label}</label>
      <input type="number" value={value} step={step} onChange={e => onChange(int ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)} className="w-full mt-1 bg-kks-bg border border-kks-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-kks-accent" />
    </div>
  );
}

// ─── Generate ────────────────────────────────────────────────────────────────
function GenerateScreen(props: {
  generationMode: GenerationMode; setGenerationMode: (m: GenerationMode) => void;
  generationPrompt: string; setGenerationPrompt: (s: string) => void;
  negativePrompt: string; setNegativePrompt: (s: string) => void;
  videoPrompt: string; setVideoPrompt: (s: string) => void;
  isGenerating: boolean; generatedContent: GeneratedContent[];
  genSteps: number; setGenSteps: (n: number) => void; genCfg: number; setGenCfg: (n: number) => void;
  videoFrames: number; setVideoFrames: (n: number) => void;
  selectedModel: string; setSelectedModel: (s: string) => void;
  availableModels: string[]; backendStatus: { comfyui: boolean; caption: boolean };
  onGenerate: () => void; referenceImage: string | null;
  onReferenceUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  referenceFileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const { generationMode, setGenerationMode, generationPrompt, setGenerationPrompt, negativePrompt, setNegativePrompt, videoPrompt, setVideoPrompt, isGenerating, generatedContent, genSteps, setGenSteps, genCfg, setGenCfg, videoFrames, setVideoFrames, selectedModel, setSelectedModel, availableModels, backendStatus, onGenerate, referenceImage, onReferenceUpload, referenceFileInputRef } = props;
  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-2">ဖန်တီးရေး</h2>
      <p className="text-kks-muted text-sm mb-6">Text-to-image နှင့် image-to-video ဖန်တီးပါ</p>
      <div className="flex gap-2 mb-6">
        {(['image', 'image-to-video'] as GenerationMode[]).map(mode => (
          <button key={mode} onClick={() => setGenerationMode(mode)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${generationMode === mode ? 'bg-kks-accent text-white' : 'bg-kks-card text-kks-text hover:bg-kks-panel border border-kks-border'}`}>
            {mode === 'image' ? <Sparkles className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            {mode === 'image' ? 'Text-to-Image' : 'Image-to-Video'}
          </button>
        ))}
      </div>

      {generationMode === 'image-to-video' && (
        <div className="bg-kks-card border border-kks-border rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">Reference ပုံ</h3>
          {referenceImage ? (
            <div className="relative inline-block">
              <img src={referenceImage} alt="Reference" className="w-32 h-32 object-cover rounded-lg" />
              <button onClick={() => setNegativePrompt('')} className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-kks-danger rounded"><X className="w-3 h-3 text-white" /></button>
            </div>
          ) : (
            <div onClick={() => referenceFileInputRef.current?.click()} className="border-2 border-dashed border-kks-border rounded-xl p-8 text-center cursor-pointer hover:border-kks-accent/50 transition-colors">
              <Upload className="w-8 h-8 text-kks-gold mx-auto mb-2" />
              <p className="text-sm text-kks-text">Reference ပုံ upload လုပ်ရန် နှိပ်ပါ</p>
            </div>
          )}
          <input ref={referenceFileInputRef} type="file" accept="image/*" className="hidden" onChange={onReferenceUpload} />
        </div>
      )}

      <div className="bg-kks-card border border-kks-border rounded-xl p-5 mb-6 space-y-4">
        <textarea value={generationMode === 'image' ? generationPrompt : videoPrompt} onChange={e => generationMode === 'image' ? setGenerationPrompt(e.target.value) : setVideoPrompt(e.target.value)} placeholder="Prompt ရိုက်ထည့်ပါ..." className="w-full bg-kks-bg border border-kks-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-kks-accent min-h-[80px]" />
        <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} placeholder="Negative prompt..." className="w-full bg-kks-bg border border-kks-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-kks-accent min-h-[40px]" />
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-kks-muted" />
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={!backendStatus.comfyui} className="bg-kks-bg border border-kks-border rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50">
              {availableModels.length > 0 ? availableModels.map(m => <option key={m} value={m}>{m}</option>) : <option>Demo Mode</option>}
            </select>
          </div>
          <div className="flex items-center gap-2"><span className="text-xs text-kks-dim">Steps:</span><input type="number" value={genSteps} onChange={e => setGenSteps(parseInt(e.target.value) || 25)} className="w-16 bg-kks-bg border border-kks-border rounded px-2 py-1 text-sm text-white text-center" /></div>
          <div className="flex items-center gap-2"><span className="text-xs text-kks-dim">CFG:</span><input type="number" value={genCfg} step={0.5} onChange={e => setGenCfg(parseFloat(e.target.value) || 7.5)} className="w-16 bg-kks-bg border border-kks-border rounded px-2 py-1 text-sm text-white text-center" /></div>
          {generationMode === 'image-to-video' && <div className="flex items-center gap-2"><span className="text-xs text-kks-dim">Frames:</span><input type="number" value={videoFrames} onChange={e => setVideoFrames(parseInt(e.target.value) || 16)} className="w-16 bg-kks-bg border border-kks-border rounded px-2 py-1 text-sm text-white text-center" /></div>}
          <button onClick={onGenerate} disabled={isGenerating || !generationPrompt.trim()} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-kks-accent to-kks-gold hover:from-amber-700 hover:to-amber-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 ml-auto">
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : generationMode === 'image' ? <Sparkles className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            {isGenerating ? 'ဖန်တီးနေပါသည်...' : 'ဖန်တီးရန်'}
          </button>
        </div>
      </div>

      {generatedContent.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {generatedContent.map(c => (
            <div key={c.id} className="bg-kks-card border border-kks-border rounded-xl overflow-hidden group animate-slide-up">
              <img src={c.preview} alt={c.prompt} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" />
              <div className="p-3"><p className="text-xs text-kks-muted truncate">{c.prompt}</p><p className="text-xs text-kks-dim">Seed: {c.seed}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chat ────────────────────────────────────────────────────────────────────
function ChatScreen({ messages, input, setInput, onSend, isTyping, chatEndRef }: {
  messages: ChatMessage[]; input: string; setInput: (s: string) => void; onSend: () => void; isTyping: boolean; chatEndRef: React.RefObject<HTMLDivElement>;
}) {
  const suggestions = ['Dataset ဘယ်လိုပြင်ဆင်ရမလဲ?', 'Training ဘယ်လိုလုပ်ရမလဲ?', 'GPU ဘယ်လောက်လိုမလဲ?'];
  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-white mb-2">AI လက်ထောက်</h2>
      <p className="text-kks-muted text-sm mb-4">Offline rule-based knowledge engine</p>
      <div className="flex-1 overflow-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center mt-8">
            <Bot className="w-12 h-12 text-kks-gold mx-auto mb-4" />
            <p className="text-kks-muted mb-4">Dataset၊ Training၊ Generate အကြောင်း မေးမြန်းပါ</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map(s => <button key={s} onClick={() => setInput(s)} className="px-3 py-1.5 bg-kks-card border border-kks-border rounded-full text-xs text-kks-text hover:border-kks-accent/50 transition-colors">{s}</button>)}
            </div>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-kks-accent' : 'bg-kks-card border border-kks-border'}`}>
              {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-kks-gold" />}
            </div>
            <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${m.role === 'user' ? 'bg-kks-accent text-white' : 'bg-kks-card border border-kks-border text-kks-text'}`}>
              <p className="text-sm leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
        {isTyping && <div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-kks-card border border-kks-border flex items-center justify-center"><Loader2 className="w-4 h-4 text-kks-gold animate-spin" /></div><div className="bg-kks-card border border-kks-border rounded-2xl px-4 py-2"><p className="text-sm text-kks-dim">ရိုက်နေပါသည်...</p></div></div>}
        <div ref={chatEndRef} />
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSend()} placeholder="မက်ဆေ့ခ်ျ ရိုက်ထည့်ပါ..." className="flex-1 bg-kks-card border border-kks-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-kks-accent" />
        <button onClick={onSend} className="px-4 py-3 bg-kks-accent hover:bg-kks-gold text-white rounded-lg transition-colors"><Send className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
