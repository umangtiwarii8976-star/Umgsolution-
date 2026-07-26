import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Film, Upload, Lock, Unlock, Play, LogOut, Search, Trash2, CheckCircle2,
  Clock, User, Settings, CreditCard, Download, X, Menu, Bell, ShieldCheck,
  ChevronRight, Scissors, Sparkles, Eye, EyeOff, Users as UsersIcon,
  LayoutGrid, Mail, ArrowRight, Loader2, AlertTriangle, Check, Award, Clock3
} from "lucide-react";

/* ---------------------------------------------------------------
   UMGSOLUTION — demo build notes (not shown in UI):
   - Google / Facebook sign-in are simulated (no real OAuth backend).
   - Razorpay checkout is a faithful visual simulation, not a live charge.
   - "Database" is in-memory React state for this session only.
   These are wired so the ENTIRE flow — upload, admin edit, lock,
   pay, unlock — is genuinely interactive inside this one session.
------------------------------------------------------------------*/

const FONT_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

.font-display { font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
.font-body { font-family: 'Space Grotesk', sans-serif; }
.font-mono { font-family: 'JetBrains Mono', monospace; }

/* Force visible text on all form controls — browsers don't always
   inherit color into inputs/selects/textareas by default, which was
   making typed text invisible on the dark background. */
html { color-scheme: dark; }
input, textarea, select, option {
  color: #F2F4F5 !important;
  background-color: transparent;
}
input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.32) !important; opacity: 1; }
select option { background-color: #111318; color: #F2F4F5; }
input:-webkit-autofill, textarea:-webkit-autofill {
  -webkit-text-fill-color: #F2F4F5 !important;
  transition: background-color 9999s ease-in-out 0s;
}

@keyframes sweep {
  0% { transform: translateX(-8%); }
  50% { transform: translateX(108%); }
  100% { transform: translateX(-8%); }
}
@keyframes rise {
  0%,100% { transform: scaleY(0.25); }
  50% { transform: scaleY(1); }
}
@keyframes glow {
  0%,100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeUp { animation: fadeUp 0.5s ease both; }
.playhead-sweep { animation: sweep 5s ease-in-out infinite; }
.bar-rise { animation: rise 1.1s ease-in-out infinite; transform-origin: bottom; }
.dot-glow { animation: glow 1.6s ease-in-out infinite; }

.reel-track { background-image: radial-gradient(circle, rgba(255,255,255,0.14) 1.4px, transparent 1.4px); background-size: 10px 10px; }

body { background: #000; }
.umg-page {
  background:
    radial-gradient(ellipse 900px 500px at 15% -10%, rgba(34,211,181,0.07), transparent 60%),
    radial-gradient(ellipse 700px 500px at 100% 20%, rgba(34,211,181,0.04), transparent 55%),
    #000000;
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #000000; }
::-webkit-scrollbar-thumb { background: #2A2E34; border-radius: 8px; }

@media (prefers-reduced-motion: reduce) {
  .playhead-sweep, .bar-rise, .dot-glow, .animate-fadeUp { animation: none !important; }
}
`;

const PANEL = "bg-[#111318]/90 backdrop-blur-xl border border-white/[0.08]";
const ACCENT_TEAL = "#22D3B5";
const ACCENT_AMBER = "#F5A623";
const ACCENT_RED = "#FF4747";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function genCaptcha() {
  const a = Math.floor(Math.random() * 40) + 5;
  const b = Math.floor(Math.random() * 20) + 1;
  const op = Math.random() > 0.5 ? "+" : "-";
  const answer = op === "+" ? a + b : a - b;
  return { question: `${a} ${op} ${b} = ?`, answer };
}

const seedRequests = () => ([
  {
    id: uid(),
    clientName: "Rohan Mehta",
    clientEmail: "rohan.mehta@gmail.com",
    title: "Wedding Sangeet Highlights",
    instructions: "Cut to 3 minutes, add beat-synced transitions, subtitle the speeches.",
    clips: [{ name: "sangeet_cam1.mp4", url: null }, { name: "sangeet_cam2.mp4", url: null }],
    createdAt: Date.now() - 86400000 * 3,
    status: "Completed",
    editedVideo: { name: "sangeet_final_edit.mp4", url: null },
    price: 100,
    paymentStatus: "Unpaid",
  },
  {
    id: uid(),
    clientName: "Priya Nair",
    clientEmail: "priya.nair@gmail.com",
    title: "Product Launch Reel",
    instructions: "Instagram 9:16, add captions, upbeat trending audio.",
    clips: [{ name: "launch_raw.mov", url: null }],
    createdAt: Date.now() - 86400000 * 1.2,
    status: "Editing",
    editedVideo: null,
    price: 100,
    paymentStatus: "Unpaid",
  },
]);

const seedUsers = () => ([
  { id: uid(), name: "Rohan Mehta", email: "rohan.mehta@gmail.com", provider: "Google", joined: Date.now() - 86400000 * 40, blocked: false },
  { id: uid(), name: "Priya Nair", email: "priya.nair@gmail.com", provider: "Facebook", joined: Date.now() - 86400000 * 12, blocked: false },
]);

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTimecode(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

/* ---------------- Reusable bits ---------------- */

function Logo({ size = "text-xl" }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="relative w-8 h-8 rounded-md bg-gradient-to-br from-[#22D3B5] to-[#0E9C86] flex items-center justify-center shadow-[0_0_18px_rgba(34,211,181,0.35)]">
        <Scissors size={16} className="text-black" strokeWidth={2.5} />
      </div>
      <span className={`font-display font-bold ${size} text-white tracking-wider`}>UMG<span className="text-[#22D3B5]">SOLUTION</span></span>
    </div>
  );
}

function StatusReel({ status }) {
  const stages = ["Pending", "Editing", "Completed"];
  const idx = stages.indexOf(status);
  const color = status === "Completed" ? ACCENT_TEAL : status === "Editing" ? ACCENT_AMBER : "#8B9198";
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5 font-mono text-[10px] tracking-wide text-white/40">
        <span>REEL://STATUS</span>
        <span style={{ color }}>{fmtTimecode(Date.now())}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-[#000000] border border-white/[0.08] reel-track overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${((idx + 1) / 3) * 100}%`, background: `linear-gradient(90deg, ${color}55, ${color})` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-black transition-all duration-700 dot-glow"
          style={{ left: `calc(${((idx + 1) / 3) * 100}% - 6px)`, background: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        {stages.map((s, i) => (
          <span key={s} className={`font-mono text-[10px] uppercase tracking-wider ${i <= idx ? "text-white/80" : "text-white/25"}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[80] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={`${PANEL} rounded-xl p-3.5 flex items-start gap-3 shadow-2xl animate-fadeUp`}>
          <div className="mt-0.5 shrink-0">
            {t.type === "success" ? <CheckCircle2 size={18} className="text-[#22D3B5]" /> : <Bell size={18} className="text-[#F5A623]" />}
          </div>
          <p className="font-body text-sm text-white/85 flex-1">{t.msg}</p>
          <button onClick={() => onDismiss(t.id)} className="text-white/40 hover:text-white shrink-0">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Modal({ open, onClose, children, maxW = "max-w-md" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`relative w-full ${maxW} ${PANEL} rounded-2xl p-6 shadow-2xl animate-fadeUp max-h-[90vh] overflow-y-auto`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

function VideoThumb({ url, name }) {
  const ref = useRef(null);
  if (!url) {
    return (
      <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-[#161A1F] to-[#000000] border border-white/[0.08] flex flex-col items-center justify-center gap-1.5">
        <Film size={22} className="text-white/25" />
        <span className="font-mono text-[10px] text-white/30">no preview</span>
      </div>
    );
  }
  return (
    <video
      ref={ref}
      src={url}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => { try { e.target.currentTime = Math.min(1, e.target.duration / 2); } catch (_) {} }}
      className="w-full aspect-video rounded-lg object-cover bg-black border border-white/[0.08]"
    />
  );
}

function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/911234567890?text=Hi%20UMGSOLUTION%2C%20I%20need%20help%20with%20my%20video%20edit"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 group"
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366]/50 animate-ping" />
      <span className="relative flex w-14 h-14 rounded-full bg-[#25D366] items-center justify-center shadow-[0_6px_24px_rgba(37,211,102,0.45)] group-hover:scale-105 transition-transform">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.45 1.33 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.5 0 9.96-4.46 9.96-9.96C22 6.46 17.54 2 12.04 2zm5.87 14.24c-.25.7-1.44 1.34-1.99 1.42-.51.08-1.15.11-1.86-.12-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07s.76-2.18 1.03-2.48c.27-.3.59-.37.78-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.25.6.84 2.07.91 2.22.07.15.12.33.02.53-.1.2-.15.32-.3.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.3.76 1.25 1.63 2.02 1.12 1 2.06 1.31 2.36 1.46.3.15.48.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.66-.15.27.1 1.7.8 1.99.95.3.15.49.22.56.35.08.13.08.71-.17 1.41z"/></svg>
      </span>
    </a>
  );
}

/* ---------------- Razorpay-style payment modal ---------------- */

function PaymentModal({ open, amount, onClose, onSuccess }) {
  const [stage, setStage] = useState("form"); // form | processing | success
  useEffect(() => { if (open) setStage("form"); }, [open]);

  const pay = () => {
    setStage("processing");
    setTimeout(() => {
      setStage("success");
      setTimeout(() => onSuccess(), 900);
    }, 1600);
  };

  return (
    <Modal open={open} onClose={onClose} maxW="max-w-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded bg-[#0A2540] flex items-center justify-center">
          <CreditCard size={14} className="text-[#22D3B5]" />
        </div>
        <span className="font-display text-sm tracking-wider text-white/70 uppercase">Razorpay Checkout</span>
      </div>

      {stage === "form" && (
        <div className="space-y-4 font-body">
          <div>
            <p className="text-white/50 text-xs mb-1">Amount payable</p>
            <p className="text-3xl font-semibold text-white">₹{amount.toFixed(2)}</p>
          </div>
          <div className="space-y-2.5">
            <input placeholder="Card number" defaultValue="4111 1111 1111 1111" className="w-full bg-[#000000] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 outline-none focus:border-[#22D3B5]" />
            <div className="flex gap-2.5">
              <input placeholder="MM/YY" defaultValue="12/29" className="w-1/2 bg-[#000000] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 outline-none focus:border-[#22D3B5]" />
              <input placeholder="CVV" defaultValue="123" className="w-1/2 bg-[#000000] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 outline-none focus:border-[#22D3B5]" />
            </div>
          </div>
          <button onClick={pay} className="w-full py-3 rounded-lg bg-[#22D3B5] hover:bg-[#1cb89e] text-black font-semibold text-sm transition-colors">
            Pay ₹{amount.toFixed(2)}
          </button>
          <p className="text-center text-[11px] text-white/30">Secured &amp; encrypted demo checkout</p>
        </div>
      )}

      {stage === "processing" && (
        <div className="py-10 flex flex-col items-center gap-4">
          <Loader2 size={30} className="text-[#22D3B5] animate-spin" />
          <p className="font-body text-sm text-white/60">Verifying payment…</p>
        </div>
      )}

      {stage === "success" && (
        <div className="py-10 flex flex-col items-center gap-3">
          <CheckCircle2 size={36} className="text-[#22D3B5]" />
          <p className="font-body text-sm text-white/80">Payment successful</p>
          <p className="font-mono text-[11px] text-white/30">Unlocking download…</p>
        </div>
      )}
    </Modal>
  );
}

/* =========================================================================
   LANDING PAGE
========================================================================= */

function Landing({ goto }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const bars = Array.from({ length: 28 });

  return (
    <div className="min-h-screen umg-page text-white font-body">
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#000000]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8 font-body text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="hidden md:block">
            <button onClick={() => goto("login")} className="px-5 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
              Sign in
            </button>
          </div>
          <button className="md:hidden text-white/70" onClick={() => setMenuOpen(v => !v)}>
            <Menu size={22} />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden px-5 pb-4 flex flex-col gap-3 font-body text-sm text-white/70">
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <button onClick={() => goto("login")} className="mt-1 px-5 py-2 rounded-lg bg-white text-black text-sm font-semibold text-left">Sign in</button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <header className="max-w-6xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
        <div className="animate-fadeUp">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 text-[11px] font-mono text-[#22D3B5] mb-6 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22D3B5] dot-glow" /> Now editing worldwide
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] mb-6">
            Send us the footage.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22D3B5] to-[#7FE8D4]">We cut the story.</span>
          </h1>
          <p className="text-white/55 text-base md:text-lg mb-8 max-w-md">
            Upload raw clips, describe the edit you want, and a professional editor takes it from there.
            Track progress on a real timeline — pay only when it's ready to download.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => goto("login")} className="group px-6 py-3.5 rounded-lg bg-[#22D3B5] text-black font-semibold text-sm flex items-center gap-2 hover:bg-[#1cb89e] transition-colors">
              Start an edit <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <a href="#how" className="px-6 py-3.5 rounded-lg border border-white/15 text-sm font-semibold text-white/80 hover:border-white/30 transition-colors">
              See how it works
            </a>
          </div>
        </div>

        {/* Signature: live timeline / waveform monitor */}
        <div className="relative animate-fadeUp" style={{ animationDelay: "120ms" }}>
          <div className={`${PANEL} rounded-2xl p-5 shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[11px] text-white/40 uppercase tracking-wider">Timeline — sangeet_final_edit.mp4</span>
              <span className="font-mono text-[11px] text-[#22D3B5]">00:02:41:12</span>
            </div>
            <div className="aspect-video rounded-lg bg-gradient-to-br from-[#161A1F] to-black border border-white/[0.08] mb-4 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 reel-track" />
              <Play size={40} className="text-white/70 fill-white/70" />
              <div className="absolute bottom-3 left-3 right-3 h-1 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-[#22D3B5] playhead-sweep rounded-full" />
              </div>
            </div>
            <div className="flex items-end gap-[3px] h-12 mb-4">
              {bars.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-[#22D3B5] to-[#7FE8D4] bar-rise"
                  style={{ height: `${30 + Math.abs(Math.sin(i)) * 70}%`, animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
            <StatusReel status="Editing" />
          </div>
          <div className="absolute -z-10 -top-8 -right-8 w-40 h-40 bg-[#22D3B5]/20 blur-3xl rounded-full" />
        </div>
      </header>

      {/* Impact stats band */}
      <section className="relative border-t border-white/[0.08] bg-gradient-to-r from-[#0B0E13] via-[#0E1420] to-[#0B0E13]">
        <div className="max-w-6xl mx-auto px-5 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { icon: Film, value: "1,200+", label: "Videos edited" },
            { icon: UsersIcon, value: "480+", label: "Happy clients" },
            { icon: Award, value: "98%", label: "Satisfaction rate" },
            { icon: Clock3, value: "24hr", label: "Avg. turnaround" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-2">
              <s.icon size={26} className="text-white/35" strokeWidth={1.6} />
              <p className="font-display text-3xl md:text-4xl font-bold text-[#F5A623]">{s.value}</p>
              <p className="text-white/45 text-xs uppercase tracking-wider font-mono">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-16 border-t border-white/[0.06]">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#22D3B5] mb-2">Features</p>
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-10">Everything between upload and download</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon: Upload, title: "Multi-clip upload", desc: "Drop MP4, MOV or AVI files straight from your camera roll or camera card." },
            { icon: Sparkles, title: "Editing brief", desc: "Tell your editor the cut, pace and style you're after in plain language." },
            { icon: Clock, title: "Live status", desc: "Watch your request move from Pending to Editing to Completed in real time." },
            { icon: Eye, title: "Preview first", desc: "Screen a thumbnail of the finished edit before you pay a rupee." },
            { icon: Lock, title: "Pay-to-unlock", desc: "The download stays locked until your ₹100 edit fee clears securely." },
            { icon: Bell, title: "Instant notice", desc: "Get notified the moment your edit is marked complete." },
          ].map((f, i) => (
            <div key={i} className={`${PANEL} rounded-xl p-5 hover:border-[#22D3B5]/30 transition-colors`}>
              <f.icon size={20} className="text-[#22D3B5] mb-3" />
              <h3 className="font-display font-semibold text-base mb-1.5">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works - genuine sequence, numbering earns its keep */}
      <section id="how" className="max-w-6xl mx-auto px-5 py-16 border-t border-white/[0.06]">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#22D3B5] mb-2">Process</p>
        <h2 className="font-display text-2xl md:text-3xl font-semibold mb-10">Four cuts to your finished video</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            ["01", "Upload", "Send your raw clips with a title and editing instructions."],
            ["02", "We edit", "A professional editor cuts your footage to brief."],
            ["03", "Preview", "See a locked preview once the edit is done."],
            ["04", "Unlock", "Pay ₹100 and download your finished video instantly."],
          ].map(([n, t, d]) => (
            <div key={n} className="relative pl-0">
              <span className="font-display text-4xl font-bold text-white/10">{n}</span>
              <h3 className="font-display font-semibold text-lg mt-1 mb-1.5">{t}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-5 py-16 border-t border-white/[0.06]">
        <div className={`${PANEL} rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6`}>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#22D3B5] mb-2">Simple pricing</p>
            <h2 className="font-display text-2xl md:text-3xl font-semibold mb-2">₹100 per edited video</h2>
            <p className="text-white/50 text-sm max-w-md">Pay only after you've previewed the finished edit. No subscriptions, no hidden fees.</p>
          </div>
          <button onClick={() => goto("login")} className="px-7 py-3.5 rounded-lg bg-[#22D3B5] text-black font-semibold text-sm whitespace-nowrap hover:bg-[#1cb89e] transition-colors">
            Get started
          </button>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] mt-8">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="text-base" />
          <p className="text-white/35 text-xs font-mono text-center">
            © 2026 UMGSOLUTION | Developed by UMGSOLUTION
          </p>
          {/* Hidden admin entry point — intentionally not a nav item */}
          <button
            aria-label=""
            onClick={() => goto("adminLogin")}
            className="w-1.5 h-1.5 rounded-full bg-white/[0.08] hover:bg-white/20 transition-colors"
            tabIndex={-1}
          />
        </div>
      </footer>
      <WhatsAppButton />
    </div>
  );
}

/* =========================================================================
   LOGIN (Google / Facebook only)
========================================================================= */

function Login({ goto, onLogin }) {
  const [loading, setLoading] = useState(null);

  const handleLogin = (provider) => {
    setLoading(provider);
    setTimeout(() => {
      const identity = provider === "Google"
        ? { name: "Guest User", email: "guest.user@gmail.com" }
        : { name: "Guest User", email: "guest.user@facebook.com" };
      onLogin({ ...identity, provider, id: uid() });
      setLoading(null);
    }, 1100);
  };

  return (
    <div className="min-h-screen umg-page text-white font-body flex items-center justify-center px-5 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#22D3B5]/10 blur-3xl rounded-full" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#22D3B5]/10 blur-3xl rounded-full" />
      <button onClick={() => goto("landing")} className="absolute top-6 left-5 text-white/40 hover:text-white text-sm flex items-center gap-1.5">
        <ChevronRight size={14} className="rotate-180" /> Back
      </button>

      <div className={`${PANEL} rounded-2xl p-8 w-full max-w-sm animate-fadeUp`}>
        <div className="flex justify-center mb-6"><Logo /></div>
        <h1 className="font-display text-xl font-semibold text-center mb-1">Welcome back</h1>
        <p className="text-white/45 text-sm text-center mb-7">Sign in to upload footage and track your edits.</p>

        <div className="space-y-3">
          <button
            onClick={() => handleLogin("Google")}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-white text-[#1a1a1a] font-semibold text-sm hover:bg-white/90 transition-colors disabled:opacity-60"
          >
            {loading === "Google" ? <Loader2 size={16} className="animate-spin" /> : (
              <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.7 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3c-7.7 0-14.3 4.4-17.7 10.8z"/><path fill="#4CAF50" d="M24 45c5.4 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 35.8 26.9 36.7 24 36.7c-5.4 0-9.9-3.4-11.5-8.1l-6.6 5.1C9.6 40.5 16.3 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 3-3.1 5.5-6.7 7l6.5 5.5C39 37.4 43 31.5 43 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
            )}
            Continue with Google
          </button>
          <button
            onClick={() => handleLogin("Facebook")}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-[#1877F2] text-white font-semibold text-sm hover:bg-[#1465d1] transition-colors disabled:opacity-60"
          >
            {loading === "Facebook" ? <Loader2 size={16} className="animate-spin" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7C18.3 21.1 22 17 22 12z"/></svg>
            )}
            Continue with Facebook
          </button>
        </div>
        <p className="text-white/25 text-[11px] text-center mt-6 leading-relaxed">
          By continuing you agree to UMGSOLUTION's Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );
}

/* =========================================================================
   USER DASHBOARD
========================================================================= */

function UserDashboard({ user, requests, setRequests, goto, notify }) {
  const [tab, setTab] = useState("new");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [clips, setClips] = useState([]);
  const [payTarget, setPayTarget] = useState(null);
  const fileRef = useRef(null);

  const myRequests = requests.filter(r => r.clientEmail === user.email).sort((a,b) => b.createdAt - a.createdAt);

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => /\.(mp4|mov|avi)$/i.test(f.name));
    const withUrls = valid.map(f => ({ name: f.name, url: URL.createObjectURL(f) }));
    setClips(prev => [...prev, ...withUrls]);
  };

  const submit = () => {
    if (!title.trim() || clips.length === 0) return;
    const req = {
      id: uid(),
      clientName: user.name,
      clientEmail: user.email,
      title: title.trim(),
      instructions: instructions.trim(),
      clips,
      createdAt: Date.now(),
      status: "Pending",
      editedVideo: null,
      price: 100,
      paymentStatus: "Unpaid",
    };
    setRequests(prev => [req, ...prev]);
    setTitle(""); setInstructions(""); setClips([]);
    notify("success", "Editing request submitted. We'll get started shortly.");
    setTab("requests");
  };

  const unlockDownload = (reqId) => {
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, paymentStatus: "Paid" } : r));
    notify("success", "Payment confirmed — download unlocked.");
  };

  const completedUnseen = myRequests.filter(r => r.status === "Completed" && !r.seen);
  const dismissSeen = (id) => setRequests(prev => prev.map(r => r.id === id ? { ...r, seen: true } : r));

  return (
    <div className="min-h-screen umg-page text-white font-body">
      <nav className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#000000]/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <Logo size="text-lg" />
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 text-sm text-white/60">
              <div className="relative w-8 h-8 rounded-full bg-[#22D3B5]/15 border border-[#22D3B5]/40 flex items-center justify-center">
                <User size={15} className="text-[#22D3B5]" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#000000] border border-[#22D3B5]/40 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22D3B5]" />
                </span>
              </div>
              <div className="leading-tight">
                <p className="text-white/85">{user.name}</p>
                <p className="text-[10px] text-white/35 font-mono">via {user.provider}</p>
              </div>
            </div>
            <button onClick={() => goto("landing")} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
              <LogOut size={15} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 py-8">
        {completedUnseen.length > 0 && (
          <div className={`${PANEL} rounded-xl p-4 mb-6 flex items-start gap-3 border-[#22D3B5]/30 animate-fadeUp`}>
            <Bell size={18} className="text-[#22D3B5] mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-white/85 font-medium">
                {completedUnseen.length === 1 ? `"${completedUnseen[0].title}" is ready to preview.` : `${completedUnseen.length} edits are ready to preview.`}
              </p>
              <p className="text-white/40 text-xs mt-0.5">Scroll to Your requests to view and unlock the download.</p>
            </div>
            <button onClick={() => completedUnseen.forEach(r => dismissSeen(r.id))} className="text-white/40 hover:text-white shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex gap-2 mb-8 border-b border-white/[0.06]">
          {[["new", "New request"], ["requests", `Your requests (${myRequests.length})`]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-1 pb-3 text-sm font-medium relative ${tab === k ? "text-white" : "text-white/40 hover:text-white/70"}`}
            >
              {l}
              {tab === k && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-[#22D3B5] rounded-full" />}
            </button>
          ))}
        </div>

        {tab === "new" && (
          <div className={`${PANEL} rounded-2xl p-6 max-w-2xl animate-fadeUp`}>
            <h2 className="font-display text-lg font-semibold mb-5">Submit new footage</h2>
            <label className="block text-xs font-mono uppercase tracking-wider text-white/40 mb-2">Title</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Birthday party highlight reel"
              className="w-full bg-[#000000] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm mb-5 outline-none focus:border-[#22D3B5]"
            />
            <label className="block text-xs font-mono uppercase tracking-wider text-white/40 mb-2">Editing instructions</label>
            <textarea
              value={instructions} onChange={e => setInstructions(e.target.value)}
              placeholder="Describe pacing, music, subtitles, length, style…"
              rows={4}
              className="w-full bg-[#000000] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm mb-5 outline-none focus:border-[#22D3B5] resize-none"
            />
            <label className="block text-xs font-mono uppercase tracking-wider text-white/40 mb-2">Clips (MP4, MOV, AVI)</label>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-white/15 hover:border-[#22D3B5]/50 rounded-lg py-8 flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors mb-4"
            >
              <Upload size={22} />
              <span className="text-sm">Click to select video files</span>
            </button>
            <input ref={fileRef} type="file" accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo" multiple hidden onChange={onFiles} />
            {clips.length > 0 && (
              <div className="space-y-2 mb-6">
                {clips.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#000000] border border-white/[0.08] rounded-lg px-3.5 py-2.5">
                    <span className="text-sm text-white/70 flex items-center gap-2 truncate"><Film size={14} className="text-[#22D3B5] shrink-0" /> {c.name}</span>
                    <button onClick={() => setClips(clips.filter((_, j) => j !== i))} className="text-white/30 hover:text-[#FF4747]"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={submit}
              disabled={!title.trim() || clips.length === 0}
              className="w-full py-3 rounded-lg bg-[#22D3B5] text-black font-semibold text-sm hover:bg-[#1cb89e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Submit editing request
            </button>
          </div>
        )}

        {tab === "requests" && (
          <div className="space-y-4">
            {myRequests.length === 0 && (
              <div className={`${PANEL} rounded-2xl p-10 text-center`}>
                <Film size={28} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/50 text-sm">No requests yet — submit your first clip to get started.</p>
              </div>
            )}
            {myRequests.map(r => (
              <div key={r.id} className={`${PANEL} rounded-2xl p-5 md:p-6 animate-fadeUp`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-display font-semibold text-base mb-1">{r.title}</h3>
                    <p className="text-white/40 text-xs font-mono">Submitted {fmtDate(r.createdAt)} · {r.clips.length} clip{r.clips.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="w-full md:w-56 shrink-0"><StatusReel status={r.status} /></div>
                </div>

                {r.status === "Completed" && r.editedVideo && (
                  <div className="grid md:grid-cols-[220px_1fr] gap-4 mt-4 pt-4 border-t border-white/[0.06]">
                    <VideoThumb url={r.editedVideo.url} name={r.editedVideo.name} />
                    <div className="flex flex-col justify-between gap-3">
                      <div>
                        <p className="text-sm text-white/70 font-medium mb-1">{r.editedVideo.name}</p>
                        {r.paymentStatus !== "Paid" ? (
                          <div className="flex items-center gap-1.5 text-[#F5A623] text-sm">
                            <Lock size={14} /> Please pay ₹{r.price} to unlock your download.
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[#22D3B5] text-sm">
                            <Unlock size={14} /> Download unlocked
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        {r.paymentStatus !== "Paid" ? (
                          <button onClick={() => setPayTarget(r)} className="px-5 py-2.5 rounded-lg bg-[#F5A623] text-black text-sm font-semibold hover:bg-[#e0951a] transition-colors flex items-center gap-2">
                            <CreditCard size={15} /> Pay ₹{r.price}
                          </button>
                        ) : (
                          <a
                            href={r.editedVideo.url || "#"} download={r.editedVideo.name}
                            className="px-5 py-2.5 rounded-lg bg-[#22D3B5] text-black text-sm font-semibold hover:bg-[#1cb89e] transition-colors flex items-center gap-2"
                          >
                            <Download size={15} /> Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <PaymentModal
        open={!!payTarget}
        amount={payTarget?.price || 100}
        onClose={() => setPayTarget(null)}
        onSuccess={() => { unlockDownload(payTarget.id); setPayTarget(null); }}
      />

      <footer className="border-t border-white/[0.06] mt-10 py-6 text-center text-white/30 text-xs font-mono">
        © 2026 UMGSOLUTION | Developed by UMGSOLUTION
      </footer>
      <WhatsAppButton />
    </div>
  );
}

/* =========================================================================
   ADMIN LOGIN
========================================================================= */

function AdminLogin({ goto, onAuth }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [captcha, setCaptcha] = useState(genCaptcha());
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (username !== "Umang.890" || password !== "Umang2010") {
      setError("Incorrect username or password.");
      setCaptcha(genCaptcha()); setAnswer("");
      return;
    }
    if (Number(answer) !== captcha.answer) {
      setError("Security check failed — try the new question.");
      setCaptcha(genCaptcha()); setAnswer("");
      return;
    }
    setError("");
    onAuth();
  };

  return (
    <div className="min-h-screen umg-page text-white font-body flex items-center justify-center px-5">
      <div className={`${PANEL} rounded-2xl p-8 w-full max-w-sm animate-fadeUp`}>
        <div className="flex items-center gap-2.5 mb-1">
          <ShieldCheck size={20} className="text-[#22D3B5]" />
          <h1 className="font-display text-lg font-semibold">Admin access</h1>
        </div>
        <p className="text-white/40 text-xs mb-6">Restricted area · UMGSOLUTION staff only</p>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-white/40 mb-1.5">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-[#000000] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#22D3B5]" />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-white/40 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#000000] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#22D3B5] pr-10" />
              <button onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-white/40 mb-1.5">Security check: {captcha.question}</label>
            <input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your answer" className="w-full bg-[#000000] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#22D3B5]" />
          </div>
          {error && <p className="text-[#FF4747] text-xs flex items-center gap-1.5"><AlertTriangle size={13} /> {error}</p>}
          <button onClick={submit} className="w-full py-3 rounded-lg bg-[#22D3B5] text-black font-semibold text-sm hover:bg-[#1cb89e] transition-colors">
            Log in
          </button>
          <button onClick={() => goto("landing")} className="w-full text-center text-white/30 hover:text-white/60 text-xs mt-1">
            Back to site
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ADMIN DASHBOARD
========================================================================= */

function AdminDashboard({ requests, setRequests, users, setUsers, goto, notify, settings, setSettings }) {
  const [section, setSection] = useState("orders");
  const [search, setSearch] = useState("");
  const [detailReq, setDetailReq] = useState(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const editFileRef = useRef(null);

  const filtered = requests.filter(r =>
    r.clientName.toLowerCase().includes(search.toLowerCase()) ||
    r.clientEmail.toLowerCase().includes(search.toLowerCase()) ||
    r.title.toLowerCase().includes(search.toLowerCase())
  ).sort((a,b) => b.createdAt - a.createdAt);

  const setStatus = (id, status) => setRequests(prev => prev.map(r => r.id === id ? { ...r, status, seen: status === "Completed" ? false : r.seen } : r));
  const setPrice = (id, price) => setRequests(prev => prev.map(r => r.id === id ? { ...r, price } : r));
  const deleteReq = (id) => { setRequests(prev => prev.filter(r => r.id !== id)); notify("info", "Order deleted."); };

  const downloadOriginal = (clip) => {
    if (!clip.url) { notify("info", `${clip.name} is sample data — no file attached in this demo.`); return; }
    const a = document.createElement("a"); a.href = clip.url; a.download = clip.name; a.click();
  };

  const onEditedFile = (e) => {
    const f = e.target.files?.[0];
    if (!f || !uploadTarget) return;
    const url = URL.createObjectURL(f);
    setRequests(prev => prev.map(r => r.id === uploadTarget.id
      ? { ...r, editedVideo: { name: f.name, url }, status: "Completed", seen: false, paymentStatus: "Unpaid" }
      : r));
    notify("success", `Edited video uploaded for "${uploadTarget.title}".`);
    setUploadTarget(null);
  };

  const totalRevenue = requests.filter(r => r.paymentStatus === "Paid").reduce((s, r) => s + r.price, 0);

  const navItems = [
    ["orders", "Orders", LayoutGrid],
    ["clients", "Clients", Search],
    ["users", "Manage users", UsersIcon],
    ["settings", "Website settings", Settings],
  ];

  return (
    <div className="min-h-screen umg-page text-white font-body flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className={`${PANEL} md:w-60 md:min-h-screen border-b md:border-b-0 md:border-r border-white/[0.08] p-5 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible`}>
        <div className="hidden md:flex items-center gap-2 mb-6">
          <ShieldCheck size={18} className="text-[#22D3B5]" />
          <span className="font-display text-sm tracking-wider">ADMIN PANEL</span>
        </div>
        {navItems.map(([k, l, Icon]) => (
          <button
            key={k} onClick={() => setSection(k)}
            className={`shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${section === k ? "bg-[#22D3B5]/15 text-[#22D3B5]" : "text-white/55 hover:bg-white/5 hover:text-white"}`}
          >
            <Icon size={16} /> {l}
          </button>
        ))}
        <button onClick={() => goto("landing")} className="shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-white/45 hover:bg-white/5 hover:text-[#FF4747] transition-colors md:mt-auto">
          <LogOut size={16} /> Logout
        </button>
      </aside>

      <main className="flex-1 p-5 md:p-8 max-w-6xl">
        {section === "orders" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="font-display text-xl font-semibold">Orders</h1>
                <p className="text-white/40 text-sm">{requests.length} total · ₹{totalRevenue} collected</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients, titles…" className="w-full bg-[#000000] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#22D3B5]" />
              </div>
            </div>

            <div className="space-y-3">
              {filtered.map(r => (
                <div key={r.id} className={`${PANEL} rounded-xl p-4 md:p-5`}>
                  <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <div className="min-w-0 cursor-pointer" onClick={() => setDetailReq(r)}>
                      <p className="font-medium text-sm truncate hover:text-[#22D3B5] transition-colors">{r.title}</p>
                      <p className="text-white/40 text-xs font-mono mt-0.5">{r.clientName} · {r.clientEmail}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <select
                        value={r.status}
                        onChange={e => setStatus(r.id, e.target.value)}
                        className="bg-[#000000] border border-white/10 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-[#22D3B5]"
                      >
                        {["Pending", "Editing", "Completed"].map(s => <option key={s}>{s}</option>)}
                      </select>

                      <div className="flex items-center gap-1 bg-[#000000] border border-white/10 rounded-lg px-2 py-2">
                        <span className="text-xs text-white/40">₹</span>
                        <input
                          type="number" value={r.price}
                          onChange={e => setPrice(r.id, Number(e.target.value) || 0)}
                          className="w-14 bg-transparent text-xs outline-none"
                        />
                      </div>

                      <span className={`text-[11px] px-2.5 py-1.5 rounded-full font-mono ${r.paymentStatus === "Paid" ? "bg-[#22D3B5]/15 text-[#22D3B5]" : "bg-[#F5A623]/15 text-[#F5A623]"}`}>
                        {r.paymentStatus}
                      </span>

                      <button onClick={() => setUploadTarget(r)} className="p-2 rounded-lg bg-white/5 hover:bg-[#22D3B5]/15 hover:text-[#22D3B5] transition-colors" title="Upload edited video">
                        <Upload size={15} />
                      </button>
                      <button onClick={() => r.clips[0] && downloadOriginal(r.clips[0])} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" title="Download original">
                        <Download size={15} />
                      </button>
                      <button onClick={() => deleteReq(r.id)} className="p-2 rounded-lg bg-white/5 hover:bg-[#FF4747]/15 hover:text-[#FF4747] transition-colors" title="Delete order">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-white/30 text-sm text-center py-10">No matching orders.</p>}
            </div>
          </>
        )}

        {section === "clients" && (
          <>
            <h1 className="font-display text-xl font-semibold mb-1">Clients</h1>
            <p className="text-white/40 text-sm mb-6">Everyone who has submitted an editing request.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[...new Map(requests.map(r => [r.clientEmail, r])).values()].map(r => {
                const count = requests.filter(x => x.clientEmail === r.clientEmail).length;
                const paid = requests.filter(x => x.clientEmail === r.clientEmail && x.paymentStatus === "Paid").length;
                return (
                  <div key={r.clientEmail} className={`${PANEL} rounded-xl p-4 flex items-center gap-3`}>
                    <div className="w-10 h-10 rounded-full bg-[#22D3B5]/15 border border-[#22D3B5]/30 flex items-center justify-center font-display text-sm text-[#22D3B5] shrink-0">
                      {r.clientName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.clientName}</p>
                      <p className="text-white/40 text-xs truncate">{r.clientEmail}</p>
                      <p className="text-white/30 text-[11px] font-mono mt-0.5">{count} order{count !== 1 ? "s" : ""} · {paid} paid</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {section === "users" && (
          <>
            <h1 className="font-display text-xl font-semibold mb-1">Manage users</h1>
            <p className="text-white/40 text-sm mb-6">Registered accounts (Google &amp; Facebook sign-ins).</p>
            <div className="space-y-2.5">
              {users.map(u => (
                <div key={u.id} className={`${PANEL} rounded-xl p-4 flex items-center justify-between gap-4`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center font-display text-xs shrink-0">{u.name[0]}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-white/40 text-xs truncate">{u.email} · via {u.provider} · joined {fmtDate(u.joined)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, blocked: !x.blocked } : x))}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors ${u.blocked ? "bg-[#FF4747]/15 text-[#FF4747]" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                  >
                    {u.blocked ? "Blocked" : "Active"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {section === "settings" && (
          <>
            <h1 className="font-display text-xl font-semibold mb-1">Website settings</h1>
            <p className="text-white/40 text-sm mb-6">Global configuration for UMGSOLUTION.</p>
            <div className={`${PANEL} rounded-2xl p-6 max-w-lg space-y-5`}>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/40 mb-1.5">Site name</label>
                <input value={settings.siteName} onChange={e => setSettings(s => ({ ...s, siteName: e.target.value }))} className="w-full bg-[#000000] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#22D3B5]" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/40 mb-1.5">Default edit price (₹)</label>
                <input type="number" value={settings.defaultPrice} onChange={e => setSettings(s => ({ ...s, defaultPrice: Number(e.target.value) || 0 }))} className="w-full bg-[#000000] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#22D3B5]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Maintenance mode</span>
                <button
                  onClick={() => setSettings(s => ({ ...s, maintenance: !s.maintenance }))}
                  className={`w-11 h-6 rounded-full transition-colors relative ${settings.maintenance ? "bg-[#22D3B5]" : "bg-white/10"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-black transition-all ${settings.maintenance ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              <button onClick={() => notify("success", "Settings saved.")} className="w-full py-2.5 rounded-lg bg-[#22D3B5] text-black text-sm font-semibold hover:bg-[#1cb89e] transition-colors">
                Save settings
              </button>
            </div>
          </>
        )}
      </main>

      {/* Client detail modal */}
      <Modal open={!!detailReq} onClose={() => setDetailReq(null)} maxW="max-w-lg">
        {detailReq && (
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">{detailReq.title}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-white/40">Client</span><span>{detailReq.clientName}</span></div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-white/40">Email</span><span>{detailReq.clientEmail}</span></div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-white/40">Submitted</span><span>{fmtDate(detailReq.createdAt)}</span></div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-white/40">Status</span><span>{detailReq.status}</span></div>
              <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-white/40">Payment</span><span>{detailReq.paymentStatus} (₹{detailReq.price})</span></div>
              <div>
                <span className="text-white/40 block mb-1.5">Instructions</span>
                <p className="text-white/70 bg-[#000000] rounded-lg p-3 border border-white/[0.06]">{detailReq.instructions || "—"}</p>
              </div>
              <div>
                <span className="text-white/40 block mb-1.5">Clips</span>
                <div className="space-y-1.5">
                  {detailReq.clips.map((c, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#000000] rounded-lg px-3 py-2 border border-white/[0.06]">
                      <span className="flex items-center gap-2 truncate"><Film size={13} className="text-[#22D3B5] shrink-0" /> {c.name}</span>
                      <button onClick={() => downloadOriginal(c)} className="text-white/40 hover:text-white shrink-0"><Download size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Upload edited video modal */}
      <Modal open={!!uploadTarget} onClose={() => setUploadTarget(null)} maxW="max-w-sm">
        {uploadTarget && (
          <div>
            <h3 className="font-display text-lg font-semibold mb-1">Upload edited video</h3>
            <p className="text-white/40 text-sm mb-5">for "{uploadTarget.title}" — {uploadTarget.clientName}</p>
            <button onClick={() => editFileRef.current?.click()} className="w-full border-2 border-dashed border-white/15 hover:border-[#22D3B5]/50 rounded-lg py-8 flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors">
              <Upload size={22} />
              <span className="text-sm">Select finished video file</span>
            </button>
            <input ref={editFileRef} type="file" accept=".mp4,.mov,.avi,video/*" hidden onChange={onEditedFile} />
            <p className="text-white/30 text-[11px] mt-3">Uploading marks this order Completed and locks download behind payment.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* =========================================================================
   ROOT APP
========================================================================= */

export default function App() {
  const [view, setView] = useState("landing");
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState(seedRequests);
  const [users, setUsers] = useState(seedUsers);
  const [settings, setSettings] = useState({ siteName: "UMGSOLUTION", defaultPrice: 100, maintenance: false });
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
        <defs>
          <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0' stop-color='%2322D3B5'/>
            <stop offset='1' stop-color='%230E9C86'/>
          </linearGradient>
        </defs>
        <rect width='64' height='64' rx='14' fill='url(%23g)'/>
        <g transform='translate(14,14)' stroke='%23000' stroke-width='3.2' fill='none' stroke-linecap='round' stroke-linejoin='round'>
          <circle cx='6' cy='6' r='4'/>
          <circle cx='6' cy='30' r='4'/>
          <line x1='9.5' y1='9' x2='34' y2='33'/>
          <line x1='9.5' y1='27' x2='20' y2='18'/>
          <line x1='24' y1='14' x2='34' y2='3'/>
        </g>
      </svg>`.replace(/\s+/g, " ");
    const link = document.querySelector("link[rel='icon']") || document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = `data:image/svg+xml,${svg}`;
    document.head.appendChild(link);
    document.title = "UMGSOLUTION — Professional Video Editing";
  }, []);

  const notify = useCallback((type, msg) => {
    const id = uid();
    setToasts(prev => [...prev, { id, type, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4200);
  }, []);

  const goto = (v) => { setView(v); window.scrollTo(0, 0); };

  const handleLogin = (u) => {
    setUser(u);
    setUsers(prev => prev.find(x => x.email === u.email) ? prev : [...prev, { id: u.id, name: u.name, email: u.email, provider: u.provider, joined: Date.now(), blocked: false }]);
    goto("user");
  };

  const handleGoto = (v) => {
    if (v === "landing") { setUser(null); }
    goto(v);
  };

  return (
    <>
      <style>{FONT_STYLES}</style>
      <Toast toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      {view === "landing" && <Landing goto={handleGoto} />}
      {view === "login" && <Login goto={handleGoto} onLogin={handleLogin} />}
      {view === "user" && user && <UserDashboard user={user} requests={requests} setRequests={setRequests} goto={handleGoto} notify={notify} />}
      {view === "adminLogin" && <AdminLogin goto={handleGoto} onAuth={() => goto("adminDashboard")} />}
      {view === "adminDashboard" && (
        <AdminDashboard
          requests={requests} setRequests={setRequests}
          users={users} setUsers={setUsers}
          goto={handleGoto} notify={notify}
          settings={settings} setSettings={setSettings}
        />
      )}
    </>
  );
}
