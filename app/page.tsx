"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, Dispatch, RefObject, SetStateAction, FormEvent } from "react";
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, AudioLines, BarChart3,
  Bell, BookOpen, BrainCircuit, BriefcaseBusiness, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Download, FileText,
  GraduationCap, Headphones, LayoutDashboard, Lightbulb, MessageCircle,
  Mic, MoreHorizontal, Plus, Search, Send, Settings2, ShieldCheck,
  Sparkles, Target, Users, WandSparkles, X, Zap,
} from "lucide-react";

type Scenario = {
  id: string; title: string; category: string; level: "Beginner" | "Intermediate" | "Advanced";
  minutes: number; description: string; objective: string; persona: string; openingLine: string;
  characterMood: string; learnerRole: string; learnerInstructions: string; setting: string; accent: string;
};
type Turn = { role: "user" | "assistant"; content: string; at?: string };
type BrowserSpeechRecognitionResult = { isFinal: boolean; [index: number]: { transcript: string } };
type BrowserSpeechRecognitionEvent = { resultIndex: number; results: ArrayLike<BrowserSpeechRecognitionResult> };
type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};
type Score = { criterion: string; score: number; rationale: string; evidence: string; suggestion: string };
type Report = { overall: number; summary: string; strengths: string[]; improvements: string[]; nextStep: string; scores: Score[]; mode?: "ai" | "demo" };
type Session = { id: string; scenarioId: string; scenarioTitle: string; completedAt: string; overall: number; duration: number; report: Report; turns: Turn[] };
type NavItem = "Overview" | "Practice lab" | "Scenario studio" | "Learners" | "Analytics" | "Settings";

const SEED_SCENARIOS: Scenario[] = [
  { id: "customer-care", title: "Turn an upset customer around", category: "Customer service", level: "Beginner", minutes: 6, description: "A guest is frustrated because their room is not ready. Listen, acknowledge the issue and agree a practical next step.", objective: "De-escalate the complaint through active listening, empathy and a clear next step.", persona: "A tired hotel guest who has waited 40 minutes for a room. They are frustrated but open to a useful solution.", openingLine: "I've been waiting for nearly forty minutes. Nobody seems to know what's going on, and this is not the welcome I expected.", characterMood: "Frustrated", learnerRole: "Hotel reception colleague", learnerInstructions: "Listen first, acknowledge the impact, and offer a clear next step.", setting: "Hotel reception", accent: "peach" },
  { id: "interview", title: "Make your interview answers count", category: "Communication", level: "Intermediate", minutes: 8, description: "Practise a structured answer to a behavioural interview question, then clarify your contribution with concrete examples.", objective: "Give a clear, specific answer using context, action and result.", persona: "A supportive but time-conscious hiring manager interviewing for a customer-facing role.", openingLine: "Tell me about a time you had to handle a difficult situation at work. What did you personally do, and what happened as a result?", characterMood: "Curious", learnerRole: "Job applicant", learnerInstructions: "Give a structured answer with a specific example and a clear result.", setting: "Job interview room", accent: "lilac" },
  { id: "team-conflict", title: "Navigate a team disagreement", category: "Leadership", level: "Advanced", minutes: 10, description: "Handle a colleague who disagrees with a new process. Find the concern and move toward a shared decision.", objective: "Explore a disagreement respectfully, summarize competing needs and propose a collaborative next step.", persona: "An experienced colleague who is skeptical of a new workflow and worried it will add work without solving the real problem.", openingLine: "I don't see why we're changing this process. The old way works, and the new one sounds like more work for everyone.", characterMood: "Skeptical", learnerRole: "Team lead", learnerInstructions: "Explore the concern, summarize their perspective, and look for a shared next step.", setting: "Team meeting", accent: "mint" },
  { id: "feedback", title: "Give feedback that moves work forward", category: "Leadership", level: "Intermediate", minutes: 7, description: "Prepare a constructive conversation about repeated missed handovers without blaming or avoiding the issue.", objective: "Describe a specific observation, explain impact, invite perspective and agree a next step.", persona: "A capable teammate who has missed several handovers recently and may be dealing with a workload issue.", openingLine: "You asked to talk about the handovers. I know a couple were late, but things have been pretty busy lately.", characterMood: "Guarded", learnerRole: "Colleague giving feedback", learnerInstructions: "Describe the specific impact without blame, invite their perspective, and agree a next step.", setting: "Workplace check-in", accent: "blue" },
];

const NAV: { label: NavItem; icon: typeof LayoutDashboard; section: string }[] = [
  { label: "Overview", icon: LayoutDashboard, section: "WORKSPACE" },
  { label: "Practice lab", icon: MessageCircle, section: "WORKSPACE" },
  { label: "Scenario studio", icon: WandSparkles, section: "BUILD" },
  { label: "Learners", icon: Users, section: "BUILD" },
  { label: "Analytics", icon: BarChart3, section: "INSIGHTS" },
  { label: "Settings", icon: Settings2, section: "INSIGHTS" },
];

const initialReport: Report = {
  overall: 0, summary: "Your report will appear here after you finish a practice session.", strengths: [], improvements: [], nextStep: "Complete a roleplay to get feedback.", scores: [], mode: "demo",
};

function initials(name: string) { return name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase(); }
function prettyDate(iso: string) { try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return iso; } }

