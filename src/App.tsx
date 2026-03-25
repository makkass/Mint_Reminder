import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { Plus, Bell, Volume2, ExternalLink, Trash2, Edit2, Clock as ClockIcon, Link as LinkIcon, X, Pin, Sun, Moon } from 'lucide-react';
import { format, isPast, intervalToDuration } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

// --- Types ---
interface MintItem {
  id: string;
  name: string;
  date: string; // ISO string
  price: string;
  supply: string;
  isGTD: boolean;
  isWL: boolean;
  officialLinks: string;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  pinned: boolean;
}

// --- Theme Context ---
type Theme = 'dark' | 'light';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'dark', toggle: () => {} });
const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('mint-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('mint-theme', theme);

    // Enable smooth transition for a moment
    root.classList.add('theme-transition');
    const t = setTimeout(() => root.classList.remove('theme-transition'), 400);
    return () => clearTimeout(t);
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => (t === 'dark' ? 'light' : 'dark')), []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

// --- Alert Thresholds (in minutes) ---
const ALERT_THRESHOLDS = [10, 5, 1];

// Update this to your personal X / Twitter profile URL.
const PERSONAL_X_URL = 'https://x.com/takibi_coin';

// --- Sound & Speech Utilities ---
function playAlertSound(urgency: 'low' | 'medium' | 'high'): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const basePattern =
        urgency === 'high'
          ? [880, 1100, 1320, 1100]
          : urgency === 'medium'
            ? [660, 880, 660, 880]
            : [520, 660, 520, 660];

      const noteDuration = urgency === 'high' ? 0.14 : 0.2;
      const minDurationSeconds = 2;
      const totalNotes = Math.ceil(minDurationSeconds / noteDuration);
      const frequencies = Array.from({ length: totalNotes }, (_, i) => basePattern[i % basePattern.length]);
      const totalDuration = frequencies.length * noteDuration;

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * noteDuration);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * noteDuration);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (i + 1) * noteDuration);
        osc.start(ctx.currentTime + i * noteDuration);
        osc.stop(ctx.currentTime + (i + 1) * noteDuration);
      });

      setTimeout(() => {
        ctx.close();
        resolve();
      }, totalDuration * 1000);
    } catch {
      resolve();
    }
  });
}

function speakAlert(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'tr-TR';
  utter.rate = 1.0;
  utter.pitch = 1.1;
  utter.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const trVoice = voices.find(v => v.lang.startsWith('tr'));
  if (trVoice) utter.voice = trVoice;
  window.speechSynthesis.speak(utter);
}

// --- Components ---

