import confetti from 'canvas-confetti';
import { animate, motion, useMotionValue } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import type { Entry, Rarity } from '../types';
import { CharacterCard } from './components';
import { sfx } from './sfx';

const CARD_W = 150;
const GAP = 12;
const STEP = CARD_W + GAP;
const STRIP_LEN = 48;
const TARGET_INDEX = 42;
const SPIN_SECONDS = 4.2;

interface ReelProps {
  pool: Entry[];
  target: Entry;
  /** Changes whenever a new spin should start. */
  spinKey: string;
  onDone: () => void;
}

/** Horizontal slot-machine reel that decelerates onto the target. Click to skip. */
export function Reel({ pool, target, spinKey, onDone }: ReelProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const stopRef = useRef<() => void>(() => {});

  const strip = useMemo(() => {
    const cards = Array.from({ length: STRIP_LEN }, () => pool[Math.floor(Math.random() * pool.length)]);
    cards[TARGET_INDEX] = target;
    return cards;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  useEffect(() => {
    const width = viewport.current?.clientWidth ?? 800;
    const jitter = (Math.random() - 0.5) * CARD_W * 0.6;
    const final = -(TARGET_INDEX * STEP) + width / 2 - CARD_W / 2 + jitter;
    let finished = false;
    let lastIndex = -1;
    x.set(0);

    const finish = () => {
      if (finished) return;
      finished = true;
      onDone();
    };
    const controls = animate(x, final, {
      duration: SPIN_SECONDS,
      ease: [0.05, 0.7, 0.12, 1],
      onUpdate(v) {
        const index = Math.floor((-v + width / 2) / STEP);
        if (index !== lastIndex) {
          lastIndex = index;
          sfx.tick();
        }
      },
      onComplete: finish,
    });
    stopRef.current = () => {
      controls.stop();
      x.set(final);
      finish();
    };
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  return (
    <div>
      <div className="reel" ref={viewport} onClick={() => stopRef.current()}>
        <div className="reel-marker" />
        <motion.div className="reel-strip" style={{ x }}>
          {strip.map((entry, i) => (
            <CharacterCard key={i} entry={entry} />
          ))}
        </motion.div>
      </div>
      <div className="reel-hint muted">Tap the reel to skip</div>
    </div>
  );
}

const CONFETTI_COLORS: Partial<Record<Rarity, string[]>> = {
  S: ['#ffc300', '#fff3b0', '#ff9f1c'],
  SS: ['#ff3d5a', '#ffd60a', '#4cc9f0', '#b15cff', '#80ed99'],
};

/** Screen-wide celebration for a reveal; louder the rarer the pull. */
export function celebrate(rarity: Rarity, shakeTarget: HTMLElement | null): void {
  sfx.reveal(rarity);
  const colors = CONFETTI_COLORS[rarity];
  if (!colors) return;
  const burst = rarity === 'SS' ? 220 : 110;
  confetti({ particleCount: burst, spread: 100, origin: { y: 0.45 }, colors, scalar: 1.1 });
  if (rarity === 'SS') {
    setTimeout(() => confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors }), 250);
    setTimeout(() => confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors }), 250);
  }
  if (shakeTarget) {
    shakeTarget.classList.remove('shake');
    void shakeTarget.offsetWidth;
    shakeTarget.classList.add('shake');
  }
}

/** Flash + speed lines overlay for S and SS pulls. */
export function RevealFlash({ rarity }: { rarity: Rarity }) {
  if (rarity !== 'S' && rarity !== 'SS') return null;
  const color = rarity === 'SS' ? 'rgba(255, 61, 90, 0.55)' : 'rgba(255, 214, 10, 0.45)';
  return (
    <>
      <motion.div
        className="flash"
        style={{ background: `radial-gradient(circle, #fff 0%, ${color} 40%, transparent 75%)` }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.9 }}
      />
      <motion.div className="speedlines" initial={{ opacity: 0.9, scale: 1.3 }} animate={{ opacity: 0, scale: 1 }} transition={{ duration: 1.4 }} />
    </>
  );
}
