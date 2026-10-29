'use client'

import { useEffect, useId, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Shirt, ExternalLink, Crown, MapPin, Search, UserPlus, Users, Check, X, Shield, Star, Target,
  Zap, Award, ChevronRight, Pencil, LogOut, Clock, Sparkles, Palette, Footprints, Hash, Handshake,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export const LEGEA_URL = 'https://www.legea.it'
export const TEAMWEAR_IMG = 'https://static.prod-images.emergentagent.com/jobs/1711ab47-61e7-42cd-a07b-588c8368cd1b/images/1bd26ca7efab61ee11f35452b995b515d6978316667e63724bf02a024f457632.jpeg'

const api = async (path, opts = {}) => {
  const res = await fetch('/api' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

const POS_LABEL = { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' }
const FieldL = ({ label, children }) => (
  <div>
    <Label className="mb-1.5 block text-xs font-medium text-slate-300">{label}</Label>
    {children}
  </div>
)

// ================= STATUS BADGES =================
export const FreeAgentBadge = ({ small }) => (
  <span data-testid="free-agent-badge" className={'inline-flex items-center gap-1 rounded-full border border-sky-400/50 bg-sky-500/15 font-black uppercase tracking-wider text-sky-200 ' + (small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs')}>
    <Sparkles className={small ? 'h-2.5 w-2.5' : 'h-3 w-3'} /> Free agent
  </span>
)
export const RoleBadge = ({ role, small }) => role === 'captain' ? (
  <span className={'inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/15 font-black uppercase tracking-wider text-amber-200 ' + (small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs')}>
    <Crown className={small ? 'h-2.5 w-2.5' : 'h-3 w-3'} /> Captain
  </span>
) : (
  <span className={'inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/15 font-black uppercase tracking-wider text-emerald-200 ' + (small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs')}>
    <Shield className={small ? 'h-2.5 w-2.5' : 'h-3 w-3'} /> Player
  </span>
)
const ClubCrest = ({ club, size = 'h-10 w-10', text = 'text-sm' }) => (
  <div className={'grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 font-black text-white ' + size + ' ' + text}
    style={{ background: `linear-gradient(135deg, ${club?.primary_color || '#10b981'}, ${club?.secondary_color || '#06b6d4'})` }}>
    {club?.logo_url ? <img src={club.logo_url} alt="" className="h-full w-full object-cover" /> : (club?.name || '?')[0]}
  </div>
)

// ================= KIT SVG =================
const lum = (hex) => {
  const h = (hex || '#000000').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
export const KitSVG = ({ kit, number = 10, className = 'h-56 w-auto' }) => {
  const uid = useId().replace(/:/g, '')
  const k = kit || {}
  const shirt = k.shirt || '#10b981', accent = k.accent || '#ffffff', sleeves = k.sleeves || shirt
  const numColor = Math.abs(lum(accent) - lum(shirt)) > 0.35 ? accent : (lum(shirt) > 0.5 ? '#0b0f0d' : '#ffffff')
  const body = 'M60 20 L85 10 Q100 24 115 10 L140 20 L145 70 L145 150 L55 150 L55 70 Z'
  const pattern = k.pattern || 'solid'
  return (
    <svg viewBox="0 0 200 244" className={className} role="img" aria-label="Kit preview">
      <defs>
        <clipPath id={'body' + uid}><path d={body} /></clipPath>
        <linearGradient id={'shade' + uid} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".18" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".06" />
          <stop offset="1" stopColor="#000" stopOpacity=".22" />
        </linearGradient>
      </defs>
      {/* sleeves */}
      <path d="M60 20 L20 50 L38 82 L55 70 Z" fill={sleeves} stroke="#000" strokeOpacity=".35" strokeWidth="1.5" />
      <path d="M140 20 L180 50 L162 82 L145 70 Z" fill={sleeves} stroke="#000" strokeOpacity=".35" strokeWidth="1.5" />
      <path d="M22 54 L36 79" stroke={accent} strokeWidth="4" />
      <path d="M178 54 L164 79" stroke={accent} strokeWidth="4" />
      {/* body */}
      <path d={body} fill={shirt} />
      <g clipPath={`url(#body${uid})`}>
        {pattern === 'stripes' && [0, 1, 2, 3, 4].map(i => <rect key={i} x={58 + i * 18} y="0" width="9" height="160" fill={accent} />)}
        {pattern === 'pinstripes' && [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => <rect key={i} x={60 + i * 10} y="0" width="2" height="160" fill={accent} opacity=".8" />)}
        {pattern === 'hoops' && [0, 1, 2, 3, 4].map(i => <rect key={i} x="40" y={28 + i * 26} width="120" height="13" fill={accent} />)}
        {pattern === 'halves' && <rect x="100" y="0" width="60" height="160" fill={accent} />}
        {pattern === 'sash' && <path d="M40 30 L70 10 L170 140 L140 165 Z" fill={accent} />}
        <rect x="40" y="0" width="120" height="160" fill={`url(#shade${uid})`} />
      </g>
      <path d={body} fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="1.5" />
      <path d="M85 10 Q100 24 115 10" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      <text x="100" y="112" textAnchor="middle" fontSize="44" fontWeight="900" fontFamily="system-ui, sans-serif" fill={numColor} stroke={lum(numColor) > 0.5 ? '#0b0f0d' : '#ffffff'} strokeOpacity=".9" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">{number ?? ''}</text>
      {/* shorts */}
      <path d="M58 156 L142 156 L148 204 L108 204 L100 186 L92 204 L52 204 Z" fill={k.shorts || '#0b0f0d'} stroke="#000" strokeOpacity=".35" strokeWidth="1.5" />
      <path d="M52 200 L92 200 M108 200 L148 200" stroke={accent} strokeWidth="3" />
      {/* socks */}
      <rect x="62" y="210" width="22" height="32" rx="4" fill={k.socks || '#0b0f0d'} stroke="#000" strokeOpacity=".35" />
      <rect x="116" y="210" width="22" height="32" rx="4" fill={k.socks || '#0b0f0d'} stroke="#000" strokeOpacity=".35" />
      <rect x="62" y="216" width="22" height="4" fill={accent} />
      <rect x="116" y="216" width="22" height="4" fill={accent} />
    </svg>
  )
}

const DEFAULT_KIT = (t) => ({
  home: { shirt: t?.primary_color || '#10b981', sleeves: t?.primary_color || '#10b981', accent: '#ffffff', shorts: t?.secondary_color || '#0b0f0d', socks: t?.primary_color || '#10b981', pattern: 'solid' },
  away: { shirt: '#ffffff', sleeves: '#ffffff', accent: t?.primary_color || '#10b981', shorts: '#ffffff', socks: '#ffffff', pattern: 'solid' },
  legea_collection: '103 Color',
  notes: '',
})
const PATTERNS = [
  { v: 'solid', l: 'Solid' }, { v: 'stripes', l: 'Stripes' }, { v: 'pinstripes', l: 'Pinstripes' },
  { v: 'hoops', l: 'Hoops' }, { v: 'halves', l: 'Halves' }, { v: 'sash', l: 'Sash' },
]
const ColorRow = ({ label, value, onChange, testid }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[.04] px-3 py-2">
    <span className="text-xs font-semibold text-slate-200">{label}</span>
    <div className="flex items-center gap-2">
      <input data-testid={testid} type="color" value={value} onChange={e => onChange(e.target.value)} aria-label={label} className="h-8 w-10 cursor-pointer rounded-md border border-white/20 bg-transparent" />
      <span className="w-16 font-mono text-[11px] uppercase text-slate-400">{value}</span>
    </div>
  </div>
)

// ================= KIT TAB =================
export const KitTab = ({ team, canEdit, onSaved }) => {
  const [kit, setKit] = useState(() => ({ ...DEFAULT_KIT(team), ...(team.kit || {}) }))
  const [side, setSide] = useState('home')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  useEffect(() => { setKit({ ...DEFAULT_KIT(team), ...(team.kit || {}) }) }, [team.id, team.kit?.updated_at])
  const part = kit[side]
  const setPart = (k, v) => setKit(prev => ({ ...prev, [side]: { ...prev[side], [k]: v } }))
  const save = async () => {
    setBusy(true)
    try { await api('/teams/' + team.id, { method: 'PUT', body: JSON.stringify({ kit }) }); toast.success('Kit saved'); setEditing(false); onSaved?.() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const showEditor = canEdit && editing
  return (
    <div className="space-y-4" data-testid="kit-tab">
      <Card className="relative overflow-hidden rounded-3xl border-white/10 bg-gradient-to-br from-white/[.05] to-white/[.01] p-6 backdrop-blur">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: (kit.home.shirt || '#10b981') + '33' }} />
        <div className="relative mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-300">Club identity</div>
            <h3 className="text-2xl font-black md:text-3xl">IL KIT DELLA SQUADRA</h3>
            <p className="mt-1 text-sm text-slate-300">Home & away colours of {team.name}{team.kit ? '' : ' (not set yet: showing club colours)'}.</p>
          </div>
          {canEdit && !editing && (
            <Button data-testid="kit-edit-btn" onClick={() => setEditing(true)} className="rounded-full bg-white font-bold text-slate-950 hover:bg-slate-200">
              <Palette className="mr-1.5 h-4 w-4" /> Customize kit
            </Button>
          )}
        </div>

        <div className={'relative grid gap-6 ' + (showEditor ? 'lg:grid-cols-[1fr_1.1fr]' : '')}>
          <div className="grid grid-cols-2 items-start gap-4 self-start">
            {['home', 'away'].map(s => (
              <button key={s} type="button" onClick={() => setSide(s)} data-testid={`kit-preview-${s}`}
                className={'group flex flex-col items-center rounded-2xl border p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ' + (showEditor && side === s ? 'border-emerald-400/70 bg-emerald-500/10' : 'border-white/10 bg-black/20 hover:border-white/30')}>
                <motion.div key={JSON.stringify(kit[s])} initial={{ scale: .96, opacity: .6 }} animate={{ scale: 1, opacity: 1 }}>
                  <KitSVG kit={kit[s]} number={10} className="h-44 w-auto md:h-56" />
                </motion.div>
                <div className="mt-2 text-xs font-black uppercase tracking-widest text-slate-200">{s === 'home' ? 'Home kit' : 'Away kit'}</div>
                <div className="text-[10px] capitalize text-slate-400">{kit[s].pattern}</div>
              </button>
            ))}
          </div>

          {showEditor && (
            <div className="space-y-3">
              <div className="flex gap-1 rounded-xl bg-white/5 p-1">
                {['home', 'away'].map(s => (
                  <button key={s} onClick={() => setSide(s)} data-testid={`kit-side-${s}`} className={'flex-1 rounded-lg py-1.5 text-xs font-bold uppercase tracking-wider transition ' + (side === s ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white')}>{s}</button>
                ))}
              </div>
              <ColorRow label="Shirt" value={part.shirt} onChange={v => setPart('shirt', v)} testid="kit-color-shirt" />
              <ColorRow label="Sleeves" value={part.sleeves} onChange={v => setPart('sleeves', v)} testid="kit-color-sleeves" />
              <ColorRow label="Details / pattern" value={part.accent} onChange={v => setPart('accent', v)} testid="kit-color-accent" />
              <ColorRow label="Shorts" value={part.shorts} onChange={v => setPart('shorts', v)} testid="kit-color-shorts" />
              <ColorRow label="Socks" value={part.socks} onChange={v => setPart('socks', v)} testid="kit-color-socks" />
              <div>
                <div className="mb-1.5 text-xs font-semibold text-slate-200">Pattern</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {PATTERNS.map(p => (
                    <button key={p.v} onClick={() => setPart('pattern', p.v)} data-testid={`kit-pattern-${p.v}`}
                      className={'rounded-lg border px-2 py-1.5 text-xs font-bold transition ' + (part.pattern === p.v ? 'border-emerald-400 bg-emerald-500/20 text-white' : 'border-white/10 bg-white/[.03] text-slate-300 hover:border-white/30')}>{p.l}</button>
                  ))}
                </div>
              </div>
              <FieldL label="Notes for the kit supplier (optional)">
                <Textarea rows={2} value={kit.notes || ''} onChange={e => setKit({ ...kit, notes: e.target.value })} placeholder="e.g. sponsor on chest, names on back…" className="border-white/10 bg-white/5" />
              </FieldL>
              <div className="flex gap-2">
                <Button data-testid="kit-save-btn" onClick={save} disabled={busy} className="flex-1 rounded-xl bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400">{busy ? 'Saving…' : 'Save kit'}</Button>
                <Button variant="outline" onClick={() => { setEditing(false); setKit({ ...DEFAULT_KIT(team), ...(team.kit || {}) }) }} className="rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10">Cancel</Button>
              </div>
            </div>
          )}
        </div>
        {kit.notes && !showEditor && <div className="relative mt-4 rounded-xl bg-white/[.04] p-3 text-xs text-slate-300"><span className="font-bold text-slate-100">Notes:</span> {kit.notes}</div>}
      </Card>

      <LegeaKitCTA />
    </div>
  )
}

// ================= LEGEA =================
export const LegeaWordmark = ({ className = 'text-2xl' }) => (
  <span className={'font-black italic tracking-tight text-white ' + className}>LEGEA</span>
)
export const LegeaKitCTA = () => (
  <Card className="relative overflow-hidden rounded-3xl border-white/10 bg-black p-0">
    <img src={TEAMWEAR_IMG} alt="Teamwear jerseys in many colours" className="absolute inset-0 h-full w-full object-cover opacity-45" />
    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
    <div className="relative flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
      <div className="max-w-lg">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">Technical partner</div>
        <div className="mt-1 flex items-center gap-2"><LegeaWordmark className="text-3xl" /><span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-950">103 COLOR</span></div>
        <p className="mt-2 text-sm text-slate-200">Like your design? Make it real. Pick your club colours from the LEGEA 103 Color collection and get the full kit for the whole squad.</p>
      </div>
      <a href={LEGEA_URL} target="_blank" rel="noopener noreferrer" data-testid="legea-kit-link"
        className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:self-center">
        Discover LEGEA kits <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  </Card>
)

export const LegeaPromoCard = ({ onOpen }) => (
  <Card className="relative overflow-hidden rounded-2xl border-white/10 bg-black p-5">
    <img src={TEAMWEAR_IMG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
    <div className="relative">
      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">Technical partner</div>
      <div className="mt-1 flex items-center gap-2"><LegeaWordmark className="text-2xl" /><span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-black text-slate-950">103 COLOR</span></div>
      <p className="mt-2 text-xs text-slate-200">103 colours, one identity. The official teamwear partner of FOOTUP.</p>
      <div className="mt-3 flex gap-2">
        <Button data-testid="legea-promo-open" size="sm" onClick={onOpen} className="rounded-full bg-white font-bold text-slate-950 hover:bg-emerald-300">Explore</Button>
        <a href={LEGEA_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/40 px-3 py-1.5 text-xs font-bold text-white hover:bg-white hover:text-slate-950">legea.it <ExternalLink className="h-3 w-3" /></a>
      </div>
    </div>
  </Card>
)

const LEGEA_LINES = [
  { name: 'Bombonera', tag: 'Bold multi-colour', d: 'Three-colour designs that look great on any pitch. Built for clubs that want to be seen.', sw: ['#1d4ed8', '#facc15', '#0b0f0d'] },
  { name: 'Zebra · Luxiom', tag: 'Iridescent finish', d: 'Dynamic graphics with Luxiom iridescent detailing. A modern kit for modern teams.', sw: ['#111827', '#f97316', '#e5e7eb'] },
  { name: 'Leggenda', tag: 'Timeless', d: 'Clean, classic lines in two-colour combinations. The kit your club will remember.', sw: ['#7f1d1d', '#0b0f0d', '#ffffff'] },
]
const LEGEA_ITEMS = ['Match jerseys', 'Shorts & socks', 'Polo shirts', 'Training jackets', 'Rain jackets', 'Goalkeeper kits']
const SWATCHES = ['#ef4444','#f97316','#f59e0b','#facc15','#84cc16','#22c55e','#10b981','#14b8a6','#06b6d4','#0ea5e9','#3b82f6','#1d4ed8','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e','#7f1d1d','#14532d','#0f172a','#e5e7eb','#ffffff','#0b0f0d']

export const LegeaPartnerView = () => (
  <div className="space-y-6" data-testid="legea-partner-view">
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black">
      <img src={TEAMWEAR_IMG} alt="A row of football jerseys in many colour combinations" className="absolute inset-0 h-full w-full object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/10" />
      <div className="relative max-w-2xl p-8 md:p-12">
        <Badge className="mb-4 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-emerald-200">Technical partner</Badge>
        <div className="flex flex-wrap items-end gap-3">
          <LegeaWordmark className="text-6xl md:text-7xl" />
          <span className="mb-2 rounded-md bg-white px-2 py-1 text-xs font-black text-slate-950">103 COLOR</span>
        </div>
        <h1 className="mt-4 text-2xl font-black text-white md:text-3xl">Your colours. Your identity. On the pitch.</h1>
        <p className="mt-3 text-slate-200">FOOTUP has teamed up with LEGEA, the Italian sportswear brand, as its Technical Partner. With the <span className="font-bold text-white">103 Color</span> collection every amateur club can wear a kit that is truly its own: dozens of models and colour combinations for 5-a-side and 7-a-side teams.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={LEGEA_URL} target="_blank" rel="noopener noreferrer" data-testid="legea-main-link"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            Visit legea.it <ExternalLink className="h-4 w-4" />
          </a>
          <a href={LEGEA_URL} target="_blank" rel="noopener noreferrer" data-testid="legea-collection-link"
            className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 px-6 py-3 text-sm font-black text-white transition hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            Explore the 103 Color collection <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      {LEGEA_LINES.map((l, i) => (
        <motion.div key={l.name} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * .08 }}>
          <Card className="group h-full rounded-2xl border-white/10 bg-white/[.03] p-5 transition hover:border-emerald-400/40 hover:bg-white/[.05]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex -space-x-2">{l.sw.map(c => <span key={c} className="h-8 w-8 rounded-full border-2 border-slate-950" style={{ background: c }} />)}</div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-200">{l.tag}</span>
            </div>
            <div className="text-xl font-black text-white">{l.name}</div>
            <p className="mt-1 text-sm text-slate-300">{l.d}</p>
          </Card>
        </motion.div>
      ))}
    </div>

    <Card className="rounded-3xl border-white/10 bg-white/[.03] p-6">
      <div className="grid gap-6 md:grid-cols-2 md:items-center">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-300">103 colours</div>
          <h2 className="mt-1 text-2xl font-black text-white">Every shade your club needs</h2>
          <p className="mt-2 text-sm text-slate-300">From classic reds and blues to bold fluo tones. Design your kit in your club page (Kit tab), then make it real with LEGEA.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {LEGEA_ITEMS.map(x => <span key={x} className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100"><Shirt className="h-3 w-3 text-emerald-300" /> {x}</span>)}
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {SWATCHES.map((c, i) => (
            <motion.div key={c} initial={{ scale: .6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * .02 }}
              className="aspect-square rounded-lg border border-white/10" style={{ background: c }} title={c} />
          ))}
        </div>
      </div>
    </Card>

    <div className="grid gap-4 md:grid-cols-3">
      {[
        { i: Palette, t: 'Design it in FOOTUP', d: 'Captains set home and away colours, patterns and details in the Kit tab of the club page.' },
        { i: Shirt, t: 'Pick your LEGEA model', d: 'Browse the 103 Color collection on legea.it and choose the model that fits your design.' },
        { i: Handshake, t: 'Wear it every match', d: 'Your kit is shown on your club page and on every player profile.' },
      ].map((s, i) => (
        <Card key={s.t} className="rounded-2xl border-white/10 bg-white/[.03] p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300"><s.i className="h-4 w-4" /></div>
            <span className="text-xs font-black text-slate-400">STEP {i + 1}</span>
          </div>
          <div className="font-black text-white">{s.t}</div>
          <div className="mt-1 text-sm text-slate-300">{s.d}</div>
        </Card>
      ))}
    </div>
    <div className="text-center text-[11px] text-slate-500">LEGEA and 103 Color are trademarks of their respective owner. Purchases happen on the official LEGEA website.</div>
  </div>
)

// ================= EDIT PROFILE =================
export const EditProfileDialog = ({ open, onOpenChange, me, onSaved }) => {
  const [f, setF] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (open && me) setF({
      name: me.name || '', avatar_url: me.avatar_url || '', bio: me.bio || '', position: me.position || 'MID',
      preferred_foot: me.preferred_foot || 'right', jersey_number: me.jersey_number ?? '', city: me.city || '', birth_year: me.birth_year || '',
    })
  }, [open, me])
  const save = async () => {
    setBusy(true)
    try { await api('/me/profile', { method: 'PUT', body: JSON.stringify(f) }); toast.success('Profile updated'); onOpenChange(false); onSaved?.() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit player profile</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <FieldL label="Full name"><Input data-testid="profile-name" value={f.name || ''} onChange={e => setF({ ...f, name: e.target.value })} className="border-white/10 bg-white/5" /></FieldL>
          <FieldL label="Jersey number (1-99)"><Input data-testid="profile-jersey" type="number" min={1} max={99} value={f.jersey_number ?? ''} onChange={e => setF({ ...f, jersey_number: e.target.value })} className="border-white/10 bg-white/5" /></FieldL>
          <FieldL label="Position">
            <Select value={f.position || 'MID'} onValueChange={v => setF({ ...f, position: v })}>
              <SelectTrigger data-testid="profile-position" className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(POS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </FieldL>
          <FieldL label="Preferred foot">
            <Select value={f.preferred_foot || 'right'} onValueChange={v => setF({ ...f, preferred_foot: v })}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="right">Right</SelectItem><SelectItem value="left">Left</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
            </Select>
          </FieldL>
          <FieldL label="City"><Input value={f.city || ''} onChange={e => setF({ ...f, city: e.target.value })} className="border-white/10 bg-white/5" /></FieldL>
          <FieldL label="Birth year"><Input type="number" value={f.birth_year || ''} onChange={e => setF({ ...f, birth_year: e.target.value })} className="border-white/10 bg-white/5" /></FieldL>
          <div className="md:col-span-2"><FieldL label="Photo URL"><Input data-testid="profile-photo" value={f.avatar_url || ''} onChange={e => setF({ ...f, avatar_url: e.target.value })} placeholder="https://…" className="border-white/10 bg-white/5" /></FieldL></div>
          <div className="md:col-span-2"><FieldL label="Bio"><Textarea rows={3} value={f.bio || ''} onChange={e => setF({ ...f, bio: e.target.value })} placeholder="Tell clubs who you are on the pitch…" className="border-white/10 bg-white/5" /></FieldL></div>
        </div>
        <Button data-testid="profile-save" onClick={save} disabled={busy} className="mt-2 w-full rounded-xl bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400">{busy ? 'Saving…' : 'Save profile'}</Button>
      </DialogContent>
    </Dialog>
  )
}

// ================= PLAYER PROFILE =================
export const PlayerProfileView = ({ userId, me, onBack, onSelectTeam, onMeChanged, onGoDiscover }) => {
  const [data, setData] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [myReqs, setMyReqs] = useState([])
  const isMe = me?.id === userId
  const load = async () => {
    try { setData(await api('/players/' + userId)) } catch (e) { toast.error(e.message) }
    if (isMe) api('/me/join-requests').then(r => setMyReqs(r.requests || [])).catch(() => {})
  }
  useEffect(() => { setData(null); load() }, [userId])
  if (!data) return <div className="h-96 animate-pulse rounded-3xl bg-white/5" />
  const p = data.player, club = data.club, s = data.stats
  const isFree = p.status === 'free_agent'
  const age = p.birth_year ? new Date().getFullYear() - p.birth_year : null
  const jersey = club?.jersey_number ?? p.jersey_number
  const c1 = club?.primary_color || '#0ea5e9', c2 = club?.secondary_color || '#10b981'

  const leave = async () => {
    if (!confirm('Leave ' + club.name + '? You will become a free agent.')) return
    try { await api('/me/leave-club', { method: 'POST' }); toast.success('You left the club'); load(); onMeChanged?.() } catch (e) { toast.error(e.message) }
  }
  const cancelReq = async (id) => {
    try { await api(`/join-requests/${id}/cancel`, { method: 'POST' }); toast.success('Request cancelled'); load(); onMeChanged?.() } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6" data-testid="player-profile-view">
      {onBack && <Button variant="ghost" onClick={onBack} className="text-slate-300 hover:text-white"><ChevronRight className="h-4 w-4 rotate-180" /> Back</Button>}

      <div className="relative overflow-hidden rounded-3xl border border-white/10" style={{ background: `linear-gradient(135deg, ${c1}40, #050810 55%, ${c2}30)` }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: c1 + '40' }} />
        <div className="relative grid gap-6 p-6 md:grid-cols-[auto_1fr] md:p-8">
          {/* FUT-style card */}
          <motion.div initial={{ rotateY: -12, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: .5 }}
            className="relative mx-auto w-56 overflow-hidden rounded-[28px] border-2 p-4 shadow-2xl"
            style={{ borderColor: c1, background: `linear-gradient(160deg, ${c1}, #0b0f0d 70%)` }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-5xl font-black leading-none text-white" data-testid="player-jersey">{jersey ?? '–'}</div>
                <div className="mt-1 text-sm font-black text-white/90">{p.position || '—'}</div>
              </div>
              {club ? <ClubCrest club={club} size="h-11 w-11" /> : <div className="grid h-11 w-11 place-items-center rounded-xl border border-sky-300/60 bg-sky-500/20 text-[9px] font-black text-sky-100">FREE</div>}
            </div>
            <div className="my-3 flex justify-center">
              <Avatar className="h-28 w-28 border-4 border-white/20 shadow-xl">
                <AvatarImage src={p.avatar_url} alt={p.name} />
                <AvatarFallback className="bg-black/40 text-4xl font-black text-white">{(p.name || '?')[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <div className="truncate text-center text-lg font-black uppercase tracking-wide text-white" data-testid="player-name">{p.name}</div>
            <div className="mt-2 grid grid-cols-3 gap-1 border-t border-white/20 pt-2 text-center">
              <div><div className="text-lg font-black text-white">{s.goals}</div><div className="text-[9px] font-bold text-white/70">GOALS</div></div>
              <div><div className="text-lg font-black text-white">{s.assists}</div><div className="text-[9px] font-bold text-white/70">ASSISTS</div></div>
              <div><div className="text-lg font-black text-white">{s.mvps}</div><div className="text-[9px] font-bold text-white/70">MVP</div></div>
            </div>
          </motion.div>

          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              {isFree ? <FreeAgentBadge /> : <RoleBadge role={p.club_role} />}
              {p.is_founder && <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/50 bg-fuchsia-500/15 px-3 py-1 text-xs font-black text-fuchsia-200"><Star className="h-3 w-3" /> Founder</span>}
            </div>
            <h1 className="mt-3 text-4xl font-black text-white md:text-5xl">{p.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-200">
              {p.position && <span className="inline-flex items-center gap-1"><Target className="h-4 w-4 text-emerald-300" /> {POS_LABEL[p.position]}</span>}
              {jersey && <span className="inline-flex items-center gap-1"><Hash className="h-4 w-4 text-emerald-300" /> {jersey}</span>}
              {p.preferred_foot && <span className="inline-flex items-center gap-1 capitalize"><Footprints className="h-4 w-4 text-emerald-300" /> {p.preferred_foot} foot</span>}
              {p.city && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-emerald-300" /> {p.city}</span>}
              {age && <span>{age} y/o</span>}
            </div>
            {p.bio && <p className="mt-3 max-w-xl text-sm text-slate-300">{p.bio}</p>}

            {club ? (
              <button onClick={() => onSelectTeam?.(club.id)} data-testid="player-club-link"
                className="mt-5 flex max-w-md items-center gap-3 rounded-2xl border border-white/15 bg-black/30 p-3 text-left transition hover:border-white/40 hover:bg-black/50">
                <ClubCrest club={club} size="h-12 w-12" text="text-lg" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Club</div>
                  <div className="truncate font-black text-white">{club.name}</div>
                  <div className="text-xs text-slate-300">{club.division?.name} · {club.rating} ELO · OVR {club.reputation?.overall}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ) : (
              <div className="mt-5 max-w-md rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4">
                <div className="font-black text-sky-100">Free agent</div>
                <div className="text-xs text-sky-100/80">{isMe ? 'You are not in a club yet. Find one and send a request to join.' : 'This player is not in a club and is open to offers.'}</div>
                {isMe && onGoDiscover && <Button data-testid="find-club-btn" size="sm" onClick={onGoDiscover} className="mt-3 rounded-full bg-white font-bold text-slate-950 hover:bg-sky-200"><Search className="mr-1.5 h-3.5 w-3.5" /> Find a club</Button>}
              </div>
            )}

            {isMe && (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button data-testid="edit-profile-btn" onClick={() => setEditOpen(true)} className="rounded-full bg-white font-bold text-slate-950 hover:bg-slate-200"><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit profile</Button>
                {club && p.club_role === 'player' && <Button data-testid="leave-club-btn" variant="outline" onClick={leave} className="rounded-full border-rose-400/60 bg-transparent text-rose-200 hover:bg-rose-500 hover:text-white"><LogOut className="mr-1.5 h-3.5 w-3.5" /> Leave club</Button>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {[
          { l: 'Matches', v: s.matches, i: Shield }, { l: 'Goals', v: s.goals, i: Target }, { l: 'Assists', v: s.assists, i: Zap },
          { l: 'MVP', v: s.mvps, i: Award }, { l: 'Yellow', v: s.yellows, i: Clock }, { l: 'Red', v: s.reds, i: X },
        ].map(x => (
          <Card key={x.l} className="rounded-2xl border-white/10 bg-white/[.03] p-4">
            <x.i className="mb-1.5 h-4 w-4 text-slate-400" />
            <div className="text-xs text-slate-400">{x.l}</div>
            <div className="text-2xl font-black text-white">{x.v}</div>
          </Card>
        ))}
      </div>

      {club?.kit && (
        <Card className="rounded-2xl border-white/10 bg-white/[.03] p-5">
          <div className="mb-3 flex items-center gap-2"><Shirt className="h-4 w-4 text-emerald-300" /><h3 className="text-sm font-black uppercase tracking-wide">Match kit</h3></div>
          <div className="flex gap-6">
            <div className="text-center"><KitSVG kit={club.kit.home} number={jersey} className="h-32 w-auto" /><div className="text-[10px] font-bold uppercase text-slate-400">Home</div></div>
            <div className="text-center"><KitSVG kit={club.kit.away} number={jersey} className="h-32 w-auto" /><div className="text-[10px] font-bold uppercase text-slate-400">Away</div></div>
          </div>
        </Card>
      )}

      {isMe && myReqs.length > 0 && (
        <Card className="rounded-2xl border-white/10 bg-white/[.03] p-5">
          <div className="mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4 text-emerald-300" /><h3 className="text-sm font-black uppercase tracking-wide">My join requests</h3></div>
          <div className="space-y-2">
            {myReqs.map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                <button onClick={() => onSelectTeam?.(r.club_id)} className="text-left">
                  <div className="text-sm font-bold text-white">{r.club_name}</div>
                  <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</div>
                </button>
                <div className="flex items-center gap-2">
                  <Badge className={'capitalize ' + (r.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-200' : r.status === 'pending' ? 'bg-amber-500/20 text-amber-200' : 'bg-slate-500/20 text-slate-300')}>{r.status}</Badge>
                  {r.status === 'pending' && <Button size="sm" variant="ghost" onClick={() => cancelReq(r.id)} className="h-7 text-xs text-slate-300 hover:text-white">Cancel</Button>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isMe && <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} me={{ ...me, ...p }} onSaved={() => { load(); onMeChanged?.() }} />}
    </div>
  )
}

// ================= JOIN REQUEST DIALOG =================
export const JoinRequestDialog = ({ open, onOpenChange, club, me, onDone }) => {
  const [f, setF] = useState({ message: '', position: 'MID', jersey_number: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setF({ message: '', position: me?.position || 'MID', jersey_number: me?.jersey_number ?? '' }) }, [open])
  const send = async () => {
    setBusy(true)
    try { await api(`/teams/${club.id}/join-request`, { method: 'POST', body: JSON.stringify(f) }); toast.success('Request sent to ' + club.name); onOpenChange(false); onDone?.() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  if (!club) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-3"><ClubCrest club={club} size="h-9 w-9" /> Join {club.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FieldL label="Position">
              <Select value={f.position} onValueChange={v => setF({ ...f, position: v })}>
                <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(POS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </FieldL>
            <FieldL label="Preferred number"><Input type="number" min={1} max={99} value={f.jersey_number} onChange={e => setF({ ...f, jersey_number: e.target.value })} className="border-white/10 bg-white/5" /></FieldL>
          </div>
          <FieldL label="Message to the captain"><Textarea data-testid="join-message" rows={3} value={f.message} onChange={e => setF({ ...f, message: e.target.value })} placeholder="Hi! I play every Tuesday and Thursday…" className="border-white/10 bg-white/5" /></FieldL>
          <Button data-testid="join-send" onClick={send} disabled={busy} className="w-full rounded-xl bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400">{busy ? 'Sending…' : 'Send request'}</Button>
          <div className="text-center text-[11px] text-slate-400">You can be in one club at a time.</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ================= CLUB MEMBERS + REQUESTS (Team page) =================
export const ClubMembersPanel = ({ teamId, members = [], myRole, meId, onChanged, onSelectPlayer }) => {
  const [reqs, setReqs] = useState([])
  const isCaptain = myRole === 'captain'
  const loadReqs = () => { if (isCaptain) api(`/teams/${teamId}/join-requests`).then(r => setReqs(r.requests || [])).catch(() => {}) }
  useEffect(() => { loadReqs() }, [teamId, isCaptain])
  const act = async (id, action) => {
    try { await api(`/join-requests/${id}/${action}`, { method: 'POST' }); toast.success(action === 'accept' ? 'Player joined the club' : 'Request declined'); loadReqs(); onChanged?.() }
    catch (e) { toast.error(e.message) }
  }
  const remove = async (uid, name) => {
    if (!confirm(`Remove ${name} from the club?`)) return
    try { await api(`/teams/${teamId}/members/${uid}`, { method: 'DELETE' }); toast.success('Member removed'); onChanged?.() } catch (e) { toast.error(e.message) }
  }
  const transfer = async (uid, name) => {
    if (!confirm(`Make ${name} the new captain? You will become a player.`)) return
    try { await api(`/teams/${teamId}/transfer-captain`, { method: 'POST', body: JSON.stringify({ user_id: uid }) }); toast.success(name + ' is the new captain'); onChanged?.() } catch (e) { toast.error(e.message) }
  }
  return (
    <div className="space-y-4">
      {isCaptain && (
        <Card className="rounded-2xl border-amber-400/30 bg-amber-500/[.06] p-5" data-testid="join-requests-panel">
          <div className="mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4 text-amber-300" /><h3 className="text-sm font-black uppercase tracking-wide">Join requests</h3>
            {reqs.length > 0 && <span className="rounded-full bg-amber-400 px-2 text-xs font-black text-slate-950">{reqs.length}</span>}</div>
          {reqs.length === 0 ? <div className="text-sm text-slate-400">No pending requests. Keep recruiting open so free agents can find your club in Discover.</div> : (
            <div className="space-y-2">
              {reqs.map(r => (
                <div key={r.id} className="flex flex-col gap-3 rounded-xl bg-black/30 p-3 md:flex-row md:items-center md:justify-between">
                  <button onClick={() => onSelectPlayer?.(r.user_id)} className="flex items-center gap-3 text-left">
                    <Avatar className="h-10 w-10"><AvatarImage src={r.user?.avatar_url} /><AvatarFallback className="bg-white/10 font-bold">{(r.user_name || '?')[0]}</AvatarFallback></Avatar>
                    <div>
                      <div className="text-sm font-bold text-white">{r.user_name} {r.jersey_number && <span className="text-slate-400">#{r.jersey_number}</span>}</div>
                      <div className="text-xs text-slate-300">{POS_LABEL[r.position] || 'Any position'}{r.message ? ` · “${r.message}”` : ''}</div>
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <Button data-testid={`accept-${r.id}`} size="sm" onClick={() => act(r.id, 'accept')} className="rounded-full bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400"><Check className="mr-1 h-3.5 w-3.5" /> Accept</Button>
                    <Button data-testid={`reject-${r.id}`} size="sm" variant="outline" onClick={() => act(r.id, 'reject')} className="rounded-full border-white/30 bg-transparent text-white hover:bg-white/10"><X className="mr-1 h-3.5 w-3.5" /> Decline</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2"><Users className="h-4 w-4 text-emerald-300" /><h3 className="text-sm font-black uppercase tracking-wide">Club members ({members.length})</h3></div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {members.map(m => (
            <Card key={m.id} className="group flex items-center gap-3 rounded-2xl border-white/10 bg-white/[.03] p-3 transition hover:border-emerald-400/40">
              <button onClick={() => onSelectPlayer?.(m.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" data-testid={`member-${m.id}`}>
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-white/10"><AvatarImage src={m.avatar_url} /><AvatarFallback className="bg-emerald-500/20 font-black text-white">{(m.name || '?')[0]}</AvatarFallback></Avatar>
                  {m.jersey_number && <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-slate-950 text-[9px] font-black text-emerald-300">{m.jersey_number}</span>}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-white">{m.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5"><RoleBadge role={m.role} small />{m.position && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">{m.position}</span>}</div>
                </div>
              </button>
              {isCaptain && m.id !== meId && (
                <div className="flex flex-col gap-1 opacity-80 group-hover:opacity-100">
                  <button onClick={() => transfer(m.id, m.name)} title="Make captain" aria-label={`Make ${m.name} captain`} className="rounded-md p-1 text-amber-300 hover:bg-amber-500/20"><Crown className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(m.id, m.name)} title="Remove" aria-label={`Remove ${m.name}`} className="rounded-md p-1 text-rose-300 hover:bg-rose-500/20"><X className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// ================= DISCOVER =================
export const DiscoverView = ({ me, role, myRequests = [], onSelectTeam, onSelectPlayer, onChanged }) => {
  const [tab, setTab] = useState('clubs')
  const [q, setQ] = useState('')
  const [clubs, setClubs] = useState([])
  const [players, setPlayers] = useState([])
  const [status, setStatus] = useState('free_agent')
  const [position, setPosition] = useState('all')
  const [recruitingOnly, setRecruitingOnly] = useState(false)
  const [joinClub, setJoinClub] = useState(null)
  const [loading, setLoading] = useState(true)
  const pendingIds = new Set(myRequests.filter(r => r.status === 'pending').map(r => r.club_id))
  const isFree = role === 'free_agent'

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        if (tab === 'clubs') {
          const r = await api(`/teams?q=${encodeURIComponent(q)}${recruitingOnly ? '&recruiting=1' : ''}`); setClubs(r.teams || [])
        } else {
          const r = await api(`/discover/players?q=${encodeURIComponent(q)}&status=${status}${position !== 'all' ? '&position=' + position : ''}`); setPlayers(r.players || [])
        }
      } catch {} finally { setLoading(false) }
    }, 200)
    return () => clearTimeout(t)
  }, [tab, q, status, position, recruitingOnly])

  return (
    <div className="space-y-5" data-testid="discover-view">
      <div>
        <div className="flex items-center gap-2"><Search className="h-6 w-6 text-emerald-300" /><h1 className="text-3xl font-black">Discover</h1></div>
        <p className="text-sm text-slate-300">Find a club to join or scout free agents for your squad.</p>
      </div>

      {isFree && (
        <Card className="flex flex-col gap-2 rounded-2xl border-sky-400/30 bg-sky-500/10 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3"><FreeAgentBadge /><span className="text-sm text-sky-50">You are a free agent. Send a request to a club; when the captain accepts, you join the squad.</span></div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <TabsList className="rounded-2xl bg-white/5 p-1">
            <TabsTrigger data-testid="discover-tab-clubs" value="clubs" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-950"><Shield className="mr-1.5 h-3.5 w-3.5" /> Clubs</TabsTrigger>
            <TabsTrigger data-testid="discover-tab-players" value="players" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-950"><Users className="mr-1.5 h-3.5 w-3.5" /> Players</TabsTrigger>
          </TabsList>
          <div className="relative md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input data-testid="discover-search" value={q} onChange={e => setQ(e.target.value)} placeholder={tab === 'clubs' ? 'Search clubs or cities…' : 'Search players or cities…'} className="border-white/10 bg-white/5 pl-9" />
          </div>
        </div>

        <TabsContent value="clubs" className="mt-4 space-y-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={recruitingOnly} onChange={e => setRecruitingOnly(e.target.checked)} className="h-4 w-4 accent-emerald-500" /> Recruiting only
          </label>
          {loading ? <div className="h-40 animate-pulse rounded-2xl bg-white/5" /> : clubs.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-slate-400">No clubs found.</div> : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {clubs.map(c => {
                const pending = pendingIds.has(c.id)
                return (
                  <Card key={c.id} className="flex flex-col rounded-2xl border-white/10 bg-white/[.03] p-4 transition hover:border-emerald-400/40" data-testid={`discover-club-${c.id}`}>
                    <button onClick={() => onSelectTeam(c.id)} className="flex items-center gap-3 text-left">
                      <ClubCrest club={c} size="h-12 w-12" text="text-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-black text-white">{c.name}</div>
                        <div className="text-xs text-slate-300">{c.city || '—'} · {c.division?.name}</div>
                      </div>
                      <div className="text-right"><div className="text-lg font-black text-white">{c.reputation?.overall ?? '–'}</div><div className="text-[9px] font-bold text-slate-400">OVR</div></div>
                    </button>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {c.member_count} member{c.member_count === 1 ? "" : "s"}</span>
                      <span>·</span><span>{c.rating} ELO</span>
                      {c.recruiting && <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-200">Recruiting</span>}
                    </div>
                    {isFree && (
                      <Button data-testid={`request-join-${c.id}`} size="sm" disabled={pending || !c.recruiting} onClick={() => setJoinClub(c)}
                        className={'mt-3 rounded-full font-bold ' + (pending ? 'bg-amber-500/20 text-amber-200' : 'bg-white text-slate-950 hover:bg-emerald-300')}>
                        {pending ? <><Clock className="mr-1.5 h-3.5 w-3.5" /> Request pending</> : c.recruiting ? <><UserPlus className="mr-1.5 h-3.5 w-3.5" /> Request to join</> : 'Not recruiting'}
                      </Button>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="players" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {[{ v: 'free_agent', l: 'Free agents' }, { v: 'club_member', l: 'In a club' }, { v: 'all', l: 'All' }].map(x => (
              <button key={x.v} onClick={() => setStatus(x.v)} className={'rounded-full border px-3 py-1 text-xs font-bold transition ' + (status === x.v ? 'border-white bg-white text-slate-950' : 'border-white/20 text-slate-200 hover:border-white/50')}>{x.l}</button>
            ))}
            <span className="mx-1 w-px bg-white/10" />
            {['all', 'GK', 'DEF', 'MID', 'FWD'].map(x => (
              <button key={x} onClick={() => setPosition(x)} className={'rounded-full border px-3 py-1 text-xs font-bold transition ' + (position === x ? 'border-emerald-400 bg-emerald-500/20 text-white' : 'border-white/20 text-slate-200 hover:border-white/50')}>{x === 'all' ? 'Any role' : x}</button>
            ))}
          </div>
          {loading ? <div className="h-40 animate-pulse rounded-2xl bg-white/5" /> : players.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-slate-400">No players found.</div> : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {players.map(p => (
                <button key={p.id} onClick={() => onSelectPlayer(p.id)} data-testid={`discover-player-${p.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 text-left transition hover:border-emerald-400/40 hover:bg-white/[.05]">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white/10"><AvatarImage src={p.avatar_url} /><AvatarFallback className="bg-white/10 font-black text-white">{(p.name || '?')[0]}</AvatarFallback></Avatar>
                    {p.jersey_number && <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-slate-950 text-[9px] font-black text-emerald-300">{p.jersey_number}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-white">{p.name}{p.id === me?.id && <span className="ml-1 text-xs font-normal text-slate-400">(you)</span>}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {p.status === 'free_agent' ? <FreeAgentBadge small /> : <span className="inline-flex max-w-[140px] items-center gap-1 truncate rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-100"><Shield className="h-2.5 w-2.5" /> {p.club?.name}</span>}
                      {p.position && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">{p.position}</span>}
                      {p.city && <span className="text-[10px] text-slate-400">{p.city}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <JoinRequestDialog open={!!joinClub} onOpenChange={(o) => !o && setJoinClub(null)} club={joinClub} me={me} onDone={onChanged} />
    </div>
  )
}