const AnimatedBackground = () => {
  const { theme } = useTheme();
  const [shootingStars, setShootingStars] = useState<Array<{ id: number; top: string; left: string; delay: string }>>([]);

  // Dark mode: shooting stars
  useEffect(() => {
    if (theme !== 'dark') {
      setShootingStars([]);
      return;
    }

    const spawnStar = () => {
      const id = Date.now() + Math.random();
      const star = {
        id,
        top: `${Math.random() * 40}%`,
        left: `${Math.random() * 60}%`,
        delay: '0s',
      };
      setShootingStars(prev => [...prev, star]);
      setTimeout(() => {
        setShootingStars(prev => prev.filter(s => s.id !== id));
      }, 2200);
    };

    const interval = setInterval(() => {
      if (Math.random() > 0.5) spawnStar();
    }, 4000);

    // Initial star
    const timeout = setTimeout(spawnStar, 2000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [theme]);

  // Generate deterministic star positions
  const stars = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      top: `${(i * 17.3 + 5) % 95}%`,
      left: `${(i * 23.7 + 3) % 97}%`,
      size: (i % 3 === 0) ? 2.5 : (i % 2 === 0) ? 1.5 : 1,
      delay: `${(i * 0.7) % 4}s`,
      duration: `${3 + (i % 4)}s`,
    }))
  ).current;

  if (theme === 'dark') {
    return (
      <div className="animated-bg dark-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
        <div className="orb orb-5" />
        <div className="grid-overlay" />
        <div className="stars">
          {stars.map(s => (
            <div
              key={s.id}
              className="star"
              style={{
                top: s.top,
                left: s.left,
                width: `${s.size}px`,
                height: `${s.size}px`,
                animationDelay: s.delay,
                animationDuration: s.duration,
              }}
            />
          ))}
        </div>
        {shootingStars.map(s => (
          <div
            key={s.id}
            className="shooting-star"
            style={{ top: s.top, left: s.left }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="animated-bg light-bg">
      {/* Base gradient layer */}
      <div className="gradient-base" />
      
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />
      <div className="orb orb-5" />
      
      {/* Glow and beam effects */}
      <div className="sun-wash" />
      <div className="light-beam" />
      <div className="light-beam-2" />
      
      {/* Pattern overlays */}
      <div className="dot-pattern" />
      <div className="grid-lines" />
      <div className="soft-vignette" />
      <div className="horizon-glow" />
      
      {/* Floating particles */}
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
      <div className="particle" />
    </div>
  );
};

const ThemeToggle = () => {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="theme-toggle"
      aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
      title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    >
      <div className="toggle-thumb">
        {theme === 'dark' ? <Moon size={13} className="text-[#050b16]" /> : <Sun size={13} className="text-[#050b16]" />}
      </div>
    </button>
  );
};

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <span>{format(time, 'HH:mm:ss')}</span>;
};

const CountdownDisplay = ({ targetDate }: { targetDate: string }) => {
  const [now, setNow] = useState(new Date());
  const target = new Date(targetDate);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isPast(target)) {
    return (
      <span className="text-[#32FF98] font-bold tracking-widest text-sm animate-pulse drop-shadow-[0_0_6px_rgba(50,255,152,0.3)]">
        MINTING
      </span>
    );
  }

  const duration = intervalToDuration({ start: now, end: target });

  const parts = [];
  if (duration.days) parts.push(`${duration.days}d`);
  if (duration.hours !== undefined) parts.push(`${duration.hours}h`);
  if (duration.minutes !== undefined) parts.push(`${duration.minutes}m`);
  if (duration.seconds !== undefined) parts.push(`${duration.seconds}s`);

  const topRow = parts.slice(0, 2);
  const bottomRow = parts.slice(2, 4);

  return (
    <div className="flex flex-col gap-0.5 text-cyan-500 font-bold text-[18px] tracking-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
      <div className="flex gap-x-1.5">
        {topRow.map((p, i) => (
          <span key={i} className="tabular-nums relative z-10">{p}</span>
        ))}
      </div>
      {bottomRow.length > 0 && (
        <div className="flex gap-x-1.5">
          {bottomRow.map((p, i) => (
            <span key={i} className="tabular-nums relative z-10">{p}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const MintCard = ({
  mint,
  onDelete,
  onToggleNotification,
  onToggleSound,
  onToggleGTD,
  onToggleWL,
  onEdit,
  onTogglePin,
}: {
  mint: MintItem;
  onDelete: (id: string) => void;
  onToggleNotification: (id: string) => void;
  onToggleSound: (id: string) => void;
  onToggleGTD: (id: string) => void;
  onToggleWL: (id: string) => void;
  onEdit: (mint: MintItem) => void;
  onTogglePin: (id: string) => void;
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`mint-card rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 w-full sm:w-[410px] flex-shrink-0 flex flex-col gap-4 sm:gap-5 border ${mint.pinned ? 'pinned-card' : ''} ${
        mint.pinned
          ? isDark 
            ? 'border-amber-400/25 shadow-[0_0_25px_rgba(245,158,11,0.1)]' 
            : 'border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
          : isDark ? 'border-slate-600/15' : 'border-slate-300/40'
      }`}
    >
      {/* Top Icons */}
      <div className="flex justify-end gap-1.5 sm:gap-2.5 flex-wrap">
         <button
          onClick={() => onTogglePin(mint.id)}
          className={`p-2 rounded-xl transition-all duration-300 ${
            mint.pinned
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              : isDark
                ? 'bg-slate-800/40 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 border border-slate-600/10 hover:border-amber-400/20'
                : 'bg-slate-100 text-slate-400 hover:text-amber-500 hover:bg-amber-50 border border-transparent'
          }`}
          title={mint.pinned ? 'Unpin' : 'Pin'}
        >
          <Pin size={16} fill={mint.pinned ? 'currentColor' : 'none'} className={mint.pinned ? 'rotate-45' : ''} />
        </button>
        <button
          onClick={() => onToggleNotification(mint.id)}
          className={`p-2 rounded-xl transition-all duration-300 ${
            mint.notificationsEnabled
              ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/30'
              : isDark
                ? 'bg-slate-800/40 text-slate-500 hover:text-slate-300 border border-slate-600/10 hover:border-slate-500/20'
                : 'bg-slate-100 text-slate-400 hover:text-slate-600 border border-transparent'
          }`}
        >
          <Bell size={16} fill={mint.notificationsEnabled ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => onToggleSound(mint.id)}
          className={`p-2 rounded-xl transition-all duration-300 ${
            mint.soundEnabled
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              : isDark
                ? 'bg-slate-800/40 text-slate-500 hover:text-slate-300 border border-slate-600/10 hover:border-slate-500/20'
                : 'bg-slate-100 text-slate-400 hover:text-slate-600 border border-transparent'
          }`}
        >
          <Volume2 size={16} fill={mint.soundEnabled ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => onEdit(mint)}
          className={`p-2 rounded-xl transition-all duration-300 ${
            isDark
              ? 'bg-slate-800/40 text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 border border-slate-600/10 hover:border-cyan-400/20'
              : 'bg-slate-100 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 border border-transparent'
          }`}
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => onDelete(mint.id)}
          className={`p-2 rounded-xl transition-all duration-300 ${
            isDark
              ? 'bg-slate-800/40 text-slate-500 hover:text-red-400 hover:bg-red-400/10 border border-slate-600/10 hover:border-red-400/20'
              : 'bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent'
          }`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Mint Name */}
        <div className="inner-box p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 min-h-[80px] sm:min-h-[95px]">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>Mint Name</span>
          <h3 className="text-[16px] sm:text-[20px] font-black leading-tight break-words overflow-hidden" style={{ color: 'var(--text-secondary)' }}>{mint.name}</h3>
        </div>

        {/* Mint Date */}
        <div className="inner-box p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 min-h-[80px] sm:min-h-[95px]">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>Mint Date</span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-cyan-500 mb-0.5">
              <ClockIcon size={12} className="shrink-0 sm:w-[14px] sm:h-[14px]" />
              <span className="text-[11px] sm:text-[12px] font-bold break-words">{format(new Date(mint.date), "MMM do,")}</span>
            </div>
            <span className="text-[11px] sm:text-[12px] font-bold ml-[18px] sm:ml-[20px] break-words" style={{ color: 'var(--text-muted)' }}>{format(new Date(mint.date), "yyyy • HH:mm")}</span>
            <span className="text-[10px] sm:text-[11px] ml-[18px] sm:ml-[20px] font-bold" style={{ color: 'var(--text-faint)' }}>(Local)</span>
          </div>
        </div>

        {/* Time Left */}
        <div className="inner-box p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 min-h-[80px] sm:min-h-[95px] relative overflow-hidden group">
          <div className={`absolute inset-0 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity ${isDark ? 'bg-gradient-to-br from-white/5 to-transparent' : 'bg-gradient-to-br from-cyan-50/50 to-transparent'}`}></div>
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest shrink-0 relative z-10" style={{ color: 'var(--text-muted)' }}>Time Left</span>
          <div className="relative z-10">
            <CountdownDisplay targetDate={mint.date} />
          </div>
        </div>

        {/* Price & Supply */}
        <div className="inner-box p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 min-h-[80px] sm:min-h-[95px]">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest shrink-0 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Price & Supply</span>
          <div className="flex items-start gap-2">
            <LinkIcon size={14} className="text-cyan-400 transform -rotate-45 shrink-0 mt-0.5 sm:w-4 sm:h-4" />
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] sm:text-[15px] font-black break-words" style={{ color: 'var(--text-secondary)' }}>{mint.price} •</span>
              <span className="text-[13px] sm:text-[15px] font-black break-words" style={{ color: 'var(--text-secondary)' }}>{mint.supply}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onToggleGTD(mint.id)}
          aria-pressed={mint.isGTD}
          className={`flex items-center gap-2 sm:gap-2.5 inner-box px-3 sm:px-4 py-2 rounded-[14px] transition-all ${
            isDark
              ? 'bg-slate-900/30 border border-slate-600/10 hover:border-cyan-400/30 hover:bg-cyan-400/5'
              : 'bg-white/50 border border-slate-200/40 hover:border-cyan-400/30 hover:bg-cyan-50'
          }`}
        >
          <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all ${mint.isGTD ? 'border-cyan-400 bg-cyan-400/10' : isDark ? 'border-slate-700 bg-transparent' : 'border-slate-300 bg-transparent'}`}>
            {mint.isGTD && (
              <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span className="text-[12px] sm:text-[13px] font-black" style={{ color: 'var(--text-secondary)' }}>GTD</span>
        </button>
        <button
          type="button"
          onClick={() => onToggleWL(mint.id)}
          aria-pressed={mint.isWL}
          className={`flex items-center gap-2 sm:gap-2.5 inner-box px-3 sm:px-4 py-2 rounded-[14px] transition-all ${
            isDark
              ? 'bg-slate-900/30 border border-slate-600/10 hover:border-teal-400/30 hover:bg-teal-400/5'
              : 'bg-white/50 border border-slate-200/40 hover:border-teal-400/30 hover:bg-teal-50'
          }`}
        >
          <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all ${mint.isWL ? 'border-teal-400 bg-teal-400/10' : isDark ? 'border-slate-700 bg-transparent' : 'border-slate-300 bg-transparent'}`}>
            {mint.isWL && (
              <svg className="w-3.5 h-3.5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span className="text-[12px] sm:text-[13px] font-black" style={{ color: 'var(--text-secondary)' }}>WL</span>
        </button>
      </div>

      {/* Action Button */}
      <a
        href={mint.officialLinks}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full py-3 sm:py-4 rounded-[16px] sm:rounded-[18px] border transition-all flex items-center justify-center gap-2 font-black text-[13px] sm:text-[14px] tracking-wide mt-1 sm:mt-2 ${
          isDark
            ? 'border-slate-600/20 hover:border-cyan-400/25 hover:bg-cyan-400/5 text-gray-300'
            : 'border-slate-300/40 hover:border-cyan-400/30 hover:bg-cyan-50/50 text-slate-600'
        }`}
      >
        <ExternalLink size={16} strokeWidth={2.5} className="sm:w-[18px] sm:h-[18px]" />
        Official Links
      </a>
    </motion.div>
  );
};

// --- Mint Form Modal ---
const MintFormModal = ({
  title,
  initialData,
  onSubmit,
  onClose,
}: {
  title: string;
  initialData?: MintItem;
  onSubmit: (data: Omit<MintItem, 'id' | 'notificationsEnabled' | 'soundEnabled' | 'pinned'>) => void;
  onClose: () => void;
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [name, setName] = useState(initialData?.name ?? '');
  const [date, setDate] = useState(initialData?.date ? toLocalInput(initialData.date) : '');
  const [price, setPrice] = useState(initialData?.price ?? '');
  const [supply, setSupply] = useState(initialData?.supply ?? '');
  const [links, setLinks] = useState(initialData?.officialLinks ?? '');
  const [isGTD, setIsGTD] = useState(initialData?.isGTD ?? false);
  const [isWL, setIsWL] = useState(initialData?.isWL ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      date: new Date(date).toISOString(),
      price: price || 'TBA',
      supply: supply || 'TBA',
      officialLinks: links || '#',
      isGTD,
      isWL,
    });
  };

  const inputClass = `modal-input rounded-2xl px-4 sm:px-5 py-3 sm:py-4 outline-none focus:border-cyan-400/50 transition-colors font-bold text-[14px] sm:text-base ${isDark ? '[color-scheme:dark]' : '[color-scheme:light]'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: 'var(--bg-overlay)' }}
      />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="modal-bg relative w-full sm:max-w-md border rounded-t-[32px] sm:rounded-[40px] p-6 sm:p-10 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden flex justify-center mb-4">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-xl transition-all ${
            isDark ? 'text-slate-500 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl sm:text-3xl font-black mb-6 sm:mb-8 tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Mint Name</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Bored Ape"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Mint Date</label>
            <input
              required
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Price</label>
              <input
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="Free"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Supply</label>
              <input
                value={supply}
                onChange={e => setSupply(e.target.value)}
                placeholder="3,333"
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-5 sm:gap-6 py-1 sm:py-2">
            <label className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group" onClick={() => setIsGTD(v => !v)}>
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isGTD ? 'border-cyan-400 bg-cyan-400/10' : isDark ? 'border-slate-700 bg-transparent' : 'border-slate-300 bg-transparent'}`}>
                {isGTD && (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="text-[13px] sm:text-sm font-black transition-colors select-none" style={{ color: 'var(--text-muted)' }}>GTD</span>
            </label>
            <label className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group" onClick={() => setIsWL(v => !v)}>
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isWL ? 'border-teal-400 bg-teal-400/10' : isDark ? 'border-slate-700 bg-transparent' : 'border-slate-300 bg-transparent'}`}>
                {isWL && (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="text-[13px] sm:text-sm font-black transition-colors select-none" style={{ color: 'var(--text-muted)' }}>WL</span>
            </label>
          </div>
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Official Links</label>
            <input
              value={links}
              onChange={e => setLinks(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div className="flex gap-3 sm:gap-4 mt-4 sm:mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 sm:py-4 rounded-2xl border font-black text-[14px] sm:text-[15px] transition-colors ${
                isDark
                  ? 'border-white/5 bg-white/5 text-gray-300 hover:bg-white/10'
                  : 'border-black/8 bg-black/5 text-slate-600 hover:bg-black/10'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 sm:py-4 rounded-2xl bg-cyan-400 text-black font-black text-[14px] sm:text-[15px] hover:bg-cyan-300 transition-colors shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            >
              {title}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App ---
function MintApp() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [mints, setMints] = useState<MintItem[]>(() => {
    const saved = localStorage.getItem('mint-reminders');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMint, setEditingMint] = useState<MintItem | null>(null);

  useEffect(() => {
    localStorage.setItem('mint-reminders', JSON.stringify(mints));
  }, [mints]);

  const handleDelete = (id: string) => {
    setMints(prev => prev.filter(m => m.id !== id));
  };

  const toggleNotification = (id: string) => {
    setMints(prev => prev.map(m => m.id === id ? { ...m, notificationsEnabled: !m.notificationsEnabled } : m));
  };

  const toggleSound = (id: string) => {
    setMints(prev => prev.map(m => m.id === id ? { ...m, soundEnabled: !m.soundEnabled } : m));
  };

  const toggleGTD = (id: string) => {
    setMints(prev => prev.map(m => m.id === id ? { ...m, isGTD: !m.isGTD } : m));
  };

  const toggleWL = (id: string) => {
    setMints(prev => prev.map(m => m.id === id ? { ...m, isWL: !m.isWL } : m));
  };

  const togglePin = (id: string) => {
    setMints(prev => prev.map(m => m.id === id ? { ...m, pinned: !m.pinned } : m));
  };

  const handleAddMint = (data: Omit<MintItem, 'id' | 'notificationsEnabled' | 'soundEnabled' | 'pinned'>) => {
    const newMint: MintItem = {
      id: crypto.randomUUID(),
      notificationsEnabled: true,
      soundEnabled: true,
      pinned: false,
      ...data,
    };
    setMints(prev => [newMint, ...prev]);
    setIsAddModalOpen(false);
  };

  const handleEditMint = (data: Omit<MintItem, 'id' | 'notificationsEnabled' | 'soundEnabled' | 'pinned'>) => {
    if (!editingMint) return;
    setMints(prev =>
      prev.map(m =>
        m.id === editingMint.id ? { ...m, ...data } : m
      )
    );
    setEditingMint(null);
  };

  // --- Alert / Notification System ---
  const firedAlertsRef = useRef<Set<string>>(new Set());
  const alertQueueRef = useRef<Array<{ mintName: string; minutes: number; urgency: 'low' | 'medium' | 'high'; isMintStart?: boolean; shouldSpeak: boolean }>>([]);
  const isProcessingRef = useRef(false);

  const processAlertQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    while (alertQueueRef.current.length > 0) {
      const alert = alertQueueRef.current.shift()!;
      await playAlertSound(alert.urgency);
      await new Promise(r => setTimeout(r, 300));
      if (alert.shouldSpeak) {
        const speechText = alert.isMintStart
          ? `${alert.mintName} Minti başladı!`
          : `${alert.mintName} Mintine son ${alert.minutes} dakika`;
        speakAlert(speechText);
        await new Promise(r => setTimeout(r, 2500));
      }
    }

    isProcessingRef.current = false;
  }, []);

  useEffect(() => {
    const checkAlerts = () => {
      const now = Date.now();

      mints.forEach(mint => {
        if (!mint.soundEnabled && !mint.notificationsEnabled) return;

        const targetTime = new Date(mint.date).getTime();
        const diffMs = targetTime - now;
        const diffMinutes = diffMs / (1000 * 60);

        const startKey = `${mint.id}-mint-started`;
        if (targetTime <= now && now - targetTime < 5000 && !firedAlertsRef.current.has(startKey)) {
          firedAlertsRef.current.add(startKey);

          alertQueueRef.current.push({
            mintName: mint.name,
            minutes: 0,
            urgency: 'high',
            isMintStart: true,
            shouldSpeak: mint.soundEnabled,
          });

          processAlertQueue();

          if (mint.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`🚀 ${mint.name} Minti Başladı!`, {
              body: `${mint.name} minti şu an aktif! Hemen katıl!`,
              icon: '🚀',
            });
          }
          return;
        }

        if (targetTime <= now) return;

        ALERT_THRESHOLDS.forEach(threshold => {
          const alertKey = `${mint.id}-${threshold}`;

          if (diffMinutes <= threshold && diffMinutes > (threshold - 0.1) && !firedAlertsRef.current.has(alertKey)) {
            firedAlertsRef.current.add(alertKey);

            const urgency: 'low' | 'medium' | 'high' = threshold === 1 ? 'high' : threshold === 5 ? 'medium' : 'low';

            alertQueueRef.current.push({
              mintName: mint.name,
              minutes: threshold,
              urgency,
              shouldSpeak: mint.soundEnabled,
            });

            processAlertQueue();

            if (mint.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`⏰ ${mint.name} Mint Hatırlatıcı`, {
                body: `${mint.name} mintine son ${threshold} dakika!`,
                icon: '🔔',
              });
            }
          }
        });
      });
    };

    const timer = setInterval(checkAlerts, 1000);
    return () => clearInterval(timer);
  }, [mints, processAlertQueue]);

  useEffect(() => {
    const currentIds = new Set(mints.map(m => m.id));
    const toDelete: string[] = [];
    firedAlertsRef.current.forEach(key => {
      const mintId = key.split('-')[0];
      if (!currentIds.has(mintId)) {
        toDelete.push(key);
      }
    });
    toDelete.forEach(key => firedAlertsRef.current.delete(key));
  }, [mints]);

  const [notifStatus, setNotifStatus] = useState<string>('');
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotifStatus('granted');
          new Notification('Mint Reminder', { body: 'Bildirimler başarıyla etkinleştirildi! 🎉' });
        } else if (permission === 'denied') {
          setNotifStatus('denied');
          alert('Bildirimler engellendi. Lütfen tarayıcı ayarlarından izin verin.');
        } else {
          setNotifStatus('default');
        }
      } catch {
        alert('Bildirim izni istenemedi. Lütfen tarayıcı ayarlarınızı kontrol edin.');
      }
    } else {
      alert('Bu tarayıcı bildirimleri desteklemiyor.');
    }
  };

  const testSound = async () => {
    await playAlertSound('medium');
    await new Promise(r => setTimeout(r, 300));
    speakAlert('Ses testi başarılı! Mint hatırlatıcı çalışıyor.');
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 lg:p-14 font-sans relative" style={{ color: 'var(--text-primary)' }}>
      <AnimatedBackground />
      {/* Header */}
      <header className="max-w-[1400px] mx-auto mb-10 sm:mb-16 md:mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10 relative z-10">
        {/* Left: Title & subtitle */}
        <div className="shrink-0">
          <h1 className="text-[32px] sm:text-[42px] md:text-[52px] font-black tracking-tight leading-none mb-2 sm:mb-3 select-none">
            <span className={`bg-clip-text text-transparent ${isDark ? 'bg-gradient-to-r from-white via-slate-200 to-slate-400' : 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-500'}`}>
              Mint{' '}
            </span>
            <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-sky-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(34,211,238,0.3)]">
              Reminder
            </span>
          </h1>
          <p className="text-[13px] sm:text-[16px] font-bold" style={{ color: 'var(--text-muted)' }}>
            Never miss a drop again. Local time:{' '}
            <span className="font-black ml-1" style={{ color: 'var(--text-secondary)' }}><Clock /></span>
          </p>
        </div>

        {/* Right: Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
          <button
            onClick={requestNotificationPermission}
            type="button"
            className={`relative z-10 flex items-center gap-2 sm:gap-2.5 px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl border transition-all font-black text-[12px] sm:text-[15px] cursor-pointer select-none active:scale-95 ${
              notifStatus === 'granted'
                ? 'bg-green-500/15 text-green-500 border-green-500/30 hover:bg-green-500/25'
                : notifStatus === 'denied'
                  ? 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
                  : isDark
                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20'
                    : 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100'
            }`}
          >
            <div className="relative pointer-events-none">
              <Bell size={18} className="sm:w-5 sm:h-5" />
              {notifStatus !== 'granted' && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full border-2" style={{ borderColor: 'var(--notif-dot-border)' }} />
              )}
            </div>
            <span className="pointer-events-none hidden xs:inline">
              {notifStatus === 'granted' ? '✓ Bildirimler Açık' : notifStatus === 'denied' ? '✕ Engellendi' : 'Bildirimleri Aç'}
            </span>
            <span className="pointer-events-none xs:hidden">
              {notifStatus === 'granted' ? '✓' : notifStatus === 'denied' ? '✕' : ''}
              <Bell size={0} className="hidden" />
            </span>
          </button>

          <a
            href={PERSONAL_X_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open personal X profile"
            title="X / Twitter"
            className={`flex items-center justify-center w-[42px] h-[42px] sm:w-[54px] sm:h-[54px] rounded-xl sm:rounded-2xl border transition-all ${
              isDark
                ? 'bg-slate-800/30 text-slate-400 border-slate-700/30 hover:bg-slate-800/50 hover:text-cyan-300'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-cyan-600'
            }`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 sm:w-5 sm:h-5 fill-current">
              <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.847h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932Zm-1.291 19.492h2.039L6.486 3.241H4.298L17.61 20.645Z" />
            </svg>
          </a>

          <button
            onClick={testSound}
            className={`flex items-center gap-2 sm:gap-2.5 px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl border transition-all font-black text-[12px] sm:text-[15px] ${
              isDark
                ? 'bg-slate-800/30 text-slate-400 border-slate-700/30 hover:bg-slate-800/50'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Volume2 size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Sesi Test Et</span>
            <span className="sm:hidden">Test</span>
          </button>

          <ThemeToggle />

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 bg-cyan-400 text-[#050b16] px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl border border-cyan-300/50 hover:bg-cyan-300 transition-all font-black text-[13px] sm:text-[17px] shadow-[0_0_30px_rgba(34,211,238,0.15)]"
          >
            <Plus size={20} strokeWidth={3} className="sm:w-6 sm:h-6" />
            <span className="hidden sm:inline">Add Mint</span>
            <span className="sm:hidden">Ekle</span>
          </button>
        </div>
      </header>

      {/* PINNED Section */}
      {mints.some(m => m.pinned) && (
        <section className="max-w-[1400px] mx-auto mb-8 sm:mb-14 relative z-10">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <Pin size={18} className="text-amber-400 rotate-45 sm:w-5 sm:h-5" />
            <h2 className="text-base sm:text-xl font-black text-amber-400 tracking-wide uppercase">Pinned</h2>
            <div className="flex-1 h-px bg-amber-400/20" />
          </div>
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap justify-start gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {mints
                .filter(m => m.pinned)
                .map((mint) => (
                  <MintCard
                    key={mint.id}
                    mint={mint}
                    onDelete={handleDelete}
                    onToggleNotification={toggleNotification}
                    onToggleSound={toggleSound}
                    onToggleGTD={toggleGTD}
                    onToggleWL={toggleWL}
                    onEdit={setEditingMint}
                    onTogglePin={togglePin}
                  />
                ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* ALL MINTS Section */}
      <section className="max-w-[1400px] mx-auto relative z-10">
        {mints.some(m => m.pinned) && (
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <ClockIcon size={18} className="text-cyan-400 sm:w-5 sm:h-5" />
            <h2 className="text-base sm:text-xl font-black text-cyan-400 tracking-wide uppercase">All Mints</h2>
            <div className="flex-1 h-px bg-cyan-400/20" />
          </div>
        )}

        {mints.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4"
          >
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-5 sm:mb-6 ${
              isDark ? 'bg-cyan-400/5 border border-cyan-400/10' : 'bg-cyan-50 border border-cyan-100'
            }`}>
              <Bell size={32} className="text-cyan-400/30 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
              Henüz mint eklenmedi
            </h3>
            <p className="font-medium max-w-md mb-6 sm:mb-8 text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>
              İlk mint hatırlatıcını ekleyerek başla. Süresi geldiğinde sesli ve konuşmalı uyarı alacaksın!
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-cyan-400 text-[#050b16] px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-cyan-300/50 hover:bg-cyan-300 transition-all font-black text-[14px] sm:text-[17px] shadow-[0_0_30px_rgba(34,211,238,0.15)]"
            >
              <Plus size={22} strokeWidth={3} />
              İlk Mintini Ekle
            </button>
          </motion.div>
        ) : (
          <main className="grid grid-cols-1 sm:flex sm:flex-wrap justify-start gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {[...mints]
                .filter(m => !m.pinned)
                .sort((a, b) => {
                  const now = Date.now();
                  const aTime = new Date(a.date).getTime();
                  const bTime = new Date(b.date).getTime();
                  const aIsMinting = aTime <= now;
                  const bIsMinting = bTime <= now;
                  if (aIsMinting && !bIsMinting) return -1;
                  if (!aIsMinting && bIsMinting) return 1;
                  if (aIsMinting && bIsMinting) return 0;
                  return aTime - bTime;
                })
                .map((mint) => (
                  <MintCard
                    key={mint.id}
                    mint={mint}
                    onDelete={handleDelete}
                    onToggleNotification={toggleNotification}
                    onToggleSound={toggleSound}
                    onToggleGTD={toggleGTD}
                    onToggleWL={toggleWL}
                    onEdit={setEditingMint}
                    onTogglePin={togglePin}
                  />
                ))}
            </AnimatePresence>
          </main>
        )}
      </section>

      {/* Footer */}
      <footer className="max-w-[1400px] mx-auto mt-12 sm:mt-16 pb-6 sm:pb-8 safe-bottom relative z-10">
        <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs font-medium" style={{ color: 'var(--text-faint)' }}>
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Verileriniz yalnızca bu tarayıcıda saklanır. Herkes kendi eklediği mintleri görür.</span>
        </div>
      </footer>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <MintFormModal
            title="Create Mint"
            onSubmit={handleAddMint}
            onClose={() => setIsAddModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMint && (
          <MintFormModal
            title="Edit Mint"
            initialData={editingMint}
            onSubmit={handleEditMint}
            onClose={() => setEditingMint(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MintApp />
    </ThemeProvider>
  );
}
