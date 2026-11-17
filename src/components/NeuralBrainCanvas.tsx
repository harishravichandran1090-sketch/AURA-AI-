import React, {useEffect, useMemo, useRef} from 'react';
import type {NeuralState} from '../types/aura';

interface NeuralBrainCanvasProps {
  state: NeuralState;
  energy: number;
  compact?: boolean;
  onActivate: () => void;
}

interface NeuronNode {
  x: number;
  y: number;
  z: number;
  hemisphere: -1 | 1;
  phase: number;
  size: number;
}

interface SynapseEdge {
  a: number;
  b: number;
  cross: boolean;
}

interface SignalPulse {
  edgeIndex: number;
  progress: number;
  speed: number;
}

const STATE_PALETTE: Record<
  NeuralState,
  {primary: [number, number, number]; secondary: [number, number, number]; label: string}
> = {
  IDLE: {
    primary: [6, 182, 212], // Cyan #06b6d4
    secondary: [16, 185, 129], // Emerald #10b981
    label: 'Neural Sync Ready',
  },
  LISTENING: {
    primary: [16, 185, 129], // Emerald #10b981
    secondary: [52, 211, 153],
    label: 'Listening to Daddy',
  },
  THINKING: {
    primary: [139, 92, 246], // Violet #8b5cf6
    secondary: [192, 132, 252],
    label: 'Processing Synapse',
  },
  SPEAKING: {
    primary: [56, 189, 248], // Sky Blue #38bdf8
    secondary: [6, 182, 212],
    label: 'Voice Output Active',
  },
};

function buildBrainGraph(): {nodes: NeuronNode[]; edges: SynapseEdge[]} {
  const nodes: NeuronNode[] = [];
  // Deterministic pseudo-random generator for stable geometry across renders
  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Create left (-1) and right (+1) cerebral hemispheres
  for (const hemi of [-1, 1] as const) {
    for (let i = 0; i < 44; i++) {
      const u = rand() * Math.PI;
      const v = rand() * Math.PI * 2;
      const r = 0.45 + Math.pow(rand(), 0.45) * 0.55;

      // Sculpt an ellipsoid brain silhouette
      const rawX = Math.sin(u) * Math.cos(v) * r;
      const rawY = Math.cos(u) * r * 0.78;
      const rawZ = Math.sin(u) * Math.sin(v) * r * 1.24;

      // Push into respective hemisphere with subtle longitudinal fissure gap
      const x = hemi * (0.14 + Math.abs(rawX) * 0.72);
      // Slight downward curve at temporal/frontal base
      const y = rawY * 0.92 - (rawZ > 0.3 ? 0.06 : 0);
      const z = rawZ;

      nodes.push({
        x,
        y,
        z,
        hemisphere: hemi,
        phase: rand() * Math.PI * 2,
        size: 1.5 + rand() * 1.8,
      });
    }
  }

  const edges: SynapseEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const dists: Array<{j: number; d: number}> = [];
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dz = nodes[i].z - nodes[j].z;
      const d = Math.hypot(dx, dy, dz);
      if (d < 0.56) {
        dists.push({j, d});
      }
    }
    dists.sort((a, b) => a.d - b.d);
    const limit = 3;
    for (let k = 0; k < Math.min(limit, dists.length); k++) {
      const j = dists[k].j;
      edges.push({
        a: i,
        b: j,
        cross: nodes[i].hemisphere !== nodes[j].hemisphere,
      });
    }
  }

  return {nodes, edges};
}

