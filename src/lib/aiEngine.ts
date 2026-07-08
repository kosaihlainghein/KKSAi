// KKS AI Smart Trainer — Myanmar-language AI response engine
// Topic-classified knowledge base with intelligent keyword matching.

interface KnowledgeEntry {
  keywords: string[];
  responses: string[];
}

const knowledge: KnowledgeEntry[] = [
  // ── Dataset Preparation (Image) ─────────────────────────────────────────────
  {
    keywords: ['dataset', 'data', 'ဒေတာ', 'image upload', 'ပုံ', 'training image', 'training data', 'upload'],
    responses: [
      'Dataset ပြင်ဆင်ခြင်းသည် training မပြုလုပ်မီ အရေးကြီးဆုံး အဆင့်ဖြစ်သည်။ Dataset tab မှ ပုံများ upload လုပ်ပါ — အနည်းဆုံး ၂၀ မှ ၅၀ ပုံ ရှိသင့်သည်။ ပုံများသည် ကောင်းမွန်သော အရည်အသွေး (512×512 သို့မဟုတ် အထက်) ဖြင့် ရှိသင့်ပြီး subject ကို ထောင့်အမျိုးမျိုးမှ ရိုက်ကူးထားသင့်သည်။',
      'အကောင်းဆုံး dataset ရရှိရန် ပုံတစ်ပုံစီတွင် caption/tag ရေးရန် မမေ့ပါနှင့်။ Auto-Caption ခလုတ်ကို နှိပ်ပါက AI မှ အလိုအလျောက် caption ဖန်တီးပေးမည်ဖြစ်သည်။ Caption တွင် အရောင်၊ ပုံသဏ္ဍာန်၊ style နှင့် ပတ်ဝန်းကျင် ဖော်ပြချက်များ ထည့်သင့်သည်။',
      'Dataset tab တွင် Image Dataset နှင့် Video Dataset ဟု နှစ်မျိုး ရှိသည်။ Image training အတွက် JPG၊ PNG သို့မဟုတ် WEBP ဖိုင်များ upload လုပ်နိုင်သည်။ ပုံများ upload ပြီးနောက် Export Dataset ခလုတ်ဖြင့် ZIP ဖိုင်အဖြစ် export ထုတ်နိုင်သည်။',
    ],
  },

  // ── Dataset Preparation (Video) ──────────────────────────────────────────────
  {
    keywords: ['video dataset', 'video clip', 'ဗီဒီယို', 'clip', 'video upload', 'video training data'],
    responses: [
      'Video dataset အတွက် ၂ မှ ၄ စက္ကန့် ရှည်သော အတိုကောက် video clip များ upload လုပ်သင့်သည်။ MP4၊ MOV သို့မဟုတ် WEBM format များ support ပြုသည်။ Dataset tab တွင် "Video Dataset" ကို ရွေးချယ်ပြီး clip များ drag-and-drop ပြုလုပ်နိုင်သည်။',
      'Video training dataset တွင် frame rate တသမတ်တည်းနှင့် motion pattern တူညီသော clip များ ထည့်သင့်သည်။ ဥပမာ — camera pan, zoom, rotate တစ်မျိုးချင်းစီ training လုပ်သောအခါ တူညီသော motion style ရှိသည့် clip များသာ ထည့်ပါ။ Clip တစ်ခုစီ၏ caption တွင် motion ကို ဖော်ပြပါ (ဥပမာ — "slow zoom in, cinematic style").',
    ],
  },

  // ── Auto Caption ──────────────────────────────────────────────────────────────
  {
    keywords: ['caption', 'tag', 'auto caption', 'auto-caption', 'label', 'annotate'],
    responses: [
      'Auto-Caption ဆိုသည်မှာ AI (CLIP model) ကို အသုံးပြု၍ ပုံတစ်ပုံစီအတွက် ဖော်ပြချက် tags များ အလိုအလျောက် ဖန်တီးသော feature ဖြစ်သည်။ "Auto-Caption" ခလုတ် နှိပ်ပါက ဖိုင်အားလုံး caption ဖြစ်မည်ဖြစ်သည်။ ထို caption များကို လက်ဖြင့်လည်း တည်းဖြတ်နိုင်သည်။',
      'Caption များ ကောင်းမွန်မှသာ training result ကောင်းမည်ဖြစ်သည်။ ဥပမာ — "a photo of a person wearing red dress, outdoor garden, soft lighting, high quality, photorealistic" ဟု ဖော်ပြချက် အသေးစိတ် ရေးသားပြီး training ကို run ပါ။ Caption သည် training အတွင်း model မှ ပုံ၏ feature များကို ပိုမိုကောင်းမွန်စွာ သင်ယူနိုင်စေသည်။',
    ],
  },

  // ── LoRA Training ─────────────────────────────────────────────────────────────
  {
    keywords: ['lora', 'lo-ra', 'low rank', 'network rank', 'rank', 'alpha'],
    responses: [
      'LoRA (Low-Rank Adaptation) သည် full fine-tuning ထက် VRAM နည်းသော training method ဖြစ်သည်။ Network Rank (dimension) ကို 32 (lightweight) မှ 128 (high capacity) ထိ ရွေးနိုင်သည်။ Rank 64 သည် standard setting ဖြစ်ပြီး GPU 12GB+ ရှိပါက သုံးနိုင်သည်။',
      'Network Alpha သည် LoRA ၏ scaling factor ဖြစ်သည်။ Alpha ကို rank နှင့် တူညီသော value (ဥပမာ rank=64, alpha=64) ထားပါက 1.0 scaling ရပြီး rank ၏ တစ်ဝက် (alpha=32) ထားပါက 0.5 scaling ရသည်။ အများအားဖြင့် alpha ကို rank ၏ တစ်ဝက် မှ တူညီသော value ကြားတွင် ထားသည်။',
      'LoRA model ကို .safetensors format ဖြင့် save ပြီး ၁ မှ ၅ MB ခန့် ရှိတတ်သည်။ Full model (ckpt/safetensors 2-7GB) ၏ အနည်းငယ်မျှသာ ဖြစ်သောကြောင့် share ပြုနိုင်ရန် အဆင်ပြေသည်။ Stable Diffusion WebUI တွင် LoRA ကို Load ပြုနိုင်သည်။',
    ],
  },

  // ── DreamBooth ────────────────────────────────────────────────────────────────
  {
    keywords: ['dreambooth', 'dream booth', 'instance prompt', 'class prompt', 'sks', 'subject'],
    responses: [
      'DreamBooth training တွင် instance token (ဥပမာ "sks") ကို သုံးနိုင်သည်။ Instance prompt — "a photo of sks person" ဟု ရေးပြီး class prompt — "a photo of a person" ဟု ရေးပါ။ Model မှ "sks" token ကို သင်၏ specific subject နှင့် ချိတ်ဆက်မည်ဖြစ်သည်။',
      'DreamBooth method တွင် subject ၃ မှ ၂၀ ပုံ လောက်သာ လိုအပ်သည်။ LoRA ထက် ပုံနည်းနည်းဖြင့် training လုပ်နိုင်သောကြောင့် specific person, object, style ကို မြန်မြန်ဆန်ဆန် train ရန် သင့်တော်သည်။ Generation တွင် "sks person in a park" ဟု prompt ရေးပါက ၎င်း subject ကို ဖန်တီးပေးမည်ဖြစ်သည်။',
    ],
  },

  // ── Training Basics / Fine-tune ───────────────────────────────────────────────
  {
    keywords: ['training', 'train', 'fine-tune', 'finetune', 'fine tune', 'model training', 'start training', 'training စတင်'],
    responses: [
      'Training စတင်ရန် Training tab သို့ သွားပြီး base model path၊ batch size၊ epochs နှင့် learning rate ချိန်ညှိပါ။ "Start LoRA Training" ခလုတ် နှိပ်ပါက Training Console တွင် real-time log များ မြင်ရမည်ဖြစ်သည်။ GPU RTX 3060+ ရှိပါက training ကောင်းမွန်စွာ run သွားမည်ဖြစ်သည်။',
      'Training မပြုလုပ်မီ Dataset tab တွင် ပုံများ upload ပြီး caption ရေးထားရမည်ဖြစ်သည်။ Training tab တွင် Image Model (LoRA) နှင့် Video Model (AnimateDiff) ဟု ၂ မျိုး ရွေးချယ်နိုင်သည်။ Model type ရွေးချယ်ပြီးနောက် configuration ချိန်ညှိ၍ training run ပါ။',
      'Training ကောင်းမွန်ရန် ① ကောင်းသော dataset ② သင့်တော်သော learning rate ③ လုံလောက်သော epochs ④ GPU VRAM ၈GB+ ဤ လေးချက် အဓိက ကျသည်။ Training progress မှာ 0-100% console log တွင် မြင်ရမည်ဖြစ်ပြီး loss value ကျသွားသမျှ model ပိုကောင်းမည်ဖြစ်သည်။',
      'Training ကို "Stop Training" ခလုတ်ဖြင့် မည်သည့်အချိန်တွင်မဆို ရပ်တန့်နိုင်သည်။ Training ပြီးဆုံးသောအခါ model file ကို output folder သို့ save ပြီး Generate tab တွင် ထို model ကို သုံး၍ ပုံဖန်တီးနိုင်မည်ဖြစ်သည်။',
    ],
  },

  // ── Learning Rate ─────────────────────────────────────────────────────────────
  {
    keywords: ['learning rate', 'lr', '0.0001', 'learning', 'rate'],
    responses: [
      'Learning rate သည် training speed နှင့် quality ကို ထိန်းချုပ်သော အဓိက parameter ဖြစ်သည်။ Fine-tuning အတွက် 0.0001 (1e-4) မှ 0.00001 (1e-5) ကြားတွင် ထားသင့်သည်။ Rate မြင့်လွန်ပါက model overfitting ဖြစ်ပြီး မကောင်းသော result ရနိုင်သည်။',
      'LoRA training အတွက် learning rate 0.0001 သည် standard choice ဖြစ်သည်။ Dataset ပုံ ၅၀ ထက်များပါက 0.00005 ကို ထည့်စဉ်းစားပါ။ Learning rate too high → training unstable, loss oscillates; too low → training ကြာမြင့်သည်ပမာ model သေချာမလေ့လာနိုင်။',
      'Cosine with warmup learning rate scheduler သည် fine-tuning တွင် ကောင်းမွန်သော scheduler ဖြစ်သည်။ Training ၏ ပထမ ၁၀% တွင် learning rate မြင့်တက်ပြီး ကျန်ချိန်တွင် cosine curve အတိုင်း တဖြည်းဖြည်း ကျဆင်းသည်ဖြစ်ရာ training stable ဖြစ်မည်ဖြစ်သည်။',
    ],
  },

  // ── Batch Size ────────────────────────────────────────────────────────────────
  {
    keywords: ['batch size', 'batch', 'batch_size'],
    responses: [
      'Batch size ဆိုသည်မှာ training step တစ်ကြိမ်တွင် GPU မှ တပြိုင်နက် process ပြုသော ပုံ/frame အရေအတွက်ဖြစ်သည်။ Batch size = 1 → VRAM နည်းသုံးသည်ဖြင့် training ကြာ; Batch size = 8 → VRAM များသုံးပြီး training မြန်သည်။ RTX 3060 (12GB) → batch 2-4, RTX 4090 (24GB) → batch 8-16 သင့်သည်။',
      'GPU VRAM 12GB ရှိပါက Image training အတွက် batch size 4 သင့်ကန်ဖြစ်သည်။ VRAM 24GB ပါက 8 ထိ တိုးနိုင်သည်။ Video/AnimateDiff training တွင် frame များ memory ယူသောကြောင့် batch 1-2 သာ ထားသင့်သည်။ OOM (Out of Memory) error ဖြစ်ပါက batch size လျှော့ပါ။',
    ],
  },

  // ── Epochs ────────────────────────────────────────────────────────────────────
  {
    keywords: ['epoch', 'epochs', 'iteration', 'step'],
    responses: [
      'Epoch တစ်ကြိမ် ဆိုသည်မှာ dataset ရှိ ပုံ အားလုံးကို တစ်ကြိမ် ပြီးစီးစွာ training ပြုလုပ်ခြင်းဖြစ်သည်။ LoRA training အတွက် epoch ၃၀ မှ ၁၀၀ ကြားသင့်သည် — dataset ၅၀ ပုံ ရှိပါက epoch ၅၀ ကောင်းသည်; dataset ၂၀ ပုံ ရှိပါက epoch ၈၀-100 ထိ တိုးနိုင်သည်။',
      'Epochs ပေါ်များလွန်ပါက overfitting ဖြစ်နိုင်သည် — model မှ training ပုံများကို မှတ်ဉာဏ်သာ မှတ်ယူပြီး အသစ်သော subject/style ကို မထုတ်ဖန်တီးနိုင်တော့ဘဲ ဖြစ်နိုင်သည်။ Loss value ၀.၀၂ ထက် နည်းသွားပြီဖြစ်ပါ training ရပ်တန့်ပြီး result test ကြည့်သင့်သည်။',
    ],
  },

  // ── AnimateDiff / Video Model ─────────────────────────────────────────────────
  {
    keywords: ['animatediff', 'animate diff', 'video model', 'motion', 'temporal', 'animation', 'motion lora'],
    responses: [
      'AnimateDiff သည် Stable Diffusion ၏ image generation ကို video/animation generation သို့ တိုးချဲ့သော framework ဖြစ်သည်။ Motion module (mm_sd_v15.ckpt) ကို load ပြီး temporal attention layers ဖြင့် frame များကြား ဆက်နွှယ်မှုကို သင်ယူသည်။ Training tab တွင် "Video Model (AnimateDiff)" ကို ရွေးပြီး training run ပါ။',
      'AnimateDiff training configuration — batch size 1-2, epochs 20-30, learning rate 0.0001 သင့်သည်။ Dataset တွင် ၂ မှ ၄ စက္ကန့် video clip ၁၅၀+ ပါလျှင် ကောင်းမွန်သည်။ Training ပြီးနောက် Generate tab တွင် Image-to-Video mode ရွေးချယ်ပြီး reference image + motion prompt ဖြင့် video ဖန်တီးနိုင်မည်ဖြစ်သည်။',
      'Video model training သည် image training ထက် VRAM များ လိုအပ်သည်။ 16-frame video clip တစ်ခုသည် single image ထက် ၁၆ ဆ memory ယူနိုင်သည်။ RTX 4090 (24GB) ရှိပါ batch=2 ဖြင့် training ပြုနိုင်သည်; RTX 3060 (12GB) ရှိပါ batch=1 ဖြင့် gradient checkpointing enable ပြုပြီး training ပြုလုပ်ရမည်ဖြစ်သည်။',
    ],
  },

  // ── Image-to-Video Generation ─────────────────────────────────────────────────
  {
    keywords: ['image to video', 'image-to-video', 'i2v', 'video generation', 'generate video', 'ဗီဒီယိုဖန်တီး'],
    responses: [
      'Image-to-Video ဖန်တီးရန် Generate tab တွင် "Image-to-Video" mode ကို ရွေးချယ်ပါ။ Reference image upload ပြုပြီး motion prompt ရေးပါ (ဥပမာ "gentle camera pan from left to right, cinematic")။ Duration ၂ မှ ၈ စက္ကန့် ရွေးချယ်ပြီး Generate ခလုတ် နှိပ်ပါ။',
      'ကောင်းမွန်သော Image-to-Video result ရရှိရန် reference image ကောင်းမွန်ပြီး ရှင်းရှင်းလင်းလင်း ဖြစ်ရမည်ဖြစ်သည်။ Motion prompt တွင် movement direction ("zoom in", "pan left", "tilt up") နှင့် style ("slow motion", "cinematic", "smooth") ပြည့်ပြည့်ဝဝ ဖော်ပြပါ။ Frame ၁၆ ကို 4 seconds video ဖြင့် generate ပြုသောအခါ 24fps ဖြင့် render မည်ဖြစ်သည်။',
    ],
  },

  // ── Text-to-Image Generation ──────────────────────────────────────────────────
  {
    keywords: ['generate', 'generation', 'text to image', 't2i', 'ပုံဖန်တီး', 'image generation', 'prompt'],
    responses: [
      'Generate tab တွင် prompt ရေးပြီး trained model ရွေးချယ်ပါ။ Prompt တွင် subject, style, lighting, camera angle, quality keywords (8k, photorealistic, masterpiece) ထည့်ပါ။ Negative prompt တွင် "blurry, low quality, distorted, bad anatomy" ဟု ထည့်ပါ။',
      'ကောင်းသော prompt ရေးနည်း — ① Subject ② Style/Medium ③ Lighting ④ Environment ⑤ Quality tags ဤ ၅ ချက်ကို ပါဝင်စေပါ။ ဥပမာ — "a beautiful woman in traditional Myanmar dress, golden hour lighting, Shwedagon Pagoda background, DSLR photography, 8k resolution, highly detailed"',
      'Steps ၂၀ မှ ၃၀ ကြားတွင် ထားလျှင် quality နှင့် speed မျှတနေမည်ဖြစ်သည်။ CFG Scale ၇ မှ ၁၂ ကြားတွင် ထားသင့်သည် — မြင့်လေ prompt ကို အတိုင်းအတာ follow more လုပ်မည်ဖြစ်သောကြောင့်; နိမ့်လေ creative/loose result ရမည်ဖြစ်သည်။',
    ],
  },

  // ── GPU / VRAM ────────────────────────────────────────────────────────────────
  {
    keywords: ['gpu', 'vram', 'memory', 'nvidia', 'cuda', 'rtx', 'graphics card', 'graphic card', 'gpu memory'],
    responses: [
      'KKS AI Smart Trainer ကို အောင်မြင်စွာ run ရန် NVIDIA GPU CUDA support ရှိသည်ဖြစ်ရမည်ဖြစ်ပြီး VRAM ၈GB အနည်းဆုံး ရှိသင့်သည်။ RTX 3060 (12GB) → LoRA image training ကောင်း; RTX 3080/4080 (16GB+) → video training, batch size တိုးနိုင်; RTX 4090 (24GB) → full workflow အတွက် ideal ဖြစ်သည်။',
      'VRAM မလုံလောက်ပါ OOM error ဖြစ်တတ်သည်။ ဖြေရှင်းနည်း — ① Batch size လျှော့ (1 ထိ) ② Gradient checkpointing enable ③ Image resolution လျှော့ (512x512 သို့မဟုတ် 256x256) ④ Mixed precision (fp16) enable ပါ။ Sidebar ၏ GPU status widget တွင် VRAM usage real-time ကြည့်နိုင်သည်။',
      'CPU training သည် GPU training ထက် ၁၀ မှ ၁၀၀ ဆ ကြာနိုင်သည်ဖြစ်ရာ production use case တွင် မသင့်တော်ပါ။ Google Colab (Free T4 15GB) သို့မဟုတ် Kaggle (Free P100 16GB) ကဲ့သို့ cloud platform တွင်လည်း training ပြုနိုင်သည်။',
    ],
  },

  // ── CUDA Error / OOM / Troubleshooting ───────────────────────────────────────
  {
    keywords: ['error', 'oom', 'out of memory', 'cuda error', 'crash', 'failed', 'problem', 'issue', 'bug', 'ပြဿနာ', 'မဖြစ်', 'error ဖြစ်'],
    responses: [
      'CUDA Out of Memory (OOM) error ဖြစ်ပါ ① Batch size ကို 1 ထိ လျှော့ ② Gradient checkpointing on ③ Resolution 512x512 ④ fp16/bf16 mixed precision enable ⑤ Background process များ ပိတ် — ဤ ၅ ချက် ကြိုးစားကြည့်ပါ။',
      'Training loss NaN ဖြစ်ပါ learning rate မြင့်လွန်ဖြင့် ဖြစ်တတ်သည်။ Learning rate ကို ၁၀ ဆ လျှော့ (0.0001 → 0.00001) ပြီး training restart ပြုပါ။ Gradient clipping (max_norm=1.0) enable လုပ်ပါ။ Dataset တွင် corrupt ဖြစ်သော ပုံ (very small, transparent, extremely dark) ရှိပါ ဖယ်ထုတ်ပါ။',
      'Training ကြာမြင့်လွန်းသည်ဟု ထင်ပါက ① Dataset ပမာဏ စစ်ပါ (ပုံ ၅၀ > epoch ၅၀ = steps ၂၅၀၀ ကြာနိုင်) ② Batch size တိုးပါ ③ Shorter epoch run ပြီး sample ကြည့်ပါ ④ num_workers တိုးပြီး data loading မြန်ဆန်စေပါ။',
    ],
  },

  // ── Model Formats ─────────────────────────────────────────────────────────────
  {
    keywords: ['safetensors', 'ckpt', 'checkpoint', 'model file', 'model format', 'file format'],
    responses: [
      '.safetensors format သည် .ckpt ထက် ပိုမိုလုံခြုံပြီး load မြန်သည်ဖြစ်ရာ output model အတွက် .safetensors ကို ထားသင့်သည်။ .ckpt (pickle format) တွင် malicious code ပါဝင်နိုင်ချေ ရှိသောကြောင့် online မှ download ပြုသော .ckpt model များ use ပြုရာတွင် သတိထားသင့်သည်။',
      'LoRA output file သည် ၁ မှ ၁၀ MB ခန့် ရှိပြီး .safetensors format ဖြင့် save ပြုသည်။ FullModel (full fine-tune) output မှာ base model size နှင့် ထပ်တူ ၂ မှ ၇ GB ကြားဖြစ်နိုင်သည်ဖြစ်ရာ storage space စစ်ဆေးပါ။',
    ],
  },

  // ── Stable Diffusion / Base Model ────────────────────────────────────────────
  {
    keywords: ['stable diffusion', 'sd', 'sdxl', 'base model', 'checkpoint', 'sd 1.5', 'sd1.5'],
    responses: [
      'KKS AI Smart Trainer သည် Stable Diffusion 1.5 base model ကို ပင်မ model အဖြစ် use ပြုသည်။ Base model path ကို Training tab တွင် /models/ folder မှ ရွေးချယ်ပါ။ sd1.5-pruned.ckpt (2.1GB) သည် LoRA training အတွက် standard choice ဖြစ်သည်; SDXL (6GB) မှာ resolution မြင့် result ရသော်လည်း VRAM 16GB+ လိုအပ်သည်။',
      'SDXL base model ဖြင့် training ပြုသောအခါ resolution 1024x1024 ကို default ထားနိုင်ပြီး image quality မြင့်မားသည်ဖြစ်ကြောင်း ထင်ရသည်။ သို့သော် SDXL LoRA training မှာ SD1.5 ထက် VRAM ၂ ဆ ကြာနိုင်ဖြင့် GPU စစ်ဆေးပြီး run ပါ။',
    ],
  },

  // ── Prompting Tips ────────────────────────────────────────────────────────────
  {
    keywords: ['prompt', 'negative prompt', 'prompting', 'how to prompt', 'write prompt', 'keywords'],
    responses: [
      'ကောင်းသော prompt ၌ (1) subject — "a young woman" (2) style — "oil painting, impressionist" (3) setting — "in a forest" (4) lighting — "golden hour, soft rays" (5) quality — "8k, highly detailed, masterpiece" ဤ ၅ ပိုင်း ပါဝင်ပါ။ keyword တစ်ခုစီကို comma ဖြင့် ခြားပြီး importance သင်ချင်သော keyword ကို ( ) ဝင်ကွင်းဖြင့် boost ပြုနိုင်သည် — ဥပမာ (golden eyes:1.4)。',
      'Negative prompt မှာ မဖြစ်စေချင်သည်ကို ဖော်ပြသော prompt ဖြစ်သည်။ Standard negative — "blurry, low quality, pixelated, jpeg artifacts, bad anatomy, extra limbs, watermark, text, logo, cropped" ဟု ထည့်ပါ။ Realistic human generation အတွက် "deformed face, asymmetrical eyes, bad hands" လည်း ထည့်သင့်သည်။',
      'Prompt keyword အမျိုးမျိုးသော seed ဖြင့် generate ကြည့်ပြီး ကောင်းသော result ကို မှတ်ထားပါ။ CFG Scale 7.5 → balanced; CFG Scale 12-15 → prompt ကို ပိုသောမည်သည်; CFG Scale ၅ အောက် → creative/dreamy look ရမည်ဖြစ်သည်။',
    ],
  },

  // ── Scheduler / Sampler / Steps ───────────────────────────────────────────────
  {
    keywords: ['scheduler', 'sampler', 'dpm', 'euler', 'ddim', 'steps', 'inference steps', 'cfg'],
    responses: [
      'Sampler (scheduler) ကို image quality နှင့် speed ကိုမျှချင်ပါ DPM++ 2M Karras ကို ရွေးချယ်ပါ — steps ၂၅ ဖြင့် ကောင်းသော result ရနိုင်သည်။ DDIM sampler သည် deterministic ဖြစ်ပြီး same seed ဖြင့် generate သောအခါ တူညီသော result ကိုအမြဲ ရမည်ဖြစ်သည်။',
      'Inference steps ₂₀ → မြန်ပြီး quality မသိသာ; steps ₃₀ → balanced quality/speed; steps ₅₀+ → slightly better quality ဖြင့် ကြာသည်ဖြစ်ရာ steps ₂₅-₃₀ ကောင်းသည်။ CFG scale 7 → standard; 12+ → prompt strict follow ဖြင့် sometimes oversaturated; 3-5 → loose/artistic results ရနိုင်သည်။',
    ],
  },

  // ── Quality Issues ────────────────────────────────────────────────────────────
  {
    keywords: ['quality', 'bad result', 'blurry', 'distorted', 'wrong', 'not good', 'ugly', 'artifact'],
    responses: [
      'Generated image quality မကောင်းပါ ① Prompt တွင် "highly detailed, masterpiece, 8k, professional photography" ထည့်ပါ ② Negative prompt ပြည့်ဝစွာ ထည့်ပါ ③ CFG scale 7-8 ③ Steps ၂₅-₃₀ ④ LoRA model ကောင်းမွန်ပါက model ပြောင်းကြည့်ပါ ⑤ Sampler DPM++ 2M Karras သို့ ပြောင်းကြည့်ပါ',
      'Training result မကောင်းပါ ① Dataset ကောင်းမကောင်း စစ်ပါ (blurry/low-res ပုံ ဖယ်ပါ) ② Caption accuracy စစ်ပါ ③ Learning rate လျှော့ကြည့်ပါ ④ Epochs တိုးကြည့်ပါ ⑤ Rank 64→128 တိုးကြည့်ပါ — ဤ ၅ ချက် စစ်ဆေးပါ။',
    ],
  },

  // ── Loss / Training Loss ──────────────────────────────────────────────────────
  {
    keywords: ['loss', 'training loss', 'convergence'],
    responses: [
      'Training loss ကျသွားသမျှ model မှ dataset ကို ပိုမိုကောင်းမွန်စွာ သင်ယူနေသည်ဟု ဆိုနိုင်သည်။ LoRA training ၏ loss value 0.1 မှ စပြီး 0.01-0.02 ပတ်ဝန်းကျင်တွင် converge ဖြစ်သင့်သည်။ Loss 0.005 ထက် နည်းပါက overfitting ဖြစ်နေနိုင်ဖြင့် training ရပ်တန့်ပြီး result test ကြည့်ပါ။',
      'Loss oscillate (တက်ကျနေ) ပါ learning rate မြင့်လွန်ဖြင့် ဖြစ်တတ်သည် — LR ကို ၅ ဆ လျှော့ပြီး restart ပါ။ Loss ကျမသွားဘဲ plateau ဖြစ်ပါ LR warm-up မလုံလောက်ဖြင့် ဖြစ်တတ်ပြီး epochs တိုးကြည့်သင့်သည်',
    ],
  },

  // ── Project Management ────────────────────────────────────────────────────────
  {
    keywords: ['project', 'create project', 'new project', 'projects', 'manage', 'dashboard'],
    responses: [
      'Dashboard တွင် project အားလုံး မြင်ရမည်ဖြစ်သည်။ "Create New Project" ခလုတ် နှိပ်ပြီး project name နှင့် training type (Fine-tune, Dreambooth, Style Transfer, Image-to-Video) ရွေးချယ်ကာ project ဖန်တီးနိုင်သည်။ Project data များ Supabase database တွင် persist ဖြစ်ပြီး refresh ပြုသော်လည်း ဆက်ရှိနေမည်ဖြစ်သည်။',
      'Project status အမျိုးအစား ၃ ခု ရှိသည် — "Draft" (data မပြင်ဆင်ရသေး), "Training" (training run နေ), "Ready" (training ပြီး generate အသုံးပြုနိုင်)။ Project card ၏ training bar မှ progress ၀-၁၀၀% ကြည့်ရှုနိုင်သည်။',
    ],
  },

  // ── Export / Output ───────────────────────────────────────────────────────────
  {
    keywords: ['export', 'download', 'output', 'save', 'folder', 'output folder'],
    responses: [
      'Dataset export ပြုရန် Dataset tab တွင် ပုံများ caption ရေးပြီးနောက် "Export Dataset" ခလုတ် နှိပ်ပါ — /output/dataset.zip ဖြင့် save ပြုမည်ဖြစ်သည်။ Training output model သည် Training tab ၏ Output Folder field တွင် သတ်မှတ်ထားသော path (/output/models/) တွင် .safetensors ဖြင့် save ပြုမည်ဖြစ်သည်။',
      'Generated image/video များ download ပြုရန် gallery card ၏ hover overlay တွင် download icon ကို နှိပ်ပါ — seed number မှတ်ထားလျှင် ထို seed ဖြင့် တစ်ကြိမ် regenerate ပြုနိုင်မည်ဖြစ်သည်။ Copy icon မှ prompt ကို clipboard သို့ copy ပြုနိုင်သည်။',
    ],
  },

  // ── AI / Machine Learning General ────────────────────────────────────────────
  {
    keywords: ['ai', 'machine learning', 'ml', 'deep learning', 'neural network', 'diffusion', 'model', 'artificial intelligence'],
    responses: [
      'KKS AI Smart Trainer ကို Stable Diffusion model family ၏ LoRA fine-tuning နှင့် AnimateDiff video generation အတွက် design ပြုထားသည်။ AI image generation ၏ နောက်ကွယ်တွင် diffusion model technology ရှိပြီး ၎င်းသည် random noise မှ step-by-step သော image ဖန်တီးသော process ဖြစ်သည်။',
      'Generative AI models (Stable Diffusion, DALL-E, Midjourney) တို့သည် text prompt မှ image ဖန်တီးနိုင်ပြီး fine-tuning (LoRA, DreamBooth) ဖြင့် specific style/subject ကို custom model ထဲ ထည့်သွင်းနိုင်သည်။ KKS AI Smart Trainer သည် ဤ process ကို user-friendly interface ဖြင့် ပေးစွမ်းသည်။',
    ],
  },

  // ── Offline / Privacy ─────────────────────────────────────────────────────────
  {
    keywords: ['offline', 'privacy', 'data', 'secure', 'local', 'internet', 'connection'],
    responses: [
      'KKS AI Smart Trainer ၏ AI Assistant သည် local knowledge base ကို အသုံးပြုပြီး internet connection မလိုဘဲ run သည်ဖြစ်ရာ training data, ပုံများ နှင့် project information တစ်ခုမျှ external server သို့ မသွားပါ။ Chat history မှာ browser session ပြီးဆုံးသောအခါ clear ဖြစ်မည်ဖြစ်ပြီး Supabase local database တွင်သာ store ပြုသည်ဖြစ်ကြောင်း data privacy လုံခြုံပါသည်။',
    ],
  },

  // ── KKS / App Info ────────────────────────────────────────────────────────────
  {
    keywords: ['kks', 'app', 'application', 'software', 'smart trainer', 'feature', 'function'],
    responses: [
      'KKS AI Smart Trainer သည် AI model training workflow ကို ၅ tab ဖြင့် ဆောင်ရွက်နိုင်သည် — ① Dashboard (projects) ② Dataset (data preparation) ③ Training (run training) ④ Generate (ပုံ/ဗီဒီယိုဖန်တီး) ⑤ AI Assistant (ဤနေရာ)。LoRA image model နှင့် AnimateDiff video model နှစ်မျိုးလုံး support ပြုသည်။',
      'KKS AI Smart Trainer ၏ features — Image LoRA training, DreamBooth, AnimateDiff video training, Text-to-Image generation, Image-to-Video generation, Auto-caption, Dataset export, Training log monitoring, GPU VRAM tracking — ဤ features အားလုံး built-in ပါဝင်သည်။',
    ],
  },

  // ── Greetings / Small Talk ────────────────────────────────────────────────────
  {
    keywords: ['hello', 'hi', 'hey', 'မင်္ဂလာ', 'ဟဲလို', 'how are you', 'thanks', 'thank you', 'ကျေးဇူး'],
    responses: [
      'မင်္ဂလာပါ! ကျွန်ုပ်သည် KKS AI Assistant ဖြစ်ပါသည်။ AI training, dataset preparation, image/video generation နှင့် ပတ်သက်ပြီး မေးလိုသော မေးခွန်းများ ရှိပါက ဝမ်းမြောက်စွာ ဖြေပေးပါမည်ဖြစ်ပြီး — ဘာများ ကူညီပေးရပါမည်နည်း?',
      'ကျေးဇူးပြု၍ မေးမြန်းမှုအတွက် ကျေးဇူးတင်ပါသည်! Training configuration, dataset prep, generation tips — မည်သည့်ကိစ္စတွင်မဆို ကူညီပေးရန် အသင့်ရှိပါသည်။',
    ],
  },

  // ── General / Unknown ─────────────────────────────────────────────────────────
  {
    keywords: [],  // Fallback — no keywords, matches everything last
    responses: [
      'ကျွန်ုပ်မှ သင်၏ မေးခွန်းနှင့် ဆက်နွှယ်သော AI training, dataset, generation topics များကို အဓိက ကူညီနိုင်ပါသည်။ Training parameters, LoRA/AnimateDiff, image/video generation, GPU requirements, troubleshooting — ဤ topic တစ်ခုကို ပိုတိကျစွာ မေးမြန်းပါက အသေးစိတ် ဖြေကြားပေးနိုင်မည်ဖြစ်သည်။',
      'ဤမေးခွန်းနှင့် ပတ်သက်ပြီး ကျွန်ုပ်မြင်မြင်သာမသာ ဖြေနိုင်ရန် ကြိုးစားပါမည်။ KKS AI Smart Trainer ၏ dataset preparation, model training, image/video generation feature တစ်ခုခု ၌ help ရှာနေပါက ပိုသောတိကျသော မေးခွန်းဖြင့် မေးနိုင်ပါသည် — ဥပမာ "LoRA training ကို ဘယ်လို စတင်မည်?" သို့မဟုတ် "batch size ဘယ်လောက်ထားသင့်သနည်း?"',
      'ကျွန်ုပ်သည် AI model training specialist ဖြစ်ပြီး technical question များ — learning rate, batch size, epochs, VRAM, LoRA rank, AnimateDiff, Image-to-Video generation — တို့ကို Myanmar ဘာသာဖြင့် ဖြေကြားနိုင်ပါသည်။ သင်မေးလိုသော topic ကို တိကျစွာ ဖော်ပြပါ!',
      'ကျွန်ုပ် KKS AI Smart Trainer နှင့် ပတ်သက်ပြီး technical support ပေးနိုင်ပါသည်။ Dataset ပြင်ဆင်ခြင်းမှ training run ပြုလုပ်ခြင်း၊ generated result ၏ quality improve ပြုခြင်း — step-by-step ကူညီပေးနိုင်ပါသည်။ ဘာ help လိုပါသနည်း?',
    ],
  },
];

