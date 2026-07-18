// AI assistant engine — rule-based responses for the KKS AI Smart Trainer.
// Provides helpful guidance about dataset preparation, training, and generation.

interface AIResponse {
  text: string;
}

const KNOWLEDGE_BASE: Array<{ keywords: string[]; response: string }> = [
  {
    keywords: ['dataset', 'upload', 'image', 'caption'],
    response:
      'Dataset ပြင်ဆင်ခြင်း: ပုံတွေကို upload လုပ်ပြီး auto-caption နဲ့ tag တွေ ထည့်ပါ။ ပုံအရေအတွက် အနည်းဆုံး 20-50 ခု လိုအပ်ပါတယ်။ ပုံတွေက ကွဲပြားပြီး ကောင်းမွန်တဲ့ quality ဖြစ်ရပါမယ်။',
  },
  {
    keywords: ['train', 'training', 'fine-tune', 'dreambooth'],
    response:
      'Training လုပ်ခြင်း: ပုံ model အတွက် Dreambooth သုံးပါ။ Learning rate 1e-6၊ steps 1000-2000 အထိ သင့်တင့်ပါတယ်။ VRAM အရ ပြောင်းလဲနိုင်ပါတယ်။ Training အတွင်း loss curve ကို စောင့်ကြည့်ပါ။',
  },
  {
    keywords: ['video', 'animate', 'motion'],
    response:
      'Video training အတွက် AnimateDiff သုံးပါ။ ပုံတစ်ပုံကနေ video ဖန်တီးနိုင်ပြီး motion module ထည့်ပါ။ Frames 16-32 အတွင်း သင့်တင့်ပါတယ်။',
  },
  {
    keywords: ['generate', 'prompt', 'negative'],
    response:
      'Generate လုပ်ခြင်း: Prompt တွေ ရှင်းလင်းပါ။ Negative prompt တွေ ထည့်ပြီး မလိုတဲ့ အရာတွေ ဖယ်ပါ။ Steps 25-30၊ CFG 7-8 သင့်တင့်ပါတယ်။',
  },
  {
    keywords: ['gpu', 'vram', 'memory', 'cuda'],
    response:
      'GPU/VRAM: RTX 3060 (12GB) နဲ့ အထက် အကြံပြုပါတယ်။ VRAM မလုံလောက်ရင် batch size လျှော့ပါ၊ xformers သုံးပါ၊ fp16 သုံးပါ။',
  },
  {
    keywords: ['comfyui', 'backend', 'setup', 'install'],
    response:
      'ComfyUI setup: setup.bat ကို run ပါ။ Python 3.11၊ PyTorch CUDA၊ SD 1.5 model နဲ့ AnimateDiff ကို အလိုလို download လုပ်ပါမယ်။ run.bat နဲ့ စတင်ပါမယ်။',
  },
];

const FALLBACK_RESPONSES = [
  'ဒီ theme အကြောင်း ပိုပြီး မေးပါ။ Dataset၊ Training၊ Generate အကြောင်း ကူညီပေးနိုင်ပါတယ်။',
  'ပုံတွေ upload လုပ်ပြီး training စတင်နိုင်ပါပြီ။ ဘယ်အဆင့်က စလို့လဲ?',
  'KKS AI Smart Trainer ကို သုံးပြီး offline မှာ AI model တွေ train လုပ်နိုင်ပါတယ်။',
  'မေးခွန်း ပိုရှင်းပြောပြပါ။ Dataset၊ Training၊ Generation အကြောင်း ဖြစ်နိုင်ပါတယ်။',
];

export function getAIResponse(userInput: string): AIResponse {
  const input = userInput.toLowerCase();

  for (const entry of KNOWLEDGE_BASE) {
    if (entry.keywords.some((kw) => input.includes(kw))) {
      return { text: entry.response };
    }
  }

  return { text: FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)] };
}

export function getTypingDelay(text: string): number {
  return Math.min(Math.max(text.length * 15, 400), 1500);
}