export const NeuralBrainCanvas: React.FC<NeuralBrainCanvasProps> = ({
  state,
  energy,
  compact = false,
  onActivate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<NeuralState>(state);
  const energyRef = useRef<number>(energy);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  const graph = useMemo(() => buildBrainGraph(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationId = 0;
    let angle = 0.25;
    let smoothedEnergy = 0;
    const pulses: SignalPulse[] = [];

    const spawnPulse = (speedMin: number, speedMax: number) => {
      if (graph.edges.length === 0) return;
      pulses.push({
        edgeIndex: Math.floor(Math.random() * graph.edges.length),
        progress: 0,
        speed: speedMin + Math.random() * (speedMax - speedMin),
      });
    };

    const render = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const currentState = stateRef.current;
      const palette = STATE_PALETTE[currentState];
      const [pr, pg, pb] = palette.primary;
      const [sr, sg, sb] = palette.secondary;

      const targetEnergy =
        currentState === 'LISTENING' || currentState === 'SPEAKING'
          ? Math.max(0.28, energyRef.current)
          : currentState === 'THINKING'
            ? 0.65
            : 0.12;
      smoothedEnergy += (targetEnergy - smoothedEnergy) * 0.16;

      if (!prefersReducedMotion) {
        const rotSpeed =
          currentState === 'THINKING'
            ? 0.011
            : currentState === 'SPEAKING'
              ? 0.0075
              : currentState === 'LISTENING'
                ? 0.006
                : 0.0032;
        angle += rotSpeed;
      }

      const cx = width / 2;
      const cy = height / 2;
      const baseScale = Math.min(width, height) * (compact ? 0.34 : 0.33);
      const pulseScale = 1 + Math.sin(now * 0.0035) * 0.02 + smoothedEnergy * 0.06;
      const scale = baseScale * pulseScale;

      // Subtle core halo behind the brain
      const haloRadius = Math.min(width, height) * 0.46;
      const grad = ctx.createRadialGradient(cx, cy, haloRadius * 0.08, cx, cy, haloRadius);
      grad.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, ${0.18 + smoothedEnergy * 0.16})`);
      grad.addColorStop(0.55, `rgba(${sr}, ${sg}, ${sb}, 0.05)`);
      grad.addColorStop(1, 'rgba(3, 7, 18, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Concentric orbital HUD reticle rings
      ctx.save();
      ctx.strokeStyle = `rgba(${pr}, ${pg}, ${pb}, ${0.16 + smoothedEnergy * 0.22})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(cx, cy, baseScale * 1.38, angle * 0.5, angle * 0.5 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Project 3D nodes into 2D screen space
      const cosY = Math.cos(angle);
      const sinY = Math.sin(angle);
      const tiltX = 0.22;
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);

      const projected = graph.nodes.map((node, idx) => {
        const x1 = node.x * cosY - node.z * sinY;
        const z1 = node.x * sinY + node.z * cosY;
        const y2 = node.y * cosX - z1 * sinX;
        const z2 = node.y * sinX + z1 * cosX;

        const persp = 2.6 / (2.6 - z2 * 0.65);
        return {
          idx,
          sx: cx + x1 * scale * persp,
          sy: cy - y2 * scale * persp,
          depth: z2,
          persp,
          phase: node.phase,
          size: node.size,
        };
      });

      // Spawn synapse pulses based on neural state
      const spawnChance =
        currentState === 'THINKING'
          ? 0.42
          : currentState === 'SPEAKING'
            ? 0.24
            : currentState === 'LISTENING'
              ? 0.18
              : 0.045;
      if (!prefersReducedMotion && Math.random() < spawnChance && pulses.length < 36) {
        if (currentState === 'THINKING') {
          spawnPulse(0.045, 0.09);
        } else if (currentState === 'SPEAKING' || currentState === 'LISTENING') {
          spawnPulse(0.03, 0.06);
        } else {
          spawnPulse(0.014, 0.028);
        }
      }

      // Draw synaptic connections
      ctx.lineWidth = 0.85;
      for (let i = 0; i < graph.edges.length; i++) {
        const edge = graph.edges[i];
        const pa = projected[edge.a];
        const pbNode = projected[edge.b];
        const avgDepth = (pa.depth + pbNode.depth) * 0.5;
        const depthAlpha = Math.max(0.07, Math.min(0.42, (avgDepth + 1.1) * 0.18));
        ctx.strokeStyle = edge.cross
          ? `rgba(${sr}, ${sg}, ${sb}, ${depthAlpha * 0.9})`
          : `rgba(${pr}, ${pg}, ${pb}, ${depthAlpha})`;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pbNode.sx, pbNode.sy);
        ctx.stroke();
      }

      // Update and draw firing synapse sparks
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        const edge = graph.edges[p.edgeIndex];
        const pa = projected[edge.a];
        const pbNode = projected[edge.b];
        const px = pa.sx + (pbNode.sx - pa.sx) * p.progress;
        const py = pa.sy + (pbNode.sy - pa.sy) * p.progress;

        ctx.fillStyle = `rgba(240, 253, 250, 0.95)`;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, 0.45)`;
        ctx.beginPath();
        ctx.arc(px, py, 5.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw neurons sorted back-to-front
      const sortedNodes = [...projected].sort((a, b) => a.depth - b.depth);
      for (const n of sortedNodes) {
        const twinkle = 0.65 + 0.35 * Math.sin(now * 0.004 + n.phase);
        const alpha = Math.max(0.25, Math.min(1, ((n.depth + 1.1) * 0.45) * twinkle));
        const r = n.size * n.persp * (compact ? 0.85 : 1) * (1 + smoothedEnergy * 0.28);

        ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(n.sx, n.sy, r * 2.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${Math.min(255, pr + 65)}, ${Math.min(255, pg + 65)}, ${Math.min(255, pb + 65)}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(n.sx, n.sy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = window.requestAnimationFrame(render);
    };

    animationId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animationId);
  }, [compact, graph]);

  const palette = STATE_PALETTE[state];
  const barCount = compact ? 18 : 24;

  const badgeTone =
    state === 'LISTENING'
      ? 'text-emerald-300 border-emerald-500/35 bg-emerald-500/10'
      : state === 'THINKING'
        ? 'text-violet-300 border-violet-500/35 bg-violet-500/10'
        : state === 'SPEAKING'
          ? 'text-sky-300 border-sky-500/35 bg-sky-500/10'
          : 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10';

  const barColor =
    state === 'LISTENING'
      ? 'bg-emerald-400'
      : state === 'THINKING'
        ? 'bg-violet-400'
        : state === 'SPEAKING'
          ? 'bg-sky-400'
          : 'bg-cyan-500/60';

  return (
    <div className="flex flex-col items-center w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={onActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate();
          }
        }}
        aria-label={`AURA Neural Core — ${palette.label}. Tap to ${
          state === 'LISTENING' ? 'stop listening' : state === 'SPEAKING' ? 'stop speaking' : 'start voice input'
        }.`}
        className={`group relative w-full cursor-pointer select-none rounded-2xl focus-visible:outline-2 focus-visible:outline-cyan-400 ${
          compact ? 'h-36' : 'h-56 xl:h-64'
        }`}
      >
        <canvas ref={canvasRef} className="h-full w-full block" />
        <div
          className={`pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors duration-200 backdrop-blur-sm opacity-95 group-hover:opacity-100 ${badgeTone}`}
        >
          <span>{palette.label}</span>
          <span aria-hidden="true" className="opacity-50">·</span>
          <span className="text-[10px] opacity-80">
            {state === 'LISTENING' ? 'Tap to stop' : state === 'SPEAKING' ? 'Tap to mute' : 'Tap core to speak'}
          </span>
        </div>
      </div>

      {/* Live Voice Waveform Bars */}
      <div
        aria-hidden="true"
        className={`mt-2 flex items-center justify-center gap-1 ${compact ? 'h-5' : 'h-7'} w-full px-4`}
      >
        {Array.from({length: barCount}).map((_, i) => {
          const centerDist = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
          const envelope = 1 - centerDist * 0.65;
          const activeAmp =
            state === 'LISTENING' || state === 'SPEAKING'
              ? 0.25 + energy * 0.75 * envelope
              : state === 'THINKING'
                ? 0.35 * envelope
                : 0.14;
          const heightPct = Math.round(Math.min(100, Math.max(14, activeAmp * 100 * (0.65 + ((i * 37) % 10) / 20))));

          return (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${barColor}`}
              style={{
                height: `${heightPct}%`,
                opacity: state === 'IDLE' ? 0.35 : 0.9,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