export default function Home() {
  const [activeNav, setActiveNav] = useState<NavItem>("Overview");
  const [role, setRole] = useState<"Learner" | "Trainer">("Learner");
  const [scenarios, setScenarios] = useState<Scenario[]>(SEED_SCENARIOS);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All skills");
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState({ title: "", category: "Communication", level: "Beginner" as Scenario["level"], minutes: 6, description: "", objective: "", persona: "", openingLine: "", characterMood: "Concerned", learnerRole: "Team member", learnerInstructions: "Listen carefully, acknowledge the concern, and agree a next step.", setting: "Workplace conversation" });
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const isPractice = activeNav === "Practice lab" && !!selected;

  useEffect(() => {
    try {
      const savedScenarios = localStorage.getItem("morrow.scenarios.v1");
      const savedSessions = localStorage.getItem("morrow.sessions.v1");
      if (savedScenarios) setScenarios(JSON.parse(savedScenarios));
      if (savedSessions) setSessions(JSON.parse(savedSessions));
    } catch { /* Demo data remains available if browser storage is unavailable. */ }
    finally { setHydrated(true); }
  }, []);
  useEffect(() => { if (!hydrated) return; try { localStorage.setItem("morrow.scenarios.v1", JSON.stringify(scenarios)); } catch {} }, [scenarios, hydrated]);
  useEffect(() => { if (!hydrated) return; try { localStorage.setItem("morrow.sessions.v1", JSON.stringify(sessions)); } catch {} }, [sessions, hydrated]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, busy]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(""), 2800); return () => window.clearTimeout(id); }, [toast]);

  const average = sessions.length ? Math.round(sessions.reduce((s, x) => s + x.overall, 0) / sessions.length) : 0;
  const completeCount = sessions.length;
  const latest = [...sessions].sort((a, b) => +new Date(b.completedAt) - +new Date(a.completedAt)).slice(0, 4);
  const filteredScenarios = useMemo(() => scenarios.filter((s) => (filter === "All skills" || s.category === filter) && `${s.title} ${s.description} ${s.category}`.toLowerCase().includes(search.toLowerCase())), [scenarios, filter, search]);

  function startScenario(s: Scenario) {
    setSelected(s); setTurns([{ role: "assistant", content: s.openingLine, at: new Date().toISOString() }]); setComposer(""); setReport(null); setActiveNav("Practice lab");
  }

  async function sendMessage(spokenContent?: string): Promise<string | null> {
    const content = (spokenContent ?? composer).trim();
    if (!content || !selected || busy) return null;
    const nextTurns: Turn[] = [...turns, { role: "user", content, at: new Date().toISOString() }];
    setTurns(nextTurns); setComposer(""); setBusy(true);
    try {
      const response = await fetch("/api/roleplay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: selected, turns: nextTurns, message: content }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The roleplay service could not respond.");
      setTurns([...nextTurns, { role: "assistant", content: result.reply, at: new Date().toISOString() }]);
      if (result.mode === "demo") setReport((old) => old?.mode === "demo" ? old : null);
      return typeof result.reply === "string" ? result.reply : null;
    } catch (error) {
      const errorText = `I hit a connection issue. Please try sending that again. (${error instanceof Error ? error.message : "Unknown error"})`;
      setTurns([...nextTurns, { role: "assistant", content: errorText, at: new Date().toISOString() }]);
      return errorText;
    } finally { setBusy(false); }
  }

  async function finishSession() {
    if (!selected || busy || turns.filter((t) => t.role === "user").length === 0) {
      setToast("Add at least one response before finishing the session."); return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: selected, turns }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not generate feedback.");
      const generated: Report = result.report;
      const entry: Session = { id: crypto.randomUUID(), scenarioId: selected.id, scenarioTitle: selected.title, completedAt: new Date().toISOString(), overall: generated.overall, duration: Math.max(1, Math.round(turns.length * 0.6)), report: generated, turns };
      setSessions((old) => [entry, ...old]); setReport(generated); setToast("Practice report saved in this browser.");
    } catch (error) { setToast(error instanceof Error ? error.message : "Could not generate feedback."); }
    finally { setBusy(false); }
  }

  function createScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.objective.trim() || !draft.persona.trim() || !draft.openingLine.trim()) { setToast("Complete the title, objective, character and opening line."); return; }
    const fresh: Scenario = { ...draft, id: `custom-${Date.now()}`, title: draft.title.trim(), description: draft.description.trim() || "A guided conversation practice created by your trainer.", accent: ["peach", "lilac", "mint", "blue"][scenarios.length % 4] };
    setScenarios((old) => [fresh, ...old]); setShowCreate(false); setActiveNav("Scenario studio"); setToast("Scenario created and saved in this browser.");
    setDraft({ title: "", category: "Communication", level: "Beginner", minutes: 6, description: "", objective: "", persona: "", openingLine: "", characterMood: "Concerned", learnerRole: "Team member", learnerInstructions: "Listen carefully, acknowledge the concern, and agree a next step.", setting: "Workplace conversation" });
  }

  function downloadReport(session: Session) {
    const content = [`MORROW PRACTICE REPORT`, session.scenarioTitle, `Completed: ${new Date(session.completedAt).toLocaleString()}`, `Overall score: ${session.overall}/100`, "", session.report.summary, "", "STRENGTHS", ...session.report.strengths.map((x) => `- ${x}`), "", "IMPROVEMENT AREAS", ...session.report.improvements.map((x) => `- ${x}`), "", "RUBRIC", ...session.report.scores.map((x) => `${x.criterion}: ${x.score}/5 — ${x.rationale}\nEvidence: ${x.evidence}\nSuggestion: ${x.suggestion}`), "", "TRANSCRIPT", ...session.turns.map((x) => `${x.role === "user" ? "Learner" : "AI character"}: ${x.content}`)].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = `morrow-report-${session.id.slice(0, 8)}.txt`; a.click(); URL.revokeObjectURL(url);
  }

  function resetDemo() {
    setScenarios(SEED_SCENARIOS); setSessions([]); setSelected(null); setTurns([]); setReport(null);
    try { localStorage.removeItem("morrow.scenarios.v1"); localStorage.removeItem("morrow.sessions.v1"); } catch {}
    setActiveNav("Overview"); setToast("Demo data reset.");
  }

  const pageTitle = isPractice ? selected?.title || "Practice lab" : activeNav;
  const pageSubtitle = isPractice ? "Take a breath, stay curious, and practise one moment at a time." : ({ Overview: "Build confidence through deliberate practice.", "Practice lab": "Choose a scenario and start a conversation.", "Scenario studio": "Design safe, repeatable practice for your team.", Learners: "Understand learner activity and support the next step.", Analytics: "See practice activity and skill signals across this demo workspace.", Settings: "Configure the prototype and its AI connection." } as Record<NavItem, string>)[activeNav];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-symbol"><AudioLines size={21} strokeWidth={2.5}/></div><span>morrow<span className="brand-dot">.</span></span><span className="beta">STUDIO</span></div>
        <div className="workspace-switcher"><div className="workspace-mark">N</div><div className="workspace-text"><strong>Northstar Learning</strong><span>Demo workspace</span></div><ChevronDown size={15} className="muted-icon"/></div>
        <div className="side-label">WORKSPACE</div>
        <nav className="nav-list">
          {NAV.filter((n) => ["Overview", "Practice lab"].includes(n.label)).map((item) => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${activeNav === item.label ? "active" : ""}`} onClick={() => { setActiveNav(item.label); if (item.label !== "Practice lab") setSelected(null); }}><Icon size={18}/><span>{item.label}</span>{item.label === "Practice lab" && <span className="nav-pill">4</span>}</button>; })}
        </nav>
        <div className="side-label side-label-spaced">CREATE & MANAGE</div>
        <nav className="nav-list">
          {NAV.filter((n) => ["Scenario studio", "Learners"].includes(n.label)).map((item) => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${activeNav === item.label ? "active" : ""}`} onClick={() => { setActiveNav(item.label); setSelected(null); }}><Icon size={18}/><span>{item.label}</span>{item.label === "Scenario studio" && <span className="nav-count">{scenarios.length}</span>}</button>; })}
        </nav>
        <div className="side-label side-label-spaced">INSIGHTS</div>
        <nav className="nav-list">
          {NAV.filter((n) => ["Analytics", "Settings"].includes(n.label)).map((item) => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${activeNav === item.label ? "active" : ""}`} onClick={() => { setActiveNav(item.label); setSelected(null); }}><Icon size={18}/><span>{item.label}</span></button>; })}
        </nav>
        <div className="sidebar-grow" />
        <div className="sidebar-coach"><div className="coach-icon"><Sparkles size={17}/></div><strong>Practice makes progress</strong><p>Small conversations. Real confidence.</p><button onClick={() => { setActiveNav("Practice lab"); setSelected(null); }}>Explore scenarios <ArrowRight size={14}/></button></div>
        <div className="profile-row"><div className="avatar avatar-indigo">US</div><div className="profile-text"><strong>Ujjwal Shrestha</strong><span>{role} account · Demo</span></div><button className="icon-btn tiny" title="Switch role" onClick={() => { setRole(role === "Learner" ? "Trainer" : "Learner"); setToast(`Preview role switched to ${role === "Learner" ? "Trainer" : "Learner"}. Permissions are not enforced in this demo.`); }}><MoreHorizontal size={18}/></button></div>
      </aside>

      <main className="main-panel">
        <header className="topbar"><div className="breadcrumb"><span>Northstar Learning</span><ChevronRight size={14}/><strong>{pageTitle}</strong></div><div className="topbar-actions"><div className="environment"><span className="status-dot"/> Demo environment</div><button className="icon-btn" title="Help" onClick={() => setToast("Prototype help: start a scenario, send a few messages, then finish to view feedback.")}><CircleHelp size={18}/></button><button className="icon-btn notification-btn" title="Notifications" onClick={() => setToast("You're all caught up.")}><Bell size={18}/><span/></button><div className="top-avatar">US</div></div></header>
        <div className="page-content">
          <div className="page-heading"><div><div className="eyebrow">{role === "Learner" ? "YOUR LEARNING JOURNEY" : "FACILITATOR WORKSPACE"}</div><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>{!isPractice && <div className="heading-actions">{activeNav === "Scenario studio" && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={17}/> Create scenario</button>}{activeNav === "Overview" && <button className="btn btn-primary" onClick={() => { setActiveNav("Practice lab"); setSelected(null); }}><Zap size={16}/> Start practice <ArrowRight size={15}/></button>}</div>}</div>

          {activeNav === "Overview" && <OverviewView sessions={sessions} scenarios={scenarios} latest={latest} average={average} completeCount={completeCount} onStart={startScenario} onNavigate={setActiveNav} onReport={downloadReport} />}
          {activeNav === "Practice lab" && !selected && <PracticeView scenarios={filteredScenarios} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} onStart={startScenario} />}
          {isPractice && selected && <PracticeRoom scenario={selected} turns={turns} composer={composer} setComposer={setComposer} busy={busy} report={report} onSend={() => { void sendMessage(); }} onVoiceSend={sendMessage} onVoiceTurn={(role, content) => setTurns((old) => [...old, { role, content, at: new Date().toISOString() }])} onFinish={finishSession} onBack={() => { setSelected(null); setReport(null); }} onRestart={() => { if (selected) setTurns([{ role: "assistant", content: selected.openingLine }]); setReport(null); }} chatEndRef={chatEndRef} />}
          {activeNav === "Scenario studio" && <ScenarioStudio scenarios={scenarios} sessions={sessions} onCreate={() => setShowCreate(true)} onPreview={startScenario} onDelete={(id) => { setScenarios((old) => old.filter((s) => s.id !== id)); setToast("Scenario removed from this browser."); }} />}
          {activeNav === "Learners" && <LearnersView sessions={sessions} />}
          {activeNav === "Analytics" && <AnalyticsView sessions={sessions} scenarios={scenarios} average={average} />}
          {activeNav === "Settings" && <SettingsView onReset={resetDemo} />}
          <footer className="footer"><span>morrow studio <span className="footer-dot">·</span> AI soft-skills practice</span><span><ShieldCheck size={13}/> Prototype · do not use with real learner data</span></footer>
        </div>
      </main>

      {showCreate && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}><div className="modal-card"><div className="modal-header"><div><div className="eyebrow">SCENARIO STUDIO</div><h2>Create a practice scenario</h2><p>Define a small, specific conversation to practise.</p></div><button className="icon-btn" onClick={() => setShowCreate(false)} title="Close"><X size={19}/></button></div><form onSubmit={createScenario} className="scenario-form"><label>Scenario title<input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Set expectations with a guest"/></label><div className="form-grid"><label>Skill category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}><option>Communication</option><option>Customer service</option><option>Leadership</option><option>Teamwork</option><option>Interview skills</option><option>Conflict resolution</option></select></label><label>Difficulty<select value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value as Scenario["level"] })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label></div><label>Learning objective<textarea required rows={2} value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} placeholder="What should the learner be able to demonstrate?"/></label><label>Character context<textarea required rows={2} value={draft.persona} onChange={(e) => setDraft({ ...draft, persona: e.target.value })} placeholder="Who is the AI character, and what do they want?"/></label><div className="form-grid"><label>Character mood<select value={draft.characterMood} onChange={(e) => setDraft({ ...draft, characterMood: e.target.value })}><option>Calm</option><option>Curious</option><option>Concerned</option><option>Frustrated</option><option>Skeptical</option><option>Guarded</option></select></label><label>Setting<input value={draft.setting} onChange={(e) => setDraft({ ...draft, setting: e.target.value })} placeholder="e.g. Hotel reception"/></label></div><label>Learner's role<input value={draft.learnerRole} onChange={(e) => setDraft({ ...draft, learnerRole: e.target.value })} placeholder="What role should the learner play?"/></label><label>Learner instructions<textarea rows={2} value={draft.learnerInstructions} onChange={(e) => setDraft({ ...draft, learnerInstructions: e.target.value })} placeholder="Give the learner a clear practice goal."/></label><label>Opening line<textarea required rows={2} value={draft.openingLine} onChange={(e) => setDraft({ ...draft, openingLine: e.target.value })} placeholder="What does the character say first?"/></label><label>Scenario description<textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Briefly describe the situation (optional)"/></label><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="btn btn-primary"><Plus size={16}/> Create scenario</button></div></form></div></div>}
      {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}<button onClick={() => setToast("")} aria-label="Dismiss"><X size={15}/></button></div>}
    </div>
  );
}

function OverviewView({ sessions, scenarios, latest, average, completeCount, onStart, onNavigate, onReport }: { sessions: Session[]; scenarios: Scenario[]; latest: Session[]; average: number; completeCount: number; onStart: (s: Scenario) => void; onNavigate: (n: NavItem) => void; onReport: (s: Session) => void }) {
  const featured = scenarios[0];
  return <div className="view-stack">
    <section className="welcome-banner"><div className="welcome-orb orb-one"/><div className="welcome-orb orb-two"/><div className="welcome-copy"><div className="banner-kicker"><Sparkles size={14}/> YOUR NEXT SMALL WIN</div><h2>Better conversations<br/><span>start with practice.</span></h2><p>Build communication habits in a safe space, one scenario at a time.</p><button className="btn btn-light" onClick={() => onStart(featured)}><span>Start a 6-minute practice</span><ArrowRight size={16}/></button></div><div className="welcome-art"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-card"><div className="art-card-top"><span className="mini-dot"/><span className="mini-dot"/><span className="mini-dot"/><span className="art-card-label">LIVE PRACTICE</span></div><div className="art-person"><div className="art-hair"/><div className="art-face"/><div className="art-body"/><div className="art-neck"/></div><div className="art-message"><span>AI conversation partner</span><div className="message-line long"/><div className="message-line short"/></div><div className="art-sparkle sparkle-a">✳</div><div className="art-sparkle sparkle-b">✦</div></div></div></section>
    <section className="stat-grid"><StatCard label="Practices completed" value={String(completeCount).padStart(2,"0")} hint={completeCount ? "Saved practice sessions" : "Your first one is waiting"} icon={CheckCircle2} tone="green"/><StatCard label="Average reflection score" value={completeCount ? `${average}%` : "—"} hint={completeCount ? "Across completed practices" : "Earn a score after practice"} icon={Target} tone="purple"/><StatCard label="Minutes invested" value={String(sessions.reduce((sum, x) => sum + x.duration, 0))} hint="Time spent building a skill" icon={Clock3} tone="blue"/><StatCard label="Skill areas explored" value={String(new Set(sessions.map((x) => x.scenarioId)).size).padStart(2,"0")} hint="Different scenarios tried" icon={Activity} tone="orange"/></section>
    <section className="content-grid overview-grid"><div className="panel recommended-panel"><div className="panel-heading"><div><span className="eyebrow">PICK UP WHERE YOU ARE</span><h3>Recommended practice</h3></div><button className="text-link" onClick={() => onNavigate("Practice lab")}>View all <ArrowRight size={14}/></button></div><div className="recommended-card"><div className={`scenario-icon icon-${featured.accent}`}><MessageCircle size={21}/></div><div className="scenario-main"><div className="scenario-meta"><span>{featured.category}</span><span className="meta-dot">·</span><span>{featured.level}</span></div><h4>{featured.title}</h4><p>{featured.description}</p><div className="scenario-foot"><span><Clock3 size={14}/>{featured.minutes} min</span><span><Target size={14}/>{featured.level}</span><button className="btn btn-primary btn-small" onClick={() => onStart(featured)}>Begin practice <ArrowRight size={14}/></button></div></div></div><div className="practice-note"><div className="note-icon"><Lightbulb size={17}/></div><p><strong>A small reminder</strong> You don't need a perfect answer. Try to understand the other person before finding the solution.</p></div></div>
    <div className="panel progress-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR MOMENTUM</span><h3>Practice activity</h3></div><button className="icon-btn tiny" onClick={() => onNavigate("Analytics")} title="Open analytics"><ArrowDownRight size={17}/></button></div><div className="progress-circle-wrap"><div className="progress-circle" style={{"--progress": `${Math.min(100, completeCount * 14)}%`} as CSSProperties}><div><strong>{completeCount}</strong><span>sessions</span></div></div><div className="progress-copy"><strong>{completeCount === 0 ? "Your journey starts here" : completeCount < 4 ? "You're building the habit" : "Consistency is adding up"}</strong><span>{completeCount === 0 ? "Complete one scenario to start a personal record." : `${completeCount} completed practice ${completeCount === 1 ? "session" : "sessions"} saved in this browser.`}</span></div></div><div className="mini-progress-list"><div><span className="progress-label"><i className="dot dot-green"/> Completed</span><strong>{completeCount}</strong></div><div><span className="progress-label"><i className="dot dot-gray"/> Scenarios available</span><strong>{scenarios.length}</strong></div><div><span className="progress-label"><i className="dot dot-purple"/> Average score</span><strong>{completeCount ? `${average}%` : "—"}</strong></div></div></div></section>
    <section className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow">KEEP YOUR LEARNING VISIBLE</span><h3>Recent practice</h3></div><button className="text-link" onClick={() => onNavigate("Analytics")}>All activity <ArrowRight size={14}/></button></div>{latest.length ? <div className="table-wrap"><table><thead><tr><th>SCENARIO</th><th>DATE</th><th>REFLECTION SCORE</th><th>STATUS</th><th></th></tr></thead><tbody>{latest.map((s) => <tr key={s.id}><td><div className="table-scenario"><div className="table-avatar"><MessageCircle size={15}/></div><div><strong>{s.scenarioTitle}</strong><span>Practice session</span></div></div></td><td>{prettyDate(s.completedAt)}</td><td><div className="score-cell"><div className="score-bar"><i style={{width: `${s.overall}%`}}/></div><strong>{s.overall}%</strong></div></td><td><span className="status-chip"><Check size={12}/> Complete</span></td><td><button className="icon-btn tiny" title="Download report" onClick={() => onReport(s)}><Download size={15}/></button></td></tr>)}</tbody></table></div> : <div className="empty-state inline-empty"><div className="empty-symbol"><BookOpen size={21}/></div><strong>No practice sessions yet</strong><span>Your first completed conversation will appear here.</span><button className="text-link" onClick={() => onNavigate("Practice lab")}>Browse scenarios <ArrowRight size={14}/></button></div>}</section>
    <div className="disclaimer-line"><ShieldCheck size={14}/><span>Scores are AI-generated practice signals, not validated psychological or employment assessments.</span></div>
  </div>;
}

function StatCard({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: typeof Activity; tone: string }) { return <div className="stat-card"><div className={`stat-icon tone-${tone}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-hint">{hint}</div></div>; }

function PracticeView({ scenarios, search, setSearch, filter, setFilter, onStart }: { scenarios: Scenario[]; search: string; setSearch: (v: string) => void; filter: string; setFilter: (v: string) => void; onStart: (s: Scenario) => void }) {
  const categories = ["All skills", "Customer service", "Communication", "Leadership", "Teamwork", "Interview skills", "Conflict resolution"];
  return <div className="view-stack"><div className="practice-intro"><div><div className="eyebrow">SAFE SPACE. REAL CONVERSATIONS.</div><h2>What would you like to practise?</h2><p>Choose a realistic moment, try a different response and reflect on what worked.</p></div><div className="practice-intro-icon"><BrainCircuit size={34}/><span/><span/></div></div><div className="filters-row"><div className="search-box"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search scenarios..." aria-label="Search scenarios"/></div><div className="filter-select"><span>Skill area</span><select value={filter} onChange={(e) => setFilter(e.target.value)}>{categories.map((x) => <option key={x}>{x}</option>)}</select><ChevronDown size={14}/></div><div className="result-count">{scenarios.length} scenarios</div></div>{scenarios.length ? <div className="scenario-grid">{scenarios.map((s, i) => <div className="scenario-card" key={s.id}><div className={`scenario-card-visual visual-${s.accent}`}><div className="visual-number">0{i+1}</div><div className="visual-shape shape-one"/><div className="visual-shape shape-two"/><div className="visual-icon">{s.category === "Leadership" ? <Users size={26}/> : s.category === "Customer service" ? <Headphones size={26}/> : s.category === "Communication" ? <MessageCircle size={26}/> : <BriefcaseBusiness size={26}/>}</div><span className="difficulty-chip">{s.level}</span></div><div className="scenario-card-body"><div className="scenario-category">{s.category}</div><h3>{s.title}</h3><p>{s.description}</p><div className="scenario-card-foot"><div className="time-label"><Clock3 size={14}/>{s.minutes} min</div><button className="btn btn-primary btn-small" onClick={() => onStart(s)}>Start <ArrowRight size={14}/></button></div></div></div>)}</div> : <div className="empty-state"><div className="empty-symbol"><Search size={23}/></div><strong>No scenarios found</strong><span>Try a different search term or skill filter.</span></div>}<div className="privacy-banner"><div className="privacy-icon"><ShieldCheck size={20}/></div><div><strong>Practice without pressure</strong><p>This prototype stores practice sessions in your browser. Do not enter real customer, employee or sensitive personal information.</p></div></div></div>;
}

function PracticeRoom({ scenario, turns, composer, setComposer, busy, report, onSend, onVoiceSend, onVoiceTurn, onFinish, onBack, onRestart, chatEndRef }: {
  scenario: Scenario;
  turns: Turn[];
  composer: string;
  setComposer: (v: string) => void;
  busy: boolean;
  report: Report | null;
  onSend: () => void;
  onVoiceSend: (text: string) => Promise<string | null>;
  onVoiceTurn: (role: "user" | "assistant", content: string) => void;
  onFinish: () => void;
  onBack: () => void;
  onRestart: () => void;
  chatEndRef: RefObject<HTMLDivElement | null>;
}) {
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceEngine, setVoiceEngine] = useState<"browser" | "realtime" | null>(null);
  const [realtimeConfigured, setRealtimeConfigured] = useState<boolean | null>(null);
  const [voiceStatus, setVoiceStatus] = useState("Start a hands-free conversation");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const voiceEnabledRef = useRef(false);
  const voiceProcessingRef = useRef(false);
  const onVoiceSendRef = useRef(onVoiceSend);
  const onVoiceTurnRef = useRef(onVoiceTurn);
  const startListeningRef = useRef<(() => void) | null>(null);
  const speakThenListenRef = useRef<((text: string) => void) | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  onVoiceSendRef.current = onVoiceSend;
  onVoiceTurnRef.current = onVoiceTurn;

  function startListening() {
    if (!voiceEnabledRef.current || voiceProcessingRef.current || report) return;
    const speechWindow = window as WindowWithSpeechRecognition;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceStatus("Voice input is not supported here. Try Chrome or Edge, or type below.");
      voiceEnabledRef.current = false;
      setVoiceMode(false);
      setVoiceEngine(null);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) transcript += result[0]?.transcript ?? "";
      }
      transcript = transcript.trim();
      if (!transcript || voiceProcessingRef.current) return;
      voiceProcessingRef.current = true;
      setVoiceStatus("Morrow is thinking…");
      recognition.stop();
      void onVoiceSendRef.current(transcript).then((reply) => {
        if (!voiceEnabledRef.current) return;
        if (!reply) {
          voiceProcessingRef.current = false;
          startListeningRef.current?.();
          return;
        }
        speakThenListenRef.current?.(reply);
      }).catch(() => {
        if (!voiceEnabledRef.current) return;
        voiceProcessingRef.current = false;
        setVoiceStatus("Something interrupted the voice turn. Listening again…");
        startListeningRef.current?.();
      });
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        voiceEnabledRef.current = false;
        voiceProcessingRef.current = false;
        setVoiceMode(false);
        setVoiceEngine(null);
        setVoiceStatus("Microphone access was blocked. Allow it in your browser and try again.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setVoiceStatus(`Voice input issue (${event.error}). Try again or type below.`);
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (voiceEnabledRef.current && !voiceProcessingRef.current && !window.speechSynthesis?.speaking) {
        window.setTimeout(() => startListeningRef.current?.(), 300);
      }
    };
    try {
      recognition.start();
      setVoiceStatus("Listening — speak naturally");
    } catch {
      setVoiceStatus("Could not start the microphone. Check browser permissions and try again.");
    }
  }
  startListeningRef.current = startListening;

  function speakThenListen(text: string) {
    if (!voiceEnabledRef.current) return;
    voiceProcessingRef.current = true;
    setVoiceStatus("Morrow is speaking…");
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      voiceProcessingRef.current = false;
      setVoiceStatus("Reply received. Voice playback is not supported, so continue by typing.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.onend = () => {
      if (!voiceEnabledRef.current) return;
      voiceProcessingRef.current = false;
      startListeningRef.current?.();
    };
    utterance.onerror = () => {
      if (!voiceEnabledRef.current) return;
      voiceProcessingRef.current = false;
      setVoiceStatus("Audio playback stopped. Listening again…");
      startListeningRef.current?.();
    };
    window.speechSynthesis.speak(utterance);
  }
  speakThenListenRef.current = speakThenListen;

  function releaseRealtimeResources() {
    try { dataChannelRef.current?.close(); } catch {}
    dataChannelRef.current = null;
    try { peerConnectionRef.current?.close(); } catch {}
    peerConnectionRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
  }

  async function connectRealtimeVoice() {
    setVoiceStatus("Opening a secure live audio connection…");
    const connection = new RTCPeerConnection();
    peerConnectionRef.current = connection;
    connection.ontrack = (event) => {
      if (!remoteAudioRef.current || !event.streams[0]) return;
      remoteAudioRef.current.srcObject = event.streams[0];
      void remoteAudioRef.current.play().catch(() => setVoiceStatus("Audio is connected. Click the page once if playback is blocked."));
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === "failed" || connection.connectionState === "disconnected") {
        setVoiceStatus("Live audio connection was interrupted. You can stop and reconnect.");
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    micStreamRef.current = stream;
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));

    const channel = connection.createDataChannel("morrow-realtime-events");
    dataChannelRef.current = channel;
    channel.onopen = () => {
      if (!voiceEnabledRef.current) return;
      setVoiceStatus("Live AI audio connected — speak naturally");
      channel.send(JSON.stringify({ type: "response.create" }));
    };
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as { type?: string; transcript?: string; error?: { message?: string }; item?: { content?: Array<{ transcript?: string }> } };
        if (message.type === "input_audio_buffer.speech_started") setVoiceStatus("Listening — speak naturally");
        if (message.type === "response.created") setVoiceStatus("Morrow is speaking…");
        if (message.type === "response.done") setVoiceStatus("Live AI audio connected — speak naturally");
        if (message.type === "conversation.item.input_audio_transcription.completed") {
          const transcript = message.transcript?.trim();
          if (transcript) onVoiceTurnRef.current("user", transcript);
        }
        if (message.type === "response.output_audio_transcript.done") {
          const transcript = (message.transcript ?? message.item?.content?.find((part) => !!part.transcript)?.transcript)?.trim();
          if (transcript) onVoiceTurnRef.current("assistant", transcript);
        }
        if (message.type === "error") setVoiceStatus(message.error?.message || "The live audio service reported an issue.");
      } catch {
        // Ignore non-JSON control messages.
      }
    };

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    const sdp = connection.localDescription?.sdp;
    if (!sdp) throw new Error("The browser did not create a session offer.");
    const response = await fetch("/api/realtime/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sdp,
        scenario: {
          title: scenario.title, objective: scenario.objective, persona: scenario.persona,
          openingLine: scenario.openingLine, characterMood: scenario.characterMood,
          learnerRole: scenario.learnerRole, learnerInstructions: scenario.learnerInstructions,
          setting: scenario.setting,
        },
        turns: turns.slice(-12),
      }),
    });
    const answerSdp = await response.text();
    if (!response.ok) {
      let message = "Realtime voice could not start.";
      try { message = JSON.parse(answerSdp).error || message; } catch {}
      throw new Error(message);
    }
    await connection.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  async function startVoice() {
    if (voiceEnabledRef.current) return;
    const openingLine = [...turns].reverse().find((turn) => turn.role === "assistant")?.content ?? scenario.openingLine;
    voiceEnabledRef.current = true;
    voiceProcessingRef.current = true;
    setVoiceMode(true);
    setVoiceStatus("Checking live voice availability…");

    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function" && typeof RTCPeerConnection !== "undefined") {
      try {
        const availability = await fetch("/api/realtime/session", { cache: "no-store" });
        const status = await availability.json();
        setRealtimeConfigured(Boolean(status.configured));
        if (availability.ok && status.configured) {
          setVoiceEngine("realtime");
          await connectRealtimeVoice();
          return;
        }
      } catch {
        // A browser-based voice session remains available if Realtime isn't configured.
      }
    }

    releaseRealtimeResources();
    const speechWindow = window as WindowWithSpeechRecognition;
    if (!(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition)) {
      voiceEnabledRef.current = false;
      voiceProcessingRef.current = false;
      setVoiceMode(false);
      setVoiceEngine(null);
      setVoiceStatus("Live AI audio is not configured, and this browser lacks speech input. Try Chrome or Edge after adding an API key.");
      return;
    }
    if (!("speechSynthesis" in window)) {
      voiceEnabledRef.current = false;
      voiceProcessingRef.current = false;
      setVoiceMode(false);
      setVoiceEngine(null);
      setVoiceStatus("This browser does not support spoken replies. Continue by typing.");
      return;
    }
    setVoiceEngine("browser");
    setVoiceStatus("Browser voice mode — turn-based conversation");
    speakThenListen(openingLine);
  }

  function stopVoice() {
    voiceEnabledRef.current = false;
    voiceProcessingRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    releaseRealtimeResources();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setVoiceMode(false);
    setVoiceEngine(null);
    setVoiceStatus("Voice session ended");
  }

  useEffect(() => () => {
    voiceEnabledRef.current = false;
    recognitionRef.current?.stop();
    try { dataChannelRef.current?.close(); } catch {}
    try { peerConnectionRef.current?.close(); } catch {}
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
  }, []);

  const voiceDescription = voiceEngine === "realtime"
    ? "Streaming speech-to-speech audio. Speak naturally; the model can listen and respond in the same session."
    : voiceMode && realtimeConfigured === false
      ? "Browser speech is active, but roleplay replies are demo responses until OPENAI_API_KEY is added to Vercel."
      : voiceMode
        ? "Browser voice mode listens after each reply. You can stop it at any time or type instead."
        : "Hands-free conversation. Uses streaming AI audio when configured, otherwise browser speech.";

  return <div className="practice-room">
    <button className="back-link" onClick={() => { stopVoice(); onBack(); }}><ArrowLeft size={15}/> Back to scenarios</button>
    <div className="room-layout">
      <section className="room-main panel">
        <div className="room-title-row">
          <div className={`scenario-icon icon-${scenario.accent}`}><MessageCircle size={21}/></div>
          <div className="room-title"><div className="scenario-meta"><span>{scenario.category}</span><span className="meta-dot">·</span><span>{scenario.level}</span></div><h2>{scenario.title}</h2></div>
          <span className="live-chip"><i/> PRACTICE</span>
        </div>
        <div className="scenario-brief"><div className="brief-label"><Target size={14}/> YOUR OBJECTIVE</div><p>{scenario.objective}</p></div>
        <div className={`voice-bar ${voiceMode ? "voice-bar-active" : ""}`}>
          <div className={`voice-orb ${voiceMode ? "voice-orb-active" : ""}`}><AudioLines size={18}/></div>
          <div className="voice-copy"><strong>{voiceStatus}</strong><span>{voiceDescription}</span></div>
          <button type="button" className={`btn ${voiceMode ? "btn-secondary" : "btn-primary"} voice-toggle`} onClick={voiceMode ? stopVoice : () => { void startVoice(); }} disabled={!!report}>
            {voiceMode ? <X size={14}/> : <Mic size={14}/>} {voiceMode ? "End voice" : "Live voice"}
          </button>
        </div>
        <audio ref={remoteAudioRef} autoPlay playsInline aria-label="Morrow live voice audio" style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}/>
        <div className="chat-window">
          {turns.map((turn, index) => <div className={`chat-message ${turn.role === "user" ? "from-user" : "from-ai"}`} key={`${turn.role}-${index}`}>
            <div className={`chat-avatar ${turn.role === "user" ? "learner-avatar" : "ai-avatar"}`}>{turn.role === "user" ? "US" : <BrainCircuit size={16}/>}</div>
            <div className="chat-message-content"><div className="chat-name">{turn.role === "user" ? "You" : "Conversation partner"}<span>{turn.role === "assistant" ? "AI character" : "Learner"}</span></div><div className="chat-bubble">{turn.content}</div></div>
          </div>)}
          {busy && <div className="chat-message from-ai"><div className="chat-avatar ai-avatar"><BrainCircuit size={16}/></div><div className="chat-message-content"><div className="chat-name">Conversation partner <span>AI character</span></div><div className="chat-bubble typing"><i/><i/><i/></div></div></div>}
          <div ref={chatEndRef}/>
        </div>
        {report ? <div className="session-finished"><CheckCircle2 size={18}/><div><strong>Practice complete</strong><span>Your reflection report is ready in the panel.</span></div><button className="btn btn-secondary btn-small" onClick={onRestart}>Try again</button></div> : <form className="composer" onSubmit={(e) => { e.preventDefault(); onSend(); }}>
          <textarea value={composer} onChange={(e) => setComposer(e.target.value)} placeholder={voiceEngine === "realtime" ? "Live audio is active. You can type after ending voice mode." : "Type what you would say..."} rows={2} disabled={voiceEngine === "realtime"} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} aria-label="Your roleplay response"/>
          <div className="composer-bottom"><span><Lightbulb size={13}/> Try acknowledging their concern before offering a solution.</span><button className="btn btn-primary" disabled={busy || !composer.trim() || voiceEngine === "realtime"} type="submit"><Send size={15}/> Send response</button></div>
        </form>}
        <div className="room-bottom-bar"><span><ShieldCheck size={13}/> Private practice prototype</span><span>{turns.filter((t) => t.role === "user").length} responses</span><button className="finish-link" disabled={busy || !!report} onClick={() => { stopVoice(); onFinish(); }}>Finish & reflect <ArrowRight size={14}/></button></div>
      </section>
      <aside className="room-side">
        <div className="panel side-panel">
          <div className="side-panel-title"><div className="tiny-sparkle"><Sparkles size={16}/></div><div><h3>Session guide</h3><span>A gentle reminder</span></div></div>
          <div className="guide-step"><div className="guide-step-num">1</div><div><strong>Pause and listen</strong><p>Identify the other person's main concern before moving to a solution.</p></div></div>
          <div className="guide-step"><div className="guide-step-num">2</div><div><strong>Acknowledge the impact</strong><p>Show you understand why the situation matters to them.</p></div></div>
          <div className="guide-step"><div className="guide-step-num">3</div><div><strong>Agree on a next step</strong><p>Suggest something concrete and check whether it helps.</p></div></div>
          <div className="side-divider"/>
          <div className="session-meta-row"><span><Clock3 size={14}/> Suggested duration</span><strong>{scenario.minutes} min</strong></div>
          <div className="session-meta-row"><span><Target size={14}/> Skill level</span><strong>{scenario.level}</strong></div>
        </div>
        {report ? <ReportPanel report={report} scenario={scenario}/> : <div className="coach-hint"><div className="coach-hint-icon"><Sparkles size={17}/></div><div><strong>Keep it human</strong><p>There isn't one perfect answer. Respond naturally and see how the conversation develops.</p></div></div>}
      </aside>
    </div>
  </div>;
}

