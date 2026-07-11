'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import {
  Home, Users, Swords, Trophy, Bell, Search, LogOut, Plus, Heart, MessageCircle,
  Share2, Camera, Flag, MapPin, Calendar, Clock, Shield, Award, TrendingUp,
  Target, Zap, Star, ChevronRight, X, Check, Circle, Menu, Sparkles, Crown,
  BarChart3, UserPlus, Settings, Play, Gem, Gift, Rocket, Lock, CreditCard,
  Copy, LineChart as LineChartIcon, PieChart as PieChartIcon, ShieldCheck
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

// -------- Helpers --------
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

const DIVISION_COLORS = {
  1:'from-amber-400 to-yellow-600', 2:'from-rose-500 to-red-700', 3:'from-fuchsia-500 to-purple-700',
  4:'from-sky-400 to-blue-700', 5:'from-cyan-400 to-teal-600', 6:'from-emerald-400 to-green-700',
  7:'from-lime-400 to-green-600', 8:'from-yellow-400 to-amber-600', 9:'from-slate-400 to-slate-600', 10:'from-neutral-500 to-neutral-700'
}
const HERO_IMAGE = 'https://images.unsplash.com/photo-1600442715978-d0268caa17f5?w=1920&q=80&auto=format&fit=crop'
const COVER_DEFAULT = 'https://images.unsplash.com/photo-1502481686408-d428268c24ff?w=1600&q=80&auto=format&fit=crop'
const POST_IMG = 'https://images.unsplash.com/photo-1567989995326-46ed902b0494?w=1200&q=80&auto=format&fit=crop'

const divisionOf = (rating) => {
  if (rating >= 2000) return 1
  if (rating >= 1800) return 2
  if (rating >= 1650) return 3
  if (rating >= 1500) return 4
  if (rating >= 1400) return 5
  if (rating >= 1300) return 6
  if (rating >= 1200) return 7
  if (rating >= 1100) return 8
  if (rating >= 1000) return 9
  return 10
}

// -------- Root App --------
export default function App() {
  const [user, setUser] = useState(null)
  const [team, setTeam] = useState(null)
  const [view, setView] = useState('feed') // feed | myteam | challenges | leaderboard | matches | pricing | admin | referrals
  const [authOpen, setAuthOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState(null)

  const refresh = async () => {
    try {
      const { user, team } = await api('/auth/me')
      setUser(user); setTeam(team || null)
    } catch { setUser(null) }
  }
  useEffect(() => { refresh().finally(() => setLoading(false)) }, [])

  if (loading) return <SplashLoading />
  if (!user) return (
    <>
      <Landing onGetStarted={() => setAuthOpen(true)} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} onSuccess={() => { setAuthOpen(false); refresh() }} />
      <Toaster theme="dark" position="top-center" richColors />
    </>
  )

  const isPro = user.plan === 'pro'

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#0b1220_0%,#050810_60%,#000_100%)] text-slate-100">
      <TopBar user={user} team={team} view={view} setView={setView} onLogout={async () => { await api('/auth/logout', {method:'POST'}); refresh() }} onSelectTeam={setSelectedTeamId} onUpgrade={() => setUpgradeOpen(true)} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-8">
        {selectedTeamId ? (
          <TeamPage teamId={selectedTeamId} onBack={() => setSelectedTeamId(null)} me={user} myTeam={team} onFollowChanged={refresh} onUpgrade={() => setUpgradeOpen(true)} />
        ) : view === 'feed' ? (
          <FeedView user={user} team={team} onSelectTeam={setSelectedTeamId} onGoCreate={() => setView('myteam')} />
        ) : view === 'myteam' ? (
          <MyTeamView user={user} team={team} onTeamCreated={refresh} onSelectTeam={setSelectedTeamId} onUpgrade={() => setUpgradeOpen(true)} />
        ) : view === 'challenges' ? (
          <ChallengesView team={team} onNeedTeam={() => setView('myteam')} />
        ) : view === 'matches' ? (
          <MatchesView team={team} onSelectTeam={setSelectedTeamId} />
        ) : view === 'leaderboard' ? (
          <LeaderboardView onSelectTeam={setSelectedTeamId} />
        ) : view === 'pricing' ? (
          <PricingView user={user} onUpgrade={() => setUpgradeOpen(true)} onRefresh={refresh} />
        ) : view === 'referrals' ? (
          <ReferralsView user={user} onUpgrade={() => setUpgradeOpen(true)} />
        ) : view === 'admin' ? (
          <AdminView />
        ) : null}
      </main>

      <BottomNav view={view} setView={(v) => { setSelectedTeamId(null); setView(v) }} isPro={isPro} isAdmin={user.is_admin} />
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} onSuccess={() => { setUpgradeOpen(false); refresh() }} />
      <Toaster theme="dark" position="top-center" richColors />
    </div>
  )
}

// -------- Splash --------
const SplashLoading = () => (
  <div className="grid min-h-screen place-items-center bg-black">
    <motion.div initial={{scale:.8, opacity:0}} animate={{scale:1, opacity:1}} transition={{duration:.6}} className="text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-2xl shadow-emerald-500/30">
        <Zap className="h-8 w-8 text-slate-950" />
      </div>
      <div className="text-3xl font-black tracking-tight text-white">FOOT<span className="text-emerald-400">UP</span></div>
    </motion.div>
  </div>
)

// -------- Landing --------
const Landing = ({ onGetStarted }) => (
  <div className="min-h-screen overflow-hidden bg-black text-white">
    <div className="relative">
      <div className="absolute inset-0 -z-0">
        <img src={HERO_IMAGE} className="h-[95vh] w-full object-cover opacity-40" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,.25),transparent_40%),radial-gradient(circle_at_70%_60%,rgba(14,165,233,.2),transparent_45%)]" />
      </div>
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-500/30">
            <Zap className="h-5 w-5 text-slate-950" />
          </div>
          <span className="text-2xl font-black tracking-tight">FOOT<span className="text-emerald-400">UP</span></span>
        </div>
        <Button onClick={onGetStarted} className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20">
          Sign in
        </Button>
      </nav>

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-32 md:pt-28">
        <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:.7}}>
          <Badge className="mb-6 rounded-full bg-emerald-500/15 px-4 py-1.5 text-emerald-300 border border-emerald-500/30 backdrop-blur">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> The social network for amateur football
          </Badge>
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
            Your team.<br />Your ranking.<br />
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">Your legacy.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300 md:text-xl">
            Create your 5-a-side or 7-a-side team, challenge rivals across the city, climb 10 divisions with a real ELO system, and become the best amateur football team.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={onGetStarted} className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-8 text-base font-bold text-slate-950 shadow-2xl shadow-emerald-500/30 hover:opacity-90">
              Create your team <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={onGetStarted} className="rounded-full border-white/30 bg-white/5 backdrop-blur hover:bg-white/10 text-white">
              Explore ranking
            </Button>
          </div>

          <div className="mt-14 grid max-w-3xl grid-cols-3 gap-4">
            {[
              { k: '10', v: 'Divisions', icon: Crown },
              { k: 'ELO', v: 'Real ranking', icon: TrendingUp },
              { k: '∞', v: 'Challenges', icon: Swords },
            ].map((s, i) => (
              <motion.div key={i} initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.2+i*.1}} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                <s.icon className="mb-2 h-5 w-5 text-emerald-400" />
                <div className="text-3xl font-black">{s.k}</div>
                <div className="text-sm text-slate-400">{s.v}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>

    <div className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="mb-3 text-4xl font-black md:text-5xl">Everything you need. <span className="text-emerald-400">On the pitch.</span></h2>
      <p className="mb-12 max-w-2xl text-slate-400">A premium platform built for captains and their teams.</p>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[
          { i: Shield, t: 'Team Identity', d: 'Build a team profile with logo, colors, roster and match history.' },
          { i: Swords, t: 'Match Challenges', d: 'Post public challenges. Accept in one tap. Set date, city and skill level.' },
          { i: Trophy, t: 'ELO Ranking', d: 'Every team starts at 1000 pts. Beat stronger teams to climb faster.' },
          { i: BarChart3, t: 'Leaderboards', d: 'Global rankings for teams, scorers, assists and streaks.' },
          { i: Users, t: 'Social Feed', d: 'Photos, results, celebrations. Follow rivals. Talk trash respectfully.' },
          { i: Award, t: '10 Divisions', d: 'From Division 10 to Division 1. Promotion, relegation, real stakes.' },
        ].map((f, i) => (
          <motion.div key={i} initial={{y:20,opacity:0}} whileInView={{y:0,opacity:1}} viewport={{once:true}} transition={{delay:i*.05}}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.05] to-white/[.02] p-7 backdrop-blur-md transition hover:border-emerald-500/40">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl transition group-hover:bg-emerald-500/30" />
            <f.i className="mb-4 h-8 w-8 text-emerald-400" />
            <div className="mb-2 text-xl font-bold">{f.t}</div>
            <div className="text-sm text-slate-400">{f.d}</div>
          </motion.div>
        ))}
      </div>
    </div>

    <div className="mx-auto max-w-4xl px-6 pb-24">
      <Card className="overflow-hidden rounded-3xl border-white/10 bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-transparent p-10 text-center backdrop-blur">
        <Crown className="mx-auto mb-4 h-10 w-10 text-emerald-300" />
        <h3 className="text-3xl font-black md:text-4xl">Ready to write your team's story?</h3>
        <p className="mx-auto mt-3 max-w-lg text-slate-300">Join FOOTUP today. It's free. It's ambitious. It's your football.</p>
        <Button size="lg" onClick={onGetStarted} className="mt-6 rounded-full bg-white px-8 text-slate-950 hover:bg-slate-100">
          Get started free
        </Button>
      </Card>
    </div>
  </div>
)