// Track which response indices have been used per topic to avoid repetition
const usedResponses = new Map<number, Set<number>>();

function pickResponse(topicIdx: number, responses: string[]): string {
  if (!usedResponses.has(topicIdx)) {
    usedResponses.set(topicIdx, new Set());
  }
  const used = usedResponses.get(topicIdx)!;

  // Reset if all responses used
  if (used.size >= responses.length) {
    used.clear();
  }

  let idx: number;
  do {
    idx = Math.floor(Math.random() * responses.length);
  } while (used.has(idx));

  used.add(idx);
  return responses[idx];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[?!.,;:'"]/g, ' ');
}

export function getAIResponse(userMessage: string): string {
  const msg = normalize(userMessage);
  const words = msg.split(/\s+/);

  // Score each topic by how many keywords match
  let bestScore = 0;
  let bestTopicIdx = knowledge.length - 1; // fallback

  for (let i = 0; i < knowledge.length - 1; i++) {
    const entry = knowledge[i];
    let score = 0;
    for (const kw of entry.keywords) {
      if (msg.includes(kw.toLowerCase())) {
        // Longer keyword matches score higher
        score += kw.split(' ').length * 2;
      }
    }
    // Also check word-level partial matches
    for (const word of words) {
      if (word.length > 2) {
        for (const kw of entry.keywords) {
          if (kw.toLowerCase().startsWith(word) || word.startsWith(kw.toLowerCase())) {
            score += 1;
          }
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopicIdx = i;
    }
  }

  return pickResponse(bestTopicIdx, knowledge[bestTopicIdx].responses);
}

// Simulate realistic typing delay based on response length
export function getTypingDelay(response: string): number {
  const baseDelay = 800;
  const charDelay = Math.min(response.length * 8, 1800);
  return baseDelay + charDelay + Math.random() * 400;
}
