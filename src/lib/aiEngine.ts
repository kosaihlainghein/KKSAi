interface AIResponse { text: string; }

const KNOWLEDGE_BASE: Array<{ keywords: string[]; response: string }> = [
  {
    keywords: ['dataset', 'upload', 'ပုံ', 'ဖိုင်', 'caption', 'ကာပ်ရှင်'],
    response: 'Dataset ပြင်ဆင်ခြင်း - ပုံများကို upload လုပ်ပြီး auto-caption ဖြင့် tag များ ထည့်ပါ။ ပုံအရေအတွက် အနည်းဆုံး ၂၀-၅၀ ခန့် လိုအပ်ပါသည်။ ပုံများသည် ကွဲပြားပြီး ကောင်းမွန်သော quality ဖြစ်ရပါမယ်။',
  },
  {
    keywords: ['train', 'training', 'fine-tune', 'dreambooth', 'သင်ကြား', 'train လုပ်'],
    response: 'Training လုပ်ခြင်း - ပုံ model အတွက် Dreambooth သုံးပါ။ Learning rate 1e-6၊ steps 1000-2000 အထိ သင့်တင့်ပါသည်။ VRAM အရ ပြောင်းလဲနိုင်ပါသည်။ Training အတွင်း loss curve ကို စောင့်ကြည့်ပါ။',
  },
  {
    keywords: ['video', 'animate', 'motion', 'ဗီဒီယို', 'animate'],
    response: 'Video training အတွက် AnimateDiff သုံးပါ။ ပုံတစ်ပုံမှ video ဖန်တီးနိုင်ပြီး motion module ထည့်ပါ။ Frames 16-32 အတွင်း သင့်တင့်ပါသည်။',
  },
  {
    keywords: ['generate', 'prompt', 'negative', 'ဖန်တီး', 'generate လုပ်'],
    response: 'Generate လုပ်ခြင်း - Prompt များ ရှင်းလင်းစွာ ရေးပါ။ Negative prompt ထည့်ပြီး မလိုသော အရာများကို ဖယ်ပါ။ Steps 25-30၊ CFG 7-8 သင့်တင့်ပါသည်။',
  },
  {
    keywords: ['gpu', 'vram', 'memory', 'cuda', 'ဂီပီယူ'],
    response: 'GPU/VRAM - RTX 3060 (12GB) နှင့် အထက် အကြံပြုပါသည်။ VRAM မလုံလောက်ပါက batch size လျှော့ပါ၊ xformers သုံးပါ၊ fp16 သုံးပါ။',
  },
  {
    keywords: ['comfyui', 'backend', 'setup', 'install', 'setup', 'install လုပ်'],
    response: 'ComfyUI setup - setup.bat ကို run ပါ။ Python 3.11၊ PyTorch CUDA၊ SD 1.5 model နှင့် AnimateDiff ကို အလိုလို download လုပ်ပါမယ်။ run.bat ဖြင့် စတင်ပါမယ်။',
  },
  {
    keywords: ['checkpoint', 'model', 'save', 'checkpoint', 'မော်ဒယ်'],
    response: 'Checkpoints - Training အတွင်း သိမ်းဆည်းထားသော model များကို Download လုပ်နိုင်ပါသည်။ Best checkpoint နှင့် Final checkpoint ကို အထူး မှတ်သားပြထားပါသည်။',
  },
  {
    keywords: ['loss', 'curve', 'chart', 'metric', 'loss'],
    response: 'Loss Curve - Training အတွင်း loss တန်ဖိုး ကျဆင်းနေသည်က ကောင်းသော လက္ခဏာဖြစ်ပါသည်။ Validation loss နှင့် training loss ကြား ကွဲလွာလျှင် overfitting ဖြစ်နိုင်ပါသည်။',
  },
  {
    keywords: ['lora', 'rank', 'lora'],
    response: 'LoRA Rank - Rank မြင့်လျှင် model တွင် ပိုမို သင်ယူနိုင်သော parameter များ ရှိပါသည်။ Rank 16-64 အတွင်း သင့်တင့်ပါသည်။ Rank မြင့်လျှင် VRAM ပိုလိုပါသည်။',
  },
  {
    keywords: ['resolution', 'size', 'အရွယ်', 'resolution'],
    response: 'Resolution - Training resolution သည် generate လုပ်မယ့် ပုံအရွယ်အစားနှင့် တူရပါသည်။ 512x512 သည် စံနှုန်းဖြစ်ပြီး 768x768 သုံးလျှင် ပိုမို ကောင်းမွန်ပါသည်။',
  },
];

const FALLBACK_RESPONSES = [
  'ဒီအကြောင်းအရာကို ပိုပြီး မေးပါ။ Dataset၊ Training၊ Generate အကြောင်း ကူညီပေးနိုင်ပါသည်။',
  'ပုံများ upload လုပ်ပြီး training စတင်နိုင်ပါပြီ။ ဘယ်အဆင့်က စလို့လဲ?',
  'KKS AI Design Studio ကို သုံးပြီး offline မှာ AI model များ train လုပ်နိုင်ပါသည်။',
  'မေးခွန်း ပိုရှင်းပြောပြပါ။ Dataset၊ Training၊ Generation အကြောင်း ဖြစ်နိုင်ပါသည်။',
];

export function getAIResponse(userInput: string): AIResponse {
  const input = userInput.toLowerCase();
  for (const entry of KNOWLEDGE_BASE) {
    if (entry.keywords.some(kw => input.includes(kw))) return { text: entry.response };
  }
  return { text: FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)] };
}

export function getTypingDelay(text: string): number {
  return Math.min(Math.max(text.length * 15, 400), 1500);
}