function ReportPanel({ report, scenario }: { report: Report; scenario: Scenario }) { return <div className="panel report-panel"><div className="report-head"><div><div className="eyebrow">SESSION REFLECTION</div><h3>Your feedback</h3></div><span className={`mode-chip ${report.mode === "ai" ? "mode-ai" : "mode-demo"}`}>{report.mode === "ai" ? "AI REVIEW" : "DEMO REVIEW"}</span></div><div className="report-score"><div className="report-score-number">{report.overall}<span>/100</span></div><div className="report-score-bar"><i style={{ width: `${report.overall}%` }}/></div><p>{report.summary}</p></div><div className="report-section"><strong><CheckCircle2 size={15}/> What went well</strong><ul>{report.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></div><div className="report-section"><strong><Lightbulb size={15}/> Next to practise</strong><ul>{report.improvements.map((x, i) => <li key={i}>{x}</li>)}</ul></div><div className="rubric-list">{report.scores.map((s) => <div className="rubric-item" key={s.criterion}><div><span>{s.criterion}</span><strong>{s.score}/5</strong></div><div className="rubric-track"><i style={{ width: `${s.score * 20}%` }}/></div><p>{s.rationale}</p></div>)}</div><div className="next-practice"><span>YOUR NEXT STEP</span><p>{report.nextStep}</p></div><ReflectionCoach report={report} scenario={scenario}/></div>; }

function ReflectionCoach({ report, scenario }: { report: Report; scenario: Scenario }) {
  const [coachTurns, setCoachTurns] = useState<{ role: "learner" | "coach"; content: string }[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  async function send(content: string) {
    const text = content.trim();
    if (!text || sending) return;
    const next = [...coachTurns, { role: "learner" as const, content: text }];
    setCoachTurns(next); setMessage(""); setSending(true);
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: { title: scenario.title, objective: scenario.objective }, report: { summary: report.summary, strengths: report.strengths, improvements: report.improvements, nextStep: report.nextStep }, turns: next, message: text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Coach unavailable");
      setCoachTurns([...next, { role: "coach", content: data.reply }]);
    } catch { setCoachTurns([...next, { role: "coach", content: "Take a moment to reflect: what did you want the other person to understand, and what could you try next time to make that clearer?" }]); }
    finally { setSending(false); }
  }
  const prompts = ["What felt most challenging?", "What would you try differently?", "What response are you proud of?"];
  return <div className="reflection-coach"><div className="reflection-title"><div className="reflection-title-icon"><Sparkles size={14}/></div><div><strong>Reflect with your coach</strong><span>Make meaning from the practice</span></div></div>{coachTurns.length === 0 ? <><p className="reflection-intro">Before you move on, think about what happened. Your reflection matters as much as the score.</p><div className="reflection-prompts">{prompts.map((p) => <button key={p} onClick={() => void send(p)} disabled={sending}>{p}</button>)}</div></> : <div className="reflection-thread">{coachTurns.map((t, i) => <div className={`reflection-bubble ${t.role}`} key={`${t.role}-${i}`}><span>{t.role === "coach" ? "COACH" : "YOU"}</span><p>{t.content}</p></div>)}{sending && <span className="coach-thinking">Coach is thinking…</span>}</div>}<form className="reflection-input" onSubmit={(e) => { e.preventDefault(); void send(message); }}><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Share one thought about the conversation…" aria-label="Reflection response"/><button className="btn btn-primary btn-small" disabled={sending || !message.trim()} type="submit"><Send size={13}/></button></form><span className="reflection-disclaimer">AI coaching is reflective support, not a clinical assessment.</span></div>;
}

function ScenarioStudio({ scenarios, sessions, onCreate, onPreview, onDelete }: { scenarios: Scenario[]; sessions: Session[]; onCreate: () => void; onPreview: (s: Scenario) => void; onDelete: (id: string) => void }) { return <div className="view-stack"><div className="studio-banner"><div><div className="eyebrow">SCENARIO LIBRARY</div><h2>Practice starts with a good prompt.</h2><p>Create original conversations around a skill, objective and character. Drafts live in this browser in the current prototype.</p></div><div className="studio-banner-icon"><WandSparkles size={30}/></div></div><div className="studio-summary"><div><span>SCENARIOS</span><strong>{scenarios.length}</strong></div><div><span>COMPLETED ATTEMPTS</span><strong>{sessions.length}</strong></div><div><span>CUSTOM SCENARIOS</span><strong>{scenarios.filter((s) => s.id.startsWith("custom-")).length}</strong></div><button className="btn btn-primary" onClick={onCreate}><Plus size={16}/> New scenario</button></div><div className="panel studio-list-panel"><div className="panel-heading"><div><span className="eyebrow">ALL CONTENT</span><h3>Scenario library</h3></div><span className="small-muted">{scenarios.length} available</span></div><div className="studio-list">{scenarios.map((s) => <div className="studio-row" key={s.id}><div className={`scenario-icon icon-${s.accent}`}><MessageCircle size={20}/></div><div className="studio-row-main"><div className="scenario-category">{s.category}</div><strong>{s.title}</strong><p>{s.objective}</p></div><div className="studio-row-tags"><span className="difficulty-pill">{s.level}</span><span className="time-label"><Clock3 size={13}/>{s.minutes}m</span></div><div className="studio-row-actions"><button className="btn btn-secondary btn-small" onClick={() => onPreview(s)}>Preview</button>{s.id.startsWith("custom-") && <button className="icon-btn tiny danger-btn" title="Delete custom scenario" onClick={() => onDelete(s.id)}><X size={16}/></button>}</div></div>)}</div></div><div className="disclaimer-line"><ShieldCheck size={14}/><span>Use fictional people and invented scenarios. Trainer permissions and server-side publishing are not wired up yet.</span></div></div>; }

function LearnersView({ sessions }: { sessions: Session[] }) { const names = [{ name: "Ujjwal Shrestha", role: "Learner", email: "ujjwal.demo@example.test", color: "indigo" }, { name: "Maya Patel", role: "Learner", email: "maya.demo@example.test", color: "peach" }, { name: "Alex Morgan", role: "Trainer", email: "alex.demo@example.test", color: "mint" }, { name: "Jamie Chen", role: "Learner", email: "jamie.demo@example.test", color: "blue" }]; return <div className="view-stack"><div className="privacy-banner"><div className="privacy-icon"><Users size={19}/></div><div><strong>Demo learner directory</strong><p>These are fictional sample people. This screen demonstrates the intended trainer overview; user authentication and real organization memberships are not connected.</p></div></div><div className="stat-grid compact-stats"><StatCard label="Demo learners" value="03" hint="Sample learner profiles" icon={Users} tone="purple"/><StatCard label="Sessions saved here" value={String(sessions.length).padStart(2,"0")} hint="Only this browser's data" icon={CheckCircle2} tone="green"/><StatCard label="Trainer accounts" value="01" hint="Sample trainer profile" icon={GraduationCap} tone="blue"/><StatCard label="Needs attention" value="—" hint="No real learners connected" icon={Lightbulb} tone="orange"/></div><div className="panel studio-list-panel"><div className="panel-heading"><div><span className="eyebrow">WORKSPACE MEMBERS</span><h3>Learner directory</h3></div><button className="btn btn-secondary btn-small" onClick={() => alert("Invite flow is part of the Supabase/auth implementation phase.")}><Plus size={14}/> Invite member</button></div><div className="table-wrap"><table><thead><tr><th>MEMBER</th><th>ROLE</th><th>PRACTICES</th><th>AVERAGE SCORE</th><th>STATUS</th></tr></thead><tbody>{names.map((x, i) => { const userSessions = i === 0 ? sessions : []; const avg = userSessions.length ? Math.round(userSessions.reduce((a, b) => a + b.overall, 0) / userSessions.length) : 0; return <tr key={x.email}><td><div className="table-scenario"><div className={`avatar avatar-${x.color}`}>{initials(x.name)}</div><div><strong>{x.name}</strong><span>{x.email}</span></div></div></td><td><span className="role-chip">{x.role}</span></td><td>{userSessions.length}</td><td>{userSessions.length ? `${avg}%` : "—"}</td><td><span className="status-chip muted-status">Demo only</span></td></tr>; })}</tbody></table></div></div></div>; }

function AnalyticsView({ sessions, scenarios, average }: { sessions: Session[]; scenarios: Scenario[]; average: number }) { const catCounts = scenarios.map((s) => ({ category: s.category, count: sessions.filter((x) => x.scenarioId === s.id).length })).reduce((arr, item) => { const found = arr.find((x) => x.category === item.category); if (found) found.count += item.count; else arr.push({ ...item }); return arr; }, [] as {category: string; count: number}[]); const max = Math.max(1, ...catCounts.map((x) => x.count)); return <div className="view-stack"><div className="analytics-intro"><div><div className="eyebrow">PRACTICE INSIGHTS</div><h2>Progress is more than a score.</h2><p>Look for consistency, repeated practice and specific skills to work on next.</p></div><div className="analytics-mark"><BarChart3 size={26}/></div></div><div className="stat-grid"><StatCard label="Completed sessions" value={String(sessions.length)} hint="All sessions saved in this browser" icon={CheckCircle2} tone="green"/><StatCard label="Average score" value={sessions.length ? `${average}%` : "—"} hint="Formative AI-generated signal" icon={Target} tone="purple"/><StatCard label="Total learner turns" value={String(sessions.reduce((n, s) => n + s.turns.filter((t) => t.role === "user").length, 0))} hint="Learner responses across sessions" icon={MessageCircle} tone="blue"/><StatCard label="Scenarios attempted" value={String(new Set(sessions.map((x) => x.scenarioId)).size)} hint="Distinct scenario versions not tracked in demo" icon={BookOpen} tone="orange"/></div><div className="content-grid analytics-grid"><div className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">PRACTICE BY SKILL</span><h3>Scenario activity</h3></div><span className="small-muted">Sessions</span></div>{catCounts.length && sessions.length ? <div className="bar-chart">{catCounts.map((x) => <div className="bar-row" key={x.category}><span>{x.category}</span><div className="bar-track"><i style={{ width: `${x.count / max * 100}%` }}/></div><strong>{x.count}</strong></div>)}</div> : <div className="empty-state chart-empty"><div className="empty-symbol"><BarChart3 size={22}/></div><strong>Charts will grow with practice</strong><span>Complete a few scenarios to see activity by skill.</span></div>}</div><div className="panel focus-panel"><div className="panel-heading"><div><span className="eyebrow">NEXT BEST STEP</span><h3>Suggested focus</h3></div><div className="focus-icon"><Target size={17}/></div></div>{sessions.length ? <><div className="focus-big">Reflect on your last conversation</div><p className="focus-body">Review the evidence behind your most recent feedback and repeat the scenario with one specific behaviour in mind.</p><div className="focus-tag"><Lightbulb size={13}/> One improvement at a time</div></> : <><div className="focus-big">Start with one scenario</div><p className="focus-body">A single completed practice gives the dashboard useful material to reflect on.</p><div className="focus-tag"><Lightbulb size={13}/> Progress over perfection</div></>}</div></div><div className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow">SESSION HISTORY</span><h3>Completed practice</h3></div><span className="small-muted">{sessions.length} total</span></div>{sessions.length ? <div className="table-wrap"><table><thead><tr><th>SCENARIO</th><th>COMPLETED</th><th>SCORE</th><th>RESPONSE COUNT</th></tr></thead><tbody>{sessions.map((s) => <tr key={s.id}><td><div className="table-scenario"><div className="table-avatar"><MessageCircle size={15}/></div><div><strong>{s.scenarioTitle}</strong><span>{s.report.mode === "ai" ? "AI feedback" : "Demo feedback"}</span></div></div></td><td>{prettyDate(s.completedAt)}</td><td><strong>{s.overall}%</strong></td><td>{s.turns.filter((t) => t.role === "user").length}</td></tr>)}</tbody></table></div> : <div className="empty-state inline-empty"><strong>No data yet</strong><span>Complete a session to populate this report.</span></div>}</div></div>; }

function SettingsView({ onReset }: { onReset: () => void }) { return <div className="view-stack settings-view"><div className="settings-warning"><ShieldCheck size={20}/><div><strong>This is a local-first prototype</strong><p>The learner and trainer views share your current browser data. This is not a secured multi-user platform yet.</p></div></div><div className="panel settings-panel"><div className="panel-heading"><div><span className="eyebrow">APPLICATION</span><h3>Workspace settings</h3></div></div><div className="settings-row"><div className="settings-row-icon"><LayoutDashboard size={18}/></div><div><strong>Workspace name</strong><span>Northstar Learning · local demo workspace</span></div><span className="settings-value">Demo</span></div><div className="settings-row"><div className="settings-row-icon"><BrainCircuit size={18}/></div><div><strong>AI roleplay provider</strong><span>Uses demo replies unless a server-side OPENAI_API_KEY is configured.</span></div><span className="status-chip muted-status">Optional</span></div><div className="settings-row"><div className="settings-row-icon"><DatabaseIcon/></div><div><strong>Data storage</strong><span>Scenarios and session summaries are stored in this browser's localStorage.</span></div><span className="status-chip muted-status">Local</span></div><div className="settings-row"><div className="settings-row-icon"><ShieldCheck size={18}/></div><div><strong>Authentication and access control</strong><span>Supabase migration is included, but auth and RLS are not connected to the interface.</span></div><span className="status-chip status-planned">Planned</span></div></div><div className="panel settings-panel"><div className="panel-heading"><div><span className="eyebrow">DEVELOPMENT</span><h3>Demo data</h3></div></div><p className="settings-desc">Reset scenarios and saved practice sessions in this browser. This does not touch a remote database.</p><button className="btn btn-danger" onClick={() => { if (confirm("Reset the local demo scenarios and saved sessions? This cannot be undone.")) onReset(); }}><X size={15}/> Reset local demo</button></div><div className="disclaimer-line"><ShieldCheck size={14}/><span>Before a real pilot, implement login, server-side role checks, RLS, consent, retention and deletion workflows.</span></div></div>; }
function DatabaseIcon() { return <FileText size={18}/>; }