// -------- Auth --------
const AuthDialog = ({ open, onOpenChange, onSuccess }) => {
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ email:'', password:'', name:'' })
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try {
      await api('/auth/' + mode, { method:'POST', body: JSON.stringify(f) })
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!')
      onSuccess()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500">
              <Zap className="h-4 w-4 text-slate-950" />
            </div>
            <span className="text-xl font-black">FOOT<span className="text-emerald-400">UP</span></span>
          </div>
          <DialogTitle className="text-2xl">{mode === 'login' ? 'Welcome back, captain' : 'Create your captain account'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {mode === 'register' && (
            <Input placeholder="Your name" value={f.name} onChange={e => setF({...f, name:e.target.value})} className="border-white/10 bg-white/5" />
          )}
          <Input placeholder="Email" type="email" value={f.email} onChange={e => setF({...f, email:e.target.value})} className="border-white/10 bg-white/5" />
          <Input placeholder="Password" type="password" value={f.password} onChange={e => setF({...f, password:e.target.value})} className="border-white/10 bg-white/5" />
          <Button onClick={submit} disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold text-slate-950 hover:opacity-90">
            {busy ? 'Please wait…' : (mode === 'login' ? 'Sign in' : 'Create account')}
          </Button>
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full text-sm text-slate-400 hover:text-white">
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// -------- Layout: TopBar + BottomNav --------
const TopBar = ({ user, team, view, setView, onLogout, onSelectTeam, onUpgrade }) => {
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const isPro = user?.plan === 'pro'
  useEffect(() => {
    if (!searchOpen) return
    const t = setTimeout(async () => {
      try { const { teams } = await api('/teams?q=' + encodeURIComponent(q)); setResults(teams || []) } catch {}
    }, 200)
    return () => clearTimeout(t)
  }, [q, searchOpen])

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button onClick={() => setView('feed')} className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500">
            <Zap className="h-4 w-4 text-slate-950" />
          </div>
          <span className="text-xl font-black">FOOT<span className="text-emerald-400">UP</span></span>
        </button>
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { id:'feed', l:'Feed', i:Home },
            { id:'challenges', l:'Challenges', i:Swords },
            { id:'matches', l:'Matches', i:Flag },
            { id:'leaderboard', l:'Ranking', i:Trophy },
            { id:'myteam', l:'My Team', i:Shield },
            { id:'pricing', l:'Pricing', i:Gem },
          ].map(t => (
            <button key={t.id} onClick={() => setView(t.id)} className={'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ' + (view === t.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')}>
              <t.i className="h-4 w-4" /> {t.l}
            </button>
          ))}
          {user?.is_admin && (
            <button onClick={() => setView('admin')} className={'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ' + (view === 'admin' ? 'bg-white/10 text-white' : 'text-amber-300 hover:text-white')}>
              <ShieldCheck className="h-4 w-4" /> Admin
            </button>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {!isPro && (
            <Button onClick={onUpgrade} size="sm" className="hidden rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:opacity-90 md:inline-flex">
              <Gem className="mr-1.5 h-3.5 w-3.5" /> Upgrade to PRO
            </Button>
          )}
          {isPro && <ProBadge small />}
          <Button size="icon" variant="ghost" onClick={() => setSearchOpen(true)} className="rounded-full hover:bg-white/10"><Search className="h-4 w-4" /></Button>
          <Avatar className="h-9 w-9 border border-white/10">
            <AvatarImage src={team?.logo_url || user?.avatar_url} />
            <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-sm font-bold">{(user?.name || 'U')[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <Button size="icon" variant="ghost" onClick={onLogout} className="rounded-full hover:bg-white/10"><LogOut className="h-4 w-4" /></Button>
        </div>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-lg">
          <Input autoFocus placeholder="Search teams, cities…" value={q} onChange={e => setQ(e.target.value)} className="border-white/10 bg-white/5" />
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {results.map(t => (
              <button key={t.id} onClick={() => { onSelectTeam(t.id); setSearchOpen(false) }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5">
                <div className="relative grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 text-white font-bold">
                  {t.name[0]}
                  {t.plan === 'pro' && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500"><Gem className="h-2.5 w-2.5 text-slate-950" /></span>}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold flex items-center gap-1">{t.name}{t.plan === 'pro' && <Gem className="h-3 w-3 text-amber-400" />}</div>
                  <div className="text-xs text-slate-400">{t.city} · Div {t.division.division}</div>
                </div>
                <Badge className={'bg-gradient-to-r text-white ' + DIVISION_COLORS[t.division.division]}>{t.rating}</Badge>
              </button>
            ))}
            {q && results.length === 0 && <div className="p-4 text-center text-sm text-slate-500">No teams found</div>}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}

const BottomNav = ({ view, setView, isPro, isAdmin }) => (
  <nav className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-slate-950/80 p-1.5 backdrop-blur-xl md:hidden">
    {[
      { id:'feed', i:Home }, { id:'challenges', i:Swords }, { id:'matches', i:Flag },
      { id:'leaderboard', i:Trophy }, { id:'myteam', i:Shield }, { id:'pricing', i:Gem },
    ].map(t => (
      <button key={t.id} onClick={() => setView(t.id)} className={'grid h-11 w-11 place-items-center rounded-xl transition ' + (view === t.id ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950' : 'text-slate-400')}>
        <t.i className="h-5 w-5" />
      </button>
    ))}
  </nav>
)

// -------- PRO BADGE --------
const ProBadge = ({ small }) => (
  <div className={'inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-bold text-slate-950 shadow-lg shadow-amber-500/30 ' + (small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm')}>
    <Gem className={small ? 'h-3 w-3' : 'h-3.5 w-3.5'} /> PRO
  </div>
)
const PlanBadge = ({ plan }) => plan === 'pro' ? <ProBadge small /> : (
  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-bold text-slate-300">FREE</span>
)
const FounderBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/40 px-2 py-0.5 text-xs font-bold text-fuchsia-300">
    <Star className="h-3 w-3" /> Founder
  </span>
)

// -------- FEED --------
const FeedView = ({ user, team, onSelectTeam, onGoCreate }) => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)

  const load = async () => {
    try { const { posts } = await api('/feed'); setPosts(posts) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight">Feed</h1>
          <Button onClick={() => team ? setComposerOpen(true) : onGoCreate()} className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold text-slate-950 hover:opacity-90">
            <Plus className="mr-1 h-4 w-4" /> New post
          </Button>
        </div>

        {loading ? <SkeletonPost /> : posts.length === 0 ? (
          <EmptyState icon={Sparkles} title="No posts yet" desc="Be the first to share a moment." action={team ? { label:'Create post', on: () => setComposerOpen(true) } : { label:'Create your team', on: onGoCreate }} />
        ) : (
          posts.map(p => <PostCard key={p.id} post={p} me={user} onReload={load} onSelectTeam={onSelectTeam} />)
        )}
      </div>

      <aside className="hidden md:block">
        <TopTeamsSide onSelectTeam={onSelectTeam} />
      </aside>

      <ComposerDialog open={composerOpen} onOpenChange={setComposerOpen} onDone={load} />
    </div>
  )
}

const PostCard = ({ post, me, onReload, onSelectTeam }) => {
  const [liked, setLiked] = useState((post.likes || []).includes(me.id))
  const [likeCount, setLikeCount] = useState((post.likes || []).length)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState(post.comments || [])

  const like = async () => {
    try { const r = await api(`/posts/${post.id}/like`, { method:'POST' }); setLiked(r.liked); setLikeCount(r.count) } catch (e) { toast.error(e.message) }
  }
  const comment = async () => {
    if (!commentText.trim()) return
    try { const { comment } = await api(`/posts/${post.id}/comment`, { method:'POST', body: JSON.stringify({ text: commentText })}); setComments([...comments, comment]); setCommentText('') } catch {}
  }
  const isMedia = !!post.media_url
  const timeAgo = fmtAgo(post.created_at)

  return (
    <motion.div initial={{y:10,opacity:0}} animate={{y:0,opacity:1}}>
      <Card className="overflow-hidden rounded-3xl border-white/10 bg-white/[.03] backdrop-blur">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => onSelectTeam(post.team_id)} className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/40 to-cyan-500/40 text-white font-bold">{post.team_name[0]}</div>
            <div className="text-left">
              <div className="text-sm font-bold text-white">{post.team_name}</div>
              <div className="text-xs text-slate-400">{timeAgo} · {post.kind}</div>
            </div>
          </button>
          {post.kind !== 'update' && (
            <Badge className="rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 capitalize">{post.kind.replace('_',' ')}</Badge>
          )}
        </div>

        {post.content && <div className="px-4 pb-3 text-[15px] leading-relaxed text-slate-100 whitespace-pre-wrap">{post.content}</div>}

        {isMedia && (
          <div className="aspect-[4/3] w-full overflow-hidden bg-black">
            <img src={post.media_url} className="h-full w-full object-cover" alt="" />
          </div>
        )}

        <div className="flex items-center gap-1 px-3 py-2 text-slate-300">
          <Button size="sm" variant="ghost" onClick={like} className={'rounded-full hover:bg-white/10 ' + (liked ? 'text-rose-400' : '')}>
            <Heart className={'mr-1.5 h-4 w-4 ' + (liked ? 'fill-rose-400' : '')} /> {likeCount}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowComments(!showComments)} className="rounded-full hover:bg-white/10">
            <MessageCircle className="mr-1.5 h-4 w-4" /> {comments.length}
          </Button>
          <Button size="sm" variant="ghost" className="rounded-full hover:bg-white/10">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="border-t border-white/5 px-4 py-3">
              <div className="mb-3 space-y-2">
                {comments.map(c => (
                  <div key={c.id} className="rounded-xl bg-white/5 px-3 py-2 text-sm">
                    <div className="font-semibold text-emerald-300">{c.user_name}</div>
                    <div className="text-slate-200">{c.text}</div>
                  </div>
                ))}
                {comments.length === 0 && <div className="text-xs text-slate-500">No comments yet.</div>}
              </div>
              <div className="flex gap-2">
                <Input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment…" className="border-white/10 bg-white/5" />
                <Button onClick={comment} className="rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400">Post</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

const ComposerDialog = ({ open, onOpenChange, onDone }) => {
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [kind, setKind] = useState('update')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!content && !mediaUrl) return toast.error('Add text or an image URL')
    setBusy(true)
    try {
      await api('/posts', { method:'POST', body: JSON.stringify({ content, media_url: mediaUrl || null, kind }) })
      toast.success('Posted!'); setContent(''); setMediaUrl(''); onOpenChange(false); onDone?.()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-lg">
        <DialogHeader><DialogTitle>Create post</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="result">Match Result</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="celebration">Celebration</SelectItem>
              <SelectItem value="new_player">New Player</SelectItem>
            </SelectContent>
          </Select>
          <Textarea rows={4} placeholder="Share something with the community…" value={content} onChange={e => setContent(e.target.value)} className="border-white/10 bg-white/5" />
          <Input placeholder="Image URL (optional)" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} className="border-white/10 bg-white/5" />
          <Button onClick={submit} disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold text-slate-950 hover:opacity-90">
            {busy ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// -------- MY TEAM --------
const MyTeamView = ({ user, team, onTeamCreated, onSelectTeam, onUpgrade }) => {
  if (!team) return <CreateTeamForm onDone={onTeamCreated} />
  return (
    <div className="space-y-4">
      <ReferralInline user={user} />
      <TeamPage teamId={team.id} me={user} myTeam={team} onFollowChanged={()=>{}} onUpgrade={onUpgrade} embedded />
    </div>
  )
}

const CreateTeamForm = ({ onDone }) => {
  const [f, setF] = useState({
    name:'', description:'', founded_year: new Date().getFullYear(),
    primary_color:'#10b981', secondary_color:'#06b6d4',
    city:'', province:'', facility:'', football_type:'both',
    logo_url:'', cover_url:'',
  })
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!f.name) return toast.error('Team name required')
    setBusy(true)
    try { await api('/teams', { method:'POST', body: JSON.stringify(f) }); toast.success('Team created!'); onDone?.() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-4xl font-black">Create your team</h1>
        <p className="mt-1 text-slate-400">You are the captain. Choose wisely — this is your team's identity.</p>
      </div>
      <Card className="rounded-3xl border-white/10 bg-white/[.03] p-6 backdrop-blur">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Team name"><Input value={f.name} onChange={e => setF({...f, name:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Football type">
            <Select value={f.football_type} onValueChange={v => setF({...f, football_type:v})}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5-a-side</SelectItem>
                <SelectItem value="7">7-a-side</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="City"><Input value={f.city} onChange={e => setF({...f, city:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Province"><Input value={f.province} onChange={e => setF({...f, province:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Home facility"><Input value={f.facility} onChange={e => setF({...f, facility:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Founded"><Input type="number" value={f.founded_year} onChange={e => setF({...f, founded_year:+e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Primary color">
            <div className="flex gap-2">
              <input type="color" value={f.primary_color} onChange={e => setF({...f, primary_color:e.target.value})} className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
              <Input value={f.primary_color} onChange={e => setF({...f, primary_color:e.target.value})} className="border-white/10 bg-white/5" />
            </div>
          </Field>
          <Field label="Secondary color">
            <div className="flex gap-2">
              <input type="color" value={f.secondary_color} onChange={e => setF({...f, secondary_color:e.target.value})} className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
              <Input value={f.secondary_color} onChange={e => setF({...f, secondary_color:e.target.value})} className="border-white/10 bg-white/5" />
            </div>
          </Field>
          <div className="md:col-span-2"><Field label="Description"><Textarea rows={3} value={f.description} onChange={e => setF({...f, description:e.target.value})} className="border-white/10 bg-white/5" /></Field></div>
          <Field label="Logo URL (optional)"><Input value={f.logo_url} onChange={e => setF({...f, logo_url:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Cover URL (optional)"><Input value={f.cover_url} onChange={e => setF({...f, cover_url:e.target.value})} className="border-white/10 bg-white/5" /></Field>
        </div>
        <Button onClick={submit} disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold text-slate-950 hover:opacity-90">
          {busy ? 'Creating…' : 'Create team'}
        </Button>
      </Card>
    </div>
  )
}

const Field = ({ label, children }) => (
  <div>
    <Label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</Label>
    {children}
  </div>
)

// -------- TEAM PAGE --------
const TeamPage = ({ teamId, onBack, me, myTeam, onFollowChanged, onUpgrade, embedded }) => {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('overview')
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)

  const load = async () => {
    try { const d = await api('/teams/' + teamId); setData(d) } catch {}
  }
  useEffect(() => { load() }, [teamId])
  if (!data) return <SkeletonPost />

  const t = data.team
  const isMine = me?.id === t.captain_id
  const isFollowing = (t.followers || []).includes(me?.id)
  const winPct = t.matches_played ? Math.round((t.wins / t.matches_played) * 100) : 0
  const gd = (t.goals_for || 0) - (t.goals_against || 0)

  const follow = async () => {
    try { const r = await api(`/teams/${t.id}/follow`, {method:'POST'}); toast.success(r.following ? 'Following' : 'Unfollowed'); load(); onFollowChanged?.() } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      {!embedded && <Button variant="ghost" onClick={onBack} className="text-slate-400 hover:text-white"><ChevronRight className="h-4 w-4 rotate-180" /> Back</Button>}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10">
        <img src={t.cover_url || COVER_DEFAULT} alt="" className="h-56 w-full object-cover md:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
          <div className="flex items-end gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-2xl border-2 border-white/20 shadow-2xl md:h-24 md:w-24" style={{ background: `linear-gradient(135deg, ${t.primary_color}, ${t.secondary_color})` }}>
              {t.logo_url ? <img src={t.logo_url} className="h-full w-full rounded-2xl object-cover" alt="" /> : <span className="text-3xl font-black text-white">{t.name[0]}</span>}
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge className={'bg-gradient-to-r text-white shadow ' + DIVISION_COLORS[t.division.division]}>
                  <Crown className="mr-1 h-3 w-3" /> {t.division.name}
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-black/40 text-white backdrop-blur">{t.football_type === 'both' ? '5 & 7-a-side' : `${t.football_type}-a-side`}</Badge>
                <PlanBadge plan={t.plan} />
                {t.is_founder && <FounderBadge />}
              </div>
              <h1 className="text-3xl font-black text-white md:text-4xl">{t.name}</h1>
              <div className="mt-1 text-sm text-slate-300"><MapPin className="mr-1 inline h-3 w-3" />{t.city}{t.province ? ', ' + t.province : ''} · Est. {t.founded_year}</div>
            </div>
          </div>
          {!isMine && me && (
            <Button onClick={follow} className={'rounded-full ' + (isFollowing ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-slate-950 hover:bg-slate-100')}>
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={TrendingUp} label="Rating" value={t.rating} accent />
        <StatCard icon={Trophy} label="Wins" value={t.wins} />
        <StatCard icon={Circle} label="Draws" value={t.draws} />
        <StatCard icon={X} label="Losses" value={t.losses} />
        <StatCard icon={Target} label="Goals" value={t.goals_for} />
        <StatCard icon={Shield} label="Conceded" value={t.goals_against} />
        <StatCard icon={BarChart3} label="Goal Diff" value={(gd >= 0 ? '+' : '') + gd} />
        <StatCard icon={Zap} label="Win %" value={winPct + '%'} />
      </div>

      {t.description && <Card className="rounded-2xl border-white/10 bg-white/[.03] p-5 text-slate-200">{t.description}</Card>}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-full bg-white/5 p-1">
          <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Overview</TabsTrigger>
          <TabsTrigger value="roster" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Roster</TabsTrigger>
          <TabsTrigger value="posts" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Posts</TabsTrigger>
          <TabsTrigger value="history" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Last 10</TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">
            <Gem className="mr-1 h-3 w-3 text-amber-400" /> Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="rounded-2xl border-white/10 bg-white/[.03] p-5">
              <div className="mb-2 text-sm font-bold text-slate-400">Current streak</div>
              <div className="text-4xl font-black">{t.streak || 0} <span className="text-lg text-slate-400">W</span></div>
              <div className="mt-1 text-xs text-slate-500">Best: {t.best_streak || 0}</div>
            </Card>
            <Card className="rounded-2xl border-white/10 bg-white/[.03] p-5">
              <div className="mb-2 text-sm font-bold text-slate-400">Followers</div>
              <div className="text-4xl font-black">{(t.followers || []).length}</div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roster" className="mt-4 space-y-3">
          {isMine && <Button onClick={() => setAddPlayerOpen(true)} className="rounded-xl bg-white/10 hover:bg-white/20"><UserPlus className="mr-2 h-4 w-4" /> Add player</Button>}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data.players.map(p => <PlayerCard key={p.id} p={p} />)}
            {data.players.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">No players yet.</div>}
          </div>
          <AddPlayerDialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen} teamId={t.id} onDone={load} />
        </TabsContent>

        <TabsContent value="posts" className="mt-4 space-y-4">
          {data.posts.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">No posts yet.</div>}
          {data.posts.map(p => <PostCard key={p.id} post={p} me={me} onSelectTeam={()=>{}} onReload={load} />)}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-2">
          {(t.last_matches || []).length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">No matches played yet.</div>}
          {(t.last_matches || []).map((m, i) => (
            <Card key={i} className="flex items-center justify-between rounded-xl border-white/10 bg-white/[.03] p-4">
              <div className="flex items-center gap-3">
                <div className={'grid h-9 w-9 place-items-center rounded-lg font-black ' + (m.result === 'W' ? 'bg-emerald-500/20 text-emerald-400' : m.result === 'L' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-300')}>{m.result}</div>
                <div>
                  <div className="text-sm font-bold">vs {m.opponent}</div>
                  <div className="text-xs text-slate-400">{m.score}</div>
                </div>
              </div>
              <div className={'font-bold ' + (m.delta > 0 ? 'text-emerald-400' : m.delta < 0 ? 'text-rose-400' : 'text-slate-400')}>{m.delta > 0 ? '+' : ''}{m.delta}</div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="advanced" className="mt-4">
          <AdvancedStatsTab teamId={t.id} isPro={t.plan === 'pro'} onUpgrade={onUpgrade} canUpgrade={isMine} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const StatCard = ({ icon: I, label, value, accent }) => (
  <Card className={'rounded-2xl border-white/10 p-4 backdrop-blur ' + (accent ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border-emerald-500/30' : 'bg-white/[.03]')}>
    <I className={'mb-2 h-4 w-4 ' + (accent ? 'text-emerald-300' : 'text-slate-400')} />
    <div className="text-xs text-slate-400">{label}</div>
    <div className={'text-2xl font-black ' + (accent ? 'text-white' : 'text-slate-100')}>{value}</div>
  </Card>
)

const PlayerCard = ({ p }) => (
  <Card className="flex items-center gap-3 rounded-2xl border-white/10 bg-white/[.03] p-4">
    <Avatar className="h-12 w-12 border border-white/10">
      <AvatarImage src={p.photo_url} />
      <AvatarFallback className="bg-emerald-500/20 text-emerald-300 font-bold">{(p.first_name || '?')[0]}</AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1 truncate text-sm font-bold">{p.first_name} {p.last_name}{p.is_captain && <Crown className="h-3 w-3 text-amber-400" />}</div>
      <div className="text-xs text-slate-400">#{p.shirt_number || '-'} · {p.position} · {p.foot}</div>
    </div>
    <div className="text-right text-xs text-slate-400">
      <div><span className="font-bold text-white">{p.goals}</span> G</div>
      <div><span className="font-bold text-white">{p.assists}</span> A</div>
    </div>
  </Card>
)

const AddPlayerDialog = ({ open, onOpenChange, teamId, onDone }) => {
  const [f, setF] = useState({ first_name:'', last_name:'', shirt_number:'', position:'MID', foot:'right', birth_year:'', is_captain:false })
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try { await api(`/teams/${teamId}/players`, { method:'POST', body: JSON.stringify(f) }); toast.success('Player added'); onOpenChange(false); onDone?.(); setF({ first_name:'', last_name:'', shirt_number:'', position:'MID', foot:'right', birth_year:'', is_captain:false }) }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-lg">
        <DialogHeader><DialogTitle>Add player</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="First name"><Input value={f.first_name} onChange={e => setF({...f, first_name:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Last name"><Input value={f.last_name} onChange={e => setF({...f, last_name:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Shirt #"><Input value={f.shirt_number} onChange={e => setF({...f, shirt_number:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Position">
            <Select value={f.position} onValueChange={v => setF({...f, position:v})}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['GK','DEF','MID','FWD'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Foot">
            <Select value={f.foot} onValueChange={v => setF({...f, foot:v})}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="right">Right</SelectItem><SelectItem value="left">Left</SelectItem><SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Birth year"><Input type="number" value={f.birth_year} onChange={e => setF({...f, birth_year:e.target.value})} className="border-white/10 bg-white/5" /></Field>
        </div>
        <Button onClick={submit} disabled={busy} className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold text-slate-950 hover:opacity-90">
          {busy ? 'Adding…' : 'Add player'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// -------- CHALLENGES --------
const ChallengesView = ({ team, onNeedTeam }) => {
  const [challenges, setChallenges] = useState([])
  const [open, setOpen] = useState(false)
  const load = async () => { try { const { challenges } = await api('/challenges'); setChallenges(challenges) } catch {} }
  useEffect(() => { load() }, [])
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Challenges</h1>
          <p className="text-sm text-slate-400">Open match requests from teams across the network.</p>
        </div>
        <Button onClick={() => team ? setOpen(true) : onNeedTeam()} className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold text-slate-950 hover:opacity-90">
          <Plus className="mr-1 h-4 w-4" /> New challenge
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {challenges.map(c => <ChallengeCard key={c.id} c={c} myTeamId={team?.id} onAccepted={load} />)}
        {challenges.length === 0 && <EmptyState icon={Swords} title="No open challenges" desc="Post the first one." />}
      </div>
      <ChallengeDialog open={open} onOpenChange={setOpen} onDone={load} />
    </div>
  )
}

const ChallengeCard = ({ c, myTeamId, onAccepted }) => {
  const isMine = c.team_id === myTeamId
  const [busy, setBusy] = useState(false)
  const accept = async () => {
    setBusy(true)
    try { await api(`/challenges/${c.id}/accept`, {method:'POST'}); toast.success('Challenge accepted! Match created.'); onAccepted?.() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Card className="relative overflow-hidden rounded-2xl border-white/10 bg-gradient-to-br from-white/[.05] to-white/[.02] p-5 backdrop-blur">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/40 to-cyan-500/40 font-bold text-white">{c.team_name[0]}</div>
        <div className="flex-1">
          <div className="text-sm font-bold">{c.team_name}</div>
          <div className="text-xs text-slate-400">Rating {c.team_rating} · {c.football_type === 'both' ? '5/7' : c.football_type}-a-side</div>
        </div>
        <Badge className={'capitalize ' + (c.status === 'open' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-500/20 text-slate-300')}>{c.status}</Badge>
      </div>
      <div className="mt-3 space-y-1 text-sm">
        <div className="flex items-center gap-2 text-slate-300"><Calendar className="h-3.5 w-3.5" /> {c.date || 'Any day'} {c.time && `· ${c.time}`}</div>
        <div className="flex items-center gap-2 text-slate-300"><MapPin className="h-3.5 w-3.5" /> {c.city} {c.facility && `· ${c.facility}`}</div>
        {c.notes && <div className="mt-2 rounded-lg bg-white/5 p-2 text-xs text-slate-300">{c.notes}</div>}
      </div>
      {c.status === 'open' && !isMine && (
        <Button onClick={accept} disabled={busy} className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold text-slate-950 hover:opacity-90">
          {busy ? 'Accepting…' : <><Swords className="mr-2 h-4 w-4" /> Accept challenge</>}
        </Button>
      )}
      {isMine && <div className="mt-4 rounded-lg bg-white/5 p-2 text-center text-xs text-slate-400">Your challenge</div>}
    </Card>
  )
}

const ChallengeDialog = ({ open, onOpenChange, onDone }) => {
  const [f, setF] = useState({ football_type:'both', date:'', time:'', city:'', facility:'', skill_level:'any', notes:'' })
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try { await api('/challenges', { method:'POST', body: JSON.stringify(f) }); toast.success('Challenge posted!'); onOpenChange(false); onDone?.() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-lg">
        <DialogHeader><DialogTitle>Post a challenge</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Football type">
            <Select value={f.football_type} onValueChange={v => setF({...f, football_type:v})}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5-a-side</SelectItem><SelectItem value="7">7-a-side</SelectItem><SelectItem value="both">Either</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Skill level">
            <Select value={f.skill_level} onValueChange={v => setF({...f, skill_level:v})}>
              <SelectTrigger className="border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem><SelectItem value="intermediate">Intermediate</SelectItem><SelectItem value="advanced">Advanced</SelectItem><SelectItem value="any">Any</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date"><Input type="date" value={f.date} onChange={e => setF({...f, date:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Time"><Input type="time" value={f.time} onChange={e => setF({...f, time:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="City"><Input value={f.city} onChange={e => setF({...f, city:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Facility"><Input value={f.facility} onChange={e => setF({...f, facility:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <div className="md:col-span-2"><Field label="Notes"><Textarea value={f.notes} onChange={e => setF({...f, notes:e.target.value})} className="border-white/10 bg-white/5" /></Field></div>
        </div>
        <Button onClick={submit} disabled={busy} className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold text-slate-950 hover:opacity-90">
          {busy ? 'Posting…' : 'Post challenge'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// -------- MATCHES --------
const MatchesView = ({ team, onSelectTeam }) => {
  const [matches, setMatches] = useState([])
  const load = async () => { try { const { matches } = await api('/matches'); setMatches(matches) } catch {} }
  useEffect(() => { load() }, [])
  if (!team) return <EmptyState icon={Flag} title="Create your team first" desc="You need a team to manage matches." />
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black">Matches</h1>
      {matches.length === 0 && <EmptyState icon={Flag} title="No matches yet" desc="Accept a challenge to get started." />}
      {matches.map(m => <MatchCard key={m.id} m={m} myTeamId={team.id} onSelectTeam={onSelectTeam} onReload={load} />)}
    </div>
  )
}

const MatchCard = ({ m, myTeamId, onSelectTeam, onReload }) => {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ score_home:'', score_away:'' })
  const [busy, setBusy] = useState(false)
  const myConf = m.confirmations?.[myTeamId]
  const otherId = m.home_team_id === myTeamId ? m.away_team_id : m.home_team_id
  const otherConf = m.confirmations?.[otherId]
  const submit = async () => {
    setBusy(true)
    try {
      const r = await api(`/matches/${m.id}/confirm`, { method:'POST', body: JSON.stringify({ score_home: f.score_home, score_away: f.score_away }) })
      if (r.match.status === 'confirmed') toast.success('Match confirmed. Ratings updated!')
      else if (r.match.status === 'disputed') toast.error('Result mismatch. Pending verification.')
      else toast.success('Your result saved. Waiting for opponent.')
      setOpen(false); onReload?.()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const statusColor = { scheduled:'bg-slate-500/20 text-slate-300', pending:'bg-amber-500/20 text-amber-300 border-amber-500/30', confirmed:'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', disputed:'bg-rose-500/20 text-rose-300 border-rose-500/30' }[m.status]
  return (
    <Card className="rounded-2xl border-white/10 bg-white/[.03] p-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-4">
          <button onClick={() => onSelectTeam(m.home_team_id)} className="flex-1 text-left">
            <div className="text-xs text-slate-400">HOME</div>
            <div className="text-lg font-bold">{m.home_team_name}</div>
          </button>
          <div className="text-center">
            {myConf ? <div className="text-2xl font-black">{myConf.score_home} - {myConf.score_away}</div> : <div className="text-sm text-slate-500">vs</div>}
          </div>
          <button onClick={() => onSelectTeam(m.away_team_id)} className="flex-1 text-right">
            <div className="text-xs text-slate-400">AWAY</div>
            <div className="text-lg font-bold">{m.away_team_name}</div>
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Badge className={'capitalize ' + statusColor}>{m.status}</Badge>
        <div className="text-xs text-slate-400">{m.date} {m.time} · {m.facility}</div>
        {m.status !== 'confirmed' && <Button onClick={() => setOpen(true)} size="sm" className="rounded-full bg-white/10 hover:bg-white/20">{myConf ? 'Update result' : 'Confirm result'}</Button>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Confirm result</DialogTitle></DialogHeader>
          <div className="flex items-center justify-center gap-3">
            <div className="text-center">
              <div className="mb-1 text-xs text-slate-400">{m.home_team_name}</div>
              <Input type="number" min="0" value={f.score_home} onChange={e => setF({...f, score_home:e.target.value})} className="h-16 w-20 border-white/10 bg-white/5 text-center text-3xl font-black" />
            </div>
            <span className="text-3xl font-black text-slate-500">-</span>
            <div className="text-center">
              <div className="mb-1 text-xs text-slate-400">{m.away_team_name}</div>
              <Input type="number" min="0" value={f.score_away} onChange={e => setF({...f, score_away:e.target.value})} className="h-16 w-20 border-white/10 bg-white/5 text-center text-3xl font-black" />
            </div>
          </div>
          {otherConf && <div className="mt-3 rounded-lg bg-white/5 p-2 text-center text-xs text-slate-400">Opponent submitted: {otherConf.score_home} - {otherConf.score_away}</div>}
          <Button onClick={submit} disabled={busy} className="mt-2 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold text-slate-950 hover:opacity-90">
            {busy ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// -------- LEADERBOARD --------
const LeaderboardView = ({ onSelectTeam }) => {
  const [tab, setTab] = useState('teams')
  const [teams, setTeams] = useState([])
  const [scorers, setScorers] = useState([])
  const [assists, setAssists] = useState([])
  const [divisions, setDivisions] = useState([])
  useEffect(() => {
    api('/leaderboard/teams').then(r => setTeams(r.teams)).catch(()=>{})
    api('/leaderboard/scorers').then(r => setScorers(r.players)).catch(()=>{})
    api('/leaderboard/assists').then(r => setAssists(r.players)).catch(()=>{})
    api('/divisions').then(r => setDivisions(r.divisions)).catch(()=>{})
  }, [])
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Global Ranking</h1>
        <p className="text-sm text-slate-400">Live standings across FOOTUP.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {divisions.slice(0, 10).map(d => (
          <Card key={d.division} className={'rounded-2xl border-white/10 bg-gradient-to-br p-4 ' + DIVISION_COLORS[d.division]}>
            <div className="text-xs font-bold text-white/80">DIVISION {d.division}</div>
            <div className="text-2xl font-black text-white">{d.count}</div>
            <div className="text-xs text-white/80">{d.tier}</div>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-full bg-white/5 p-1">
          <TabsTrigger value="teams" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Top Teams</TabsTrigger>
          <TabsTrigger value="scorers" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Top Scorers</TabsTrigger>
          <TabsTrigger value="assists" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Top Assists</TabsTrigger>
        </TabsList>
        <TabsContent value="teams" className="mt-4 space-y-2">
          {teams.map((t, i) => (
            <button key={t.id} onClick={() => onSelectTeam(t.id)} className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left transition hover:bg-white/[.06]">
              <div className={'grid h-10 w-10 place-items-center rounded-xl font-black ' + (i < 3 ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950' : 'bg-white/5 text-slate-300')}>
                {i + 1}
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl font-bold text-white" style={{background: `linear-gradient(135deg, ${t.primary_color || '#10b981'}, ${t.secondary_color || '#06b6d4'})`}}>{t.name[0]}</div>
              <div className="flex-1">
                <div className="font-bold">{t.name}</div>
                <div className="text-xs text-slate-400">{t.city} · {t.wins}W {t.draws}D {t.losses}L</div>
              </div>
              <Badge className={'bg-gradient-to-r text-white ' + DIVISION_COLORS[t.division.division]}>D{t.division.division}</Badge>
              <div className="w-16 text-right text-lg font-black">{t.rating}</div>
            </button>
          ))}
          {teams.length === 0 && <EmptyState icon={Trophy} title="No teams yet" />}
        </TabsContent>
        <TabsContent value="scorers" className="mt-4 space-y-2">
          {scorers.map((p, i) => (
            <Card key={p.id} className="flex items-center gap-4 rounded-2xl border-white/10 bg-white/[.03] p-4">
              <div className="w-8 text-center font-black text-slate-400">{i+1}</div>
              <Avatar className="h-10 w-10"><AvatarImage src={p.photo_url} /><AvatarFallback className="bg-emerald-500/20 text-emerald-300 font-bold">{(p.first_name || '?')[0]}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="font-bold">{p.first_name} {p.last_name}</div>
                <div className="text-xs text-slate-400">{p.team_name} · {p.position}</div>
              </div>
              <div className="text-right"><div className="text-2xl font-black text-emerald-400">{p.goals}</div><div className="text-xs text-slate-400">goals</div></div>
            </Card>
          ))}
          {scorers.length === 0 && <EmptyState icon={Target} title="No goals yet" />}
        </TabsContent>
        <TabsContent value="assists" className="mt-4 space-y-2">
          {assists.map((p, i) => (
            <Card key={p.id} className="flex items-center gap-4 rounded-2xl border-white/10 bg-white/[.03] p-4">
              <div className="w-8 text-center font-black text-slate-400">{i+1}</div>
              <Avatar className="h-10 w-10"><AvatarImage src={p.photo_url} /><AvatarFallback className="bg-cyan-500/20 text-cyan-300 font-bold">{(p.first_name || '?')[0]}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="font-bold">{p.first_name} {p.last_name}</div>
                <div className="text-xs text-slate-400">{p.team_name} · {p.position}</div>
              </div>
              <div className="text-right"><div className="text-2xl font-black text-cyan-400">{p.assists}</div><div className="text-xs text-slate-400">assists</div></div>
            </Card>
          ))}
          {assists.length === 0 && <EmptyState icon={Zap} title="No assists yet" />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

const TopTeamsSide = ({ onSelectTeam }) => {
  const [teams, setTeams] = useState([])
  useEffect(() => { api('/leaderboard/teams').then(r => setTeams((r.teams || []).slice(0, 5))).catch(()=>{}) }, [])
  return (
    <Card className="sticky top-24 rounded-3xl border-white/10 bg-white/[.03] p-5 backdrop-blur">
      <div className="mb-3 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-400" /> <div className="text-sm font-bold">Top teams</div></div>
      <div className="space-y-2">
        {teams.map((t, i) => (
          <button key={t.id} onClick={() => onSelectTeam(t.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5">
            <div className="w-5 text-center text-xs font-black text-slate-400">{i+1}</div>
            <div className="grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-white" style={{background: `linear-gradient(135deg, ${t.primary_color || '#10b981'}, ${t.secondary_color || '#06b6d4'})`}}>{t.name[0]}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{t.name}</div><div className="text-xs text-slate-500">{t.city}</div></div>
            <div className="text-sm font-black text-emerald-400">{t.rating}</div>
          </button>
        ))}
        {teams.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">No teams yet</div>}
      </div>
    </Card>
  )
}

// -------- Utils UI --------
const SkeletonPost = () => (
  <div className="space-y-4">
    {[1,2].map(i => (
      <div key={i} className="animate-pulse rounded-3xl border border-white/10 bg-white/[.03] p-4">
        <div className="mb-4 flex gap-3"><div className="h-11 w-11 rounded-xl bg-white/10" /><div className="flex-1"><div className="h-3 w-32 rounded bg-white/10" /><div className="mt-2 h-2 w-20 rounded bg-white/5" /></div></div>
        <div className="h-40 rounded-xl bg-white/5" />
      </div>
    ))}
  </div>
)
const EmptyState = ({ icon: I, title, desc, action }) => (
  <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center">
    <I className="mx-auto mb-3 h-8 w-8 text-slate-500" />
    <div className="text-lg font-bold">{title}</div>
    {desc && <div className="text-sm text-slate-400">{desc}</div>}
    {action && <Button onClick={action.on} className="mt-4 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 font-bold text-slate-950 hover:opacity-90">{action.label}</Button>}
  </div>
)
// -------- PRICING VIEW --------
const FREE_FEATURES = [
  'Create team profile',
  'Team logo & photo',
  'Manage full roster',
  'Follow other teams',
  'Social feed access',
  'Post, like & comment',
  'Search teams & players',
  'Match challenges',
  'ELO ranking',
  '10 divisions',
  'Join public tournaments',
  'Basic team statistics',
]
const PRO_FEATURES = [
  'Everything in FREE',
  'Advanced statistics dashboard',
  'Complete match history',
  'Season stats & evolution graph',
  'Player contribution analysis',
  'Goal trends & win/loss charts',
  'Premium team customization',
  'Custom banner & themes',
  'Priority placement in search',
  'Featured team section',
  'PRO badge on your profile',
  'Export team stats to PDF',
  'Season reports',
  'Advanced leaderboard filters',
  'No advertisements',
  'Early access to new features',
  'Exclusive PRO badges',
]

const PricingView = ({ user, onUpgrade, onRefresh }) => {
  const isPro = user.plan === 'pro'
  const renew = user.pro_until ? new Date(user.pro_until).toLocaleDateString() : null
  const cancel = async () => {
    try { const r = await api('/subscription/cancel', {method:'POST'}); toast.success(r.message); onRefresh?.() } catch (e) { toast.error(e.message) }
  }
  return (
    <div className="space-y-8">
      <div className="text-center">
        <Badge className="mb-3 rounded-full bg-amber-500/15 px-4 py-1.5 text-amber-300 border border-amber-500/30 backdrop-blur">
          <Gem className="mr-1.5 h-3.5 w-3.5" /> FOOTUP PRO
        </Badge>
        <h1 className="text-4xl font-black md:text-5xl">Unlock your team's <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">full potential</span></h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">Start free forever. Upgrade whenever you're ready to dominate with advanced tools.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* FREE */}
        <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}}>
          <Card className={'rounded-3xl border-white/10 bg-white/[.03] p-7 backdrop-blur ' + (!isPro ? 'ring-2 ring-emerald-500/40' : '')}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-400">FOOTUP</div>
                <div className="text-3xl font-black">Free</div>
              </div>
              {!isPro && <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Current plan</Badge>}
            </div>
            <div className="mb-5">
              <div className="text-4xl font-black">€0<span className="text-lg font-normal text-slate-400">/year</span></div>
              <div className="text-xs text-slate-500">Forever. No credit card required.</div>
            </div>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {f}
                </li>
              ))}
            </ul>
            <Button disabled className="mt-6 w-full rounded-xl bg-white/5 text-slate-400">Current plan</Button>
          </Card>
        </motion.div>

        {/* PRO */}
        <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.1}}>
          <Card className={'relative overflow-hidden rounded-3xl border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-transparent p-7 backdrop-blur ' + (isPro ? 'ring-2 ring-amber-500/60' : '')}>
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300"><Gem className="h-4 w-4" /> FOOTUP</div>
                <div className="text-3xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">PRO</div>
              </div>
              {isPro ? <Badge className="bg-amber-500/25 text-amber-200 border border-amber-500/40">Active</Badge> : <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Best value</Badge>}
            </div>
            <div className="mb-5">
              <div className="text-4xl font-black">€9.99<span className="text-lg font-normal text-slate-300">/year</span></div>
              <div className="text-xs text-amber-200/80">Less than €1 per month</div>
            </div>
            <ul className="space-y-2.5">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-100">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> {f}
                </li>
              ))}
            </ul>
            {isPro ? (
              <div className="mt-6 space-y-2">
                <div className="rounded-xl bg-black/30 p-3 text-center text-sm">
                  <div className="text-xs text-slate-400">Renews</div>
                  <div className="font-bold text-white">{renew}</div>
                </div>
                <Button onClick={cancel} variant="outline" className="w-full rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10">Cancel subscription</Button>
              </div>
            ) : (
              <Button onClick={onUpgrade} className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-bold text-slate-950 shadow-lg shadow-amber-500/30 hover:opacity-90">
                <Rocket className="mr-2 h-4 w-4" /> Upgrade to PRO
              </Button>
            )}
          </Card>
        </motion.div>
      </div>

      <Card className="rounded-3xl border-white/10 bg-white/[.03] p-6 backdrop-blur">
        <div className="mb-4 flex items-center gap-2"><Gift className="h-5 w-5 text-fuchsia-400" /><h2 className="text-xl font-black">Earn PRO for free</h2></div>
        <p className="text-sm text-slate-400">Invite other teams. Get free PRO months.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-2xl font-black">5 invites</div><div className="text-sm text-emerald-300">30 days PRO free</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-2xl font-black">20 invites</div><div className="text-sm text-amber-300">90 days PRO free</div></div>
        </div>
      </Card>
    </div>
  )
}

// -------- UPGRADE DIALOG (Stripe placeholder) --------
const UpgradeDialog = ({ open, onOpenChange, onSuccess }) => {
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('confirm') // confirm | processing | done
  const upgrade = async () => {
    setStep('processing'); setBusy(true)
    try {
      // TODO: replace with Stripe Checkout redirect
      await new Promise(r => setTimeout(r, 1200))
      await api('/subscription/upgrade', { method:'POST', body: JSON.stringify({ provider: 'placeholder' }) })
      setStep('done')
      setTimeout(() => { onSuccess?.(); toast.success('Welcome to FOOTUP PRO! 🏆'); setStep('confirm') }, 900)
    } catch (e) { toast.error(e.message); setStep('confirm') } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o) }}>
      <DialogContent className="overflow-hidden border-amber-500/40 bg-gradient-to-br from-slate-950 via-slate-950 to-amber-950/20 text-white sm:max-w-md">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl" />
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-2xl shadow-amber-500/40">
                <Gem className="h-7 w-7 text-slate-950" />
              </div>
              <DialogTitle className="text-center text-2xl">Upgrade to FOOTUP PRO</DialogTitle>
            </DialogHeader>
            <div className="mt-2 text-center">
              <div className="text-5xl font-black">€9.99<span className="text-lg font-normal text-slate-400">/year</span></div>
              <div className="text-xs text-slate-500">Cancel anytime · Renews yearly</div>
            </div>
            <div className="mt-4 space-y-2 rounded-2xl bg-white/5 p-4">
              {['Advanced stats & charts', 'Priority in search', 'PRO badge on profile', 'No ads · Early access'].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-amber-300" /> {f}</div>
              ))}
            </div>
            <Button onClick={upgrade} className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-bold text-slate-950 hover:opacity-90">
              <CreditCard className="mr-2 h-4 w-4" /> Continue to payment
            </Button>
            <div className="text-center text-[10px] text-slate-500">💡 Stripe integration coming soon — this is a placeholder that activates PRO instantly</div>
          </>
        )}
        {step === 'processing' && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-amber-500/30 border-t-amber-400" />
            <div className="text-lg font-bold">Processing payment…</div>
            <div className="text-xs text-slate-400">Setting up your PRO benefits</div>
          </div>
        )}
        {step === 'done' && (
          <div className="py-8 text-center">
            <motion.div initial={{scale:0}} animate={{scale:1}} className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500">
              <Check className="h-8 w-8 text-slate-950" />
            </motion.div>
            <div className="text-2xl font-black">You're PRO! 🏆</div>
            <div className="text-sm text-slate-300">Welcome to the elite.</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// -------- REFERRALS --------
const ReferralInline = ({ user }) => {
  const [data, setData] = useState(null)
  useEffect(() => { api('/referrals/me').then(setData).catch(()=>{}) }, [])
  if (!data) return null
  const copy = () => { navigator.clipboard.writeText(data.referral_url); toast.success('Referral link copied!') }
  const progress = data.next_milestone ? Math.round((data.referrals_count / data.next_milestone) * 100) : 100
  return (
    <Card className="relative overflow-hidden rounded-3xl border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/15 via-purple-500/10 to-transparent p-5 backdrop-blur">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-bold text-fuchsia-300"><Gift className="h-4 w-4" /> Referral rewards</div>
          <div className="text-lg font-black">Invite teams. Earn free PRO.</div>
          <div className="text-xs text-slate-400">Your code: <span className="font-mono font-bold text-fuchsia-300">{data.referral_code}</span> · {data.referrals_count} invited{data.next_milestone && ` · ${data.next_milestone - data.referrals_count} to next reward`}</div>
          {data.next_milestone && (
            <div className="mt-2 h-2 w-64 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-purple-500 transition-all" style={{ width: progress + '%' }} />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={copy} className="rounded-full bg-white/10 hover:bg-white/20"><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link</Button>
        </div>
      </div>
    </Card>
  )
}
const ReferralsView = ({ user }) => <div className="space-y-4"><h1 className="text-3xl font-black">Referrals</h1><ReferralInline user={user} /></div>

// -------- ADMIN --------
const AdminView = () => {
  const [stats, setStats] = useState(null)
  const [proTeams, setProTeams] = useState([])
  const [subs, setSubs] = useState([])
  const [grantOpen, setGrantOpen] = useState(false)
  const load = async () => {
    try {
      const s = await api('/admin/stats'); setStats(s)
      const t = await api('/admin/pro-teams'); setProTeams(t.teams || [])
      const b = await api('/admin/subscriptions'); setSubs(b.subscriptions || [])
    } catch (e) { toast.error(e.message) }
  }
  useEffect(() => { load() }, [])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-400" /><h1 className="text-3xl font-black">Admin</h1></div>
          <p className="text-sm text-slate-400">Platform overview & controls.</p>
        </div>
        <Button onClick={() => setGrantOpen(true)} className="rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 font-bold text-slate-950 hover:opacity-90"><Gift className="mr-1.5 h-3.5 w-3.5" /> Grant PRO</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard icon={Users} label="Users" value={stats.users} />
          <StatCard icon={Shield} label="Teams" value={stats.teams} />
          <StatCard icon={Flag} label="Matches" value={stats.matches} />
          <StatCard icon={Gem} label="Active PRO" value={stats.pro_active} accent />
          <StatCard icon={CreditCard} label="Subscriptions" value={stats.subs} />
        </div>
      )}

      <Card className="rounded-2xl border-white/10 bg-white/[.03] p-5">
        <div className="mb-3 flex items-center gap-2"><Gem className="h-4 w-4 text-amber-400" /><h3 className="font-bold">PRO teams</h3></div>
        <div className="space-y-2">
          {proTeams.map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg font-bold text-white" style={{background: `linear-gradient(135deg, ${t.primary_color || '#10b981'}, ${t.secondary_color || '#06b6d4'})`}}>{t.name[0]}</div>
                <div>
                  <div className="text-sm font-bold">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.city} · rating {t.rating}</div>
                </div>
              </div>
              <div className="text-xs text-amber-300">until {t.pro_until ? new Date(t.pro_until).toLocaleDateString() : '—'}</div>
            </div>
          ))}
          {proTeams.length === 0 && <div className="text-sm text-slate-500">No active PRO teams.</div>}
        </div>
      </Card>

      <Card className="rounded-2xl border-white/10 bg-white/[.03] p-5">
        <div className="mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-400" /><h3 className="font-bold">Subscriptions ({subs.length})</h3></div>
        <div className="space-y-1 text-sm">
          {subs.slice(0, 10).map(s => (
            <div key={s.id} className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="font-mono text-xs text-slate-400">{s.user_id.slice(0, 8)}…</span>
              <span>€{s.amount} · {s.provider}</span>
              <Badge className={s.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}>{s.status}</Badge>
            </div>
          ))}
          {subs.length === 0 && <div className="text-sm text-slate-500">No subscriptions yet.</div>}
        </div>
      </Card>

      <GrantProDialog open={grantOpen} onOpenChange={setGrantOpen} onDone={load} />
    </div>
  )
}
const GrantProDialog = ({ open, onOpenChange, onDone }) => {
  const [f, setF] = useState({ user_id:'', days:30 })
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    try { await api('/admin/grant-pro', { method:'POST', body: JSON.stringify(f) }); toast.success('PRO granted!'); onOpenChange(false); onDone?.() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-md">
        <DialogHeader><DialogTitle>Grant temporary PRO</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="User ID"><Input value={f.user_id} onChange={e => setF({...f, user_id:e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Field label="Days"><Input type="number" value={f.days} onChange={e => setF({...f, days:+e.target.value})} className="border-white/10 bg-white/5" /></Field>
          <Button onClick={submit} disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 font-bold text-slate-950 hover:opacity-90">{busy ? 'Granting…' : 'Grant PRO'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// -------- ADVANCED STATS --------
const AdvancedStatsTab = ({ teamId, isPro, onUpgrade, canUpgrade }) => {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    if (!isPro) return
    api(`/teams/${teamId}/advanced-stats`).then(setData).catch(e => setErr(e.message))
  }, [teamId, isPro])

  if (!isPro) return (
    <Card className="relative overflow-hidden rounded-3xl border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent p-10 text-center backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,.15),transparent_60%)]" />
      <Lock className="mx-auto mb-3 h-10 w-10 text-amber-300" />
      <div className="text-2xl font-black">Unlock advanced stats with PRO</div>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">Complete match history · Season evolution graph · Goal trends · Player contribution analysis · Win/loss breakdown</p>
      {canUpgrade && (
        <Button onClick={onUpgrade} className="mt-6 rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-bold text-slate-950 hover:opacity-90">
          <Gem className="mr-2 h-4 w-4" /> Upgrade to PRO — €9.99/year
        </Button>
      )}
    </Card>
  )

  if (err) return <div className="rounded-2xl border border-white/10 p-5 text-sm text-rose-300">{err}</div>
  if (!data) return <SkeletonPost />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Flag} label="Total matches" value={data.summary.total_matches} />
        <StatCard icon={Target} label="Avg GF" value={data.summary.avg_goals_for} accent />
        <StatCard icon={Shield} label="Avg GA" value={data.summary.avg_goals_against} />
        <StatCard icon={TrendingUp} label="Best streak" value={data.summary.best_streak} />
      </div>

      <Card className="rounded-2xl border-white/10 bg-white/[.03] p-5">
        <div className="mb-3 flex items-center gap-2"><LineChartIcon className="h-4 w-4 text-amber-400" /><h3 className="font-bold">Goal trend (last matches)</h3></div>
        <GoalTrendChart data={data.goal_trend} />
      </Card>

      <Card className="rounded-2xl border-white/10 bg-white/[.03] p-5">
        <div className="mb-3 flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-emerald-400" /><h3 className="font-bold">Player contribution</h3></div>
        <div className="space-y-2">
          {data.contribution.slice(0, 8).map((p, i) => {
            const total = p.goals + p.assists
            const max = Math.max(1, data.contribution[0].goals + data.contribution[0].assists)
            return (
              <div key={i}>
                <div className="mb-1 flex items-center justify-between text-sm"><span className="font-bold">{p.name}</span><span className="text-slate-400">{p.goals}G · {p.assists}A</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{width: (total/max)*100 + '%'}} />
                </div>
              </div>
            )
          })}
          {data.contribution.length === 0 && <div className="text-sm text-slate-500">No player data yet.</div>}
        </div>
      </Card>

      <Card className="rounded-2xl border-white/10 bg-white/[.03] p-5">
        <div className="mb-3 flex items-center gap-2"><LineChartIcon className="h-4 w-4 text-cyan-400" /><h3 className="font-bold">Match history</h3></div>
        <div className="max-h-72 overflow-y-auto space-y-2">
          {data.evolution.map((m, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
              <div className={'grid h-7 w-7 place-items-center rounded font-black ' + (m.result === 'W' ? 'bg-emerald-500/20 text-emerald-400' : m.result === 'L' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-300')}>{m.result}</div>
              <div className="flex-1 pl-3">vs {m.opponent}</div>
              <div className="font-bold">{m.score}</div>
            </div>
          ))}
          {data.evolution.length === 0 && <div className="text-sm text-slate-500">No confirmed matches yet.</div>}
        </div>
      </Card>
    </div>
  )
}
const GoalTrendChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="text-sm text-slate-500">Play some matches to see trends.</div>
  const max = Math.max(1, ...data.map(d => Math.max(d.scored, d.conceded)))
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end gap-1 items-center">
          <div className="w-full flex gap-1 items-end h-24">
            <div className="flex-1 rounded-t bg-gradient-to-t from-emerald-500 to-emerald-300" style={{height: (d.scored/max)*100 + '%'}} title={`Scored: ${d.scored}`} />
            <div className="flex-1 rounded-t bg-gradient-to-t from-rose-500 to-rose-300" style={{height: (d.conceded/max)*100 + '%'}} title={`Conceded: ${d.conceded}`} />
          </div>
          <div className="text-[10px] text-slate-500">#{d.index}</div>
        </div>
      ))}
    </div>
  )
}

function fmtAgo(d) {
  const t = new Date(d).getTime()
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return `${Math.floor(s/86400)}d`
}
