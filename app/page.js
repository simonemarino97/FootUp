'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import {
  Home, Users, Swords, Trophy, Bell, Search, LogOut, Plus, Heart, MessageCircle,
  Share2, Camera, Flag, MapPin, Calendar, Clock, Shield, Award, TrendingUp,
  Target, Zap, Star, ChevronRight, X, Check, Circle, Menu, Sparkles, Crown,
  BarChart3, UserPlus, Settings, Play
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
  const [view, setView] = useState('feed') // feed | myteam | challenges | leaderboard | matches | search
  const [authOpen, setAuthOpen] = useState(false)
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

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#0b1220_0%,#050810_60%,#000_100%)] text-slate-100">
      <TopBar user={user} team={team} view={view} setView={setView} onLogout={async () => { await api('/auth/logout', {method:'POST'}); refresh() }} onSelectTeam={setSelectedTeamId} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-8">
        {selectedTeamId ? (
          <TeamPage teamId={selectedTeamId} onBack={() => setSelectedTeamId(null)} me={user} myTeam={team} onFollowChanged={refresh} />
        ) : view === 'feed' ? (
          <FeedView user={user} team={team} onSelectTeam={setSelectedTeamId} onGoCreate={() => setView('myteam')} />
        ) : view === 'myteam' ? (
          <MyTeamView user={user} team={team} onTeamCreated={refresh} onSelectTeam={setSelectedTeamId} />
        ) : view === 'challenges' ? (
          <ChallengesView team={team} onNeedTeam={() => setView('myteam')} />
        ) : view === 'matches' ? (
          <MatchesView team={team} onSelectTeam={setSelectedTeamId} />
        ) : view === 'leaderboard' ? (
          <LeaderboardView onSelectTeam={setSelectedTeamId} />
        ) : null}
      </main>

      <BottomNav view={view} setView={(v) => { setSelectedTeamId(null); setView(v) }} />
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
const TopBar = ({ user, team, view, setView, onLogout, onSelectTeam }) => {
  const [searchOpen, setSearchOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
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
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500">
            <Zap className="h-4 w-4 text-slate-950" />
          </div>
          <span className="text-xl font-black">FOOT<span className="text-emerald-400">UP</span></span>
        </div>
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { id:'feed', l:'Feed', i:Home },
            { id:'challenges', l:'Challenges', i:Swords },
            { id:'matches', l:'Matches', i:Flag },
            { id:'leaderboard', l:'Ranking', i:Trophy },
            { id:'myteam', l:'My Team', i:Shield },
          ].map(t => (
            <button key={t.id} onClick={() => setView(t.id)} className={'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ' + (view === t.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white')}>
              <t.i className="h-4 w-4" /> {t.l}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
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
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 text-white font-bold">{t.name[0]}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{t.name}</div>
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

const BottomNav = ({ view, setView }) => (
  <nav className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-slate-950/80 p-1.5 backdrop-blur-xl md:hidden">
    {[
      { id:'feed', i:Home }, { id:'challenges', i:Swords }, { id:'matches', i:Flag },
      { id:'leaderboard', i:Trophy }, { id:'myteam', i:Shield },
    ].map(t => (
      <button key={t.id} onClick={() => setView(t.id)} className={'grid h-11 w-11 place-items-center rounded-xl transition ' + (view === t.id ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950' : 'text-slate-400')}>
        <t.i className="h-5 w-5" />
      </button>
    ))}
  </nav>
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
const MyTeamView = ({ user, team, onTeamCreated, onSelectTeam }) => {
  if (!team) return <CreateTeamForm onDone={onTeamCreated} />
  return <TeamPage teamId={team.id} me={user} myTeam={team} onFollowChanged={()=>{}} embedded />
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
const TeamPage = ({ teamId, onBack, me, myTeam, onFollowChanged, embedded }) => {
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
              <div className="mb-1 flex items-center gap-2">
                <Badge className={'bg-gradient-to-r text-white shadow ' + DIVISION_COLORS[t.division.division]}>
                  <Crown className="mr-1 h-3 w-3" /> {t.division.name}
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-black/40 text-white backdrop-blur">{t.football_type === 'both' ? '5 & 7-a-side' : `${t.football_type}-a-side`}</Badge>
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
function fmtAgo(d) {
  const t = new Date(d).getTime()
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return `${Math.floor(s/86400)}d`
}
