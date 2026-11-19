import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, ClipboardCheck, BookOpen, BarChart3, Users,
  Settings, LogOut, Bell, Search, Menu, X, ChevronRight, Clock,
  CheckCircle2, AlertCircle, Play, Plus, Edit3, Trash2, Eye,
  ShieldCheck, FileText, Target, Trophy, UserCircle, Lock, Mail,
  ArrowRight, Download, Filter, MoreHorizontal, PanelLeftClose,
  PanelLeft
} from "lucide-react";
import "./styles.css";

const examData = [];

const qBank = [];

const questions = [];


const API_BASE = import.meta.env.VITE_API_URL || "";
async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("oqes_token");
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
  return data;
}
function fromApiExam(e) { return { id:e.id, title:e.title, subject:e.subject, description:e.description, duration:e.durationMinutes, totalMarks:e.totalMarks, status:e.status === "PUBLISHED" ? "Available" : e.status === "CLOSED" ? "Completed" : "Draft", questionsData:(e.questions||[]).map(q=>({ q:q.text, options:q.options, correct:q.correct ?? 0, marks:Number(q.marks||1), explanation:q.explanation||"" })) }; }

function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      {label}
      {children}
    </label>
  );
}

function downloadCSV(filename, rows) {
  const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadStore(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function saveStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable - ignore */
  }
}

const initialNotes = [];

function App() {
  const [auth, setAuth] = useState(() => Boolean(localStorage.getItem("oqes_token")));
  const [role, setRole] = useState(() => { try { return JSON.parse(localStorage.getItem("oqes_user") || "{}").role?.toLowerCase().replace(/^./, c => c.toUpperCase()) || "Student"; } catch { return "Student"; } });
  const [userEmail, setUserEmail] = useState(() => { try { return JSON.parse(localStorage.getItem("oqes_user") || "{}").email || ""; } catch { return ""; } });
  const [page, setPage] = useState("dashboard");
  const [mobile, setMobile] = useState(false);
  const [exam, setExam] = useState(null);
  const [toast, setToast] = useState("");
  const [result, setResult] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [query, setQuery] = useState("");

  const unread = notes.filter((n) => !n.read).length;

  useEffect(() => {
    const token = localStorage.getItem("oqes_token");
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => { if (!response.ok) throw new Error("Session expired"); return response.json(); })
      .then(user => { setRole(user.role.charAt(0) + user.role.slice(1).toLowerCase()); setUserEmail(user.email); })
      .catch(() => { localStorage.removeItem("oqes_token"); localStorage.removeItem("oqes_user"); setAuth(false); });
  }, []);

  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  };

  if (!auth) {
    return (
      <Auth
        onLogin={(selectedRole, selectedEmail) => {
          setRole(selectedRole);
          setUserEmail(selectedEmail || "");
          setAuth(true);
          setPage("dashboard");
        }}
      />
    );
  }

  const start = (selectedExam) => {
    setExam(selectedExam);
    setPage("instructions");
  };

  const nav = (nextPage) => {
    setPage(nextPage);
    setMobile(false);
  };

  const runSearch = (raw) => {
    const q = raw.trim().toLowerCase();
    if (!q) return;
    const rules = [
      [/exam|test|assessment/, role === "Student" ? "exams" : "manage-exams"],
      [/question|mcq/, role === "Student" ? null : "questions"],
      [/user|student|teacher|admin/, role === "Admin" ? "users" : null],
      [/result|score|grade/, role === "Student" ? "result" : role === "Teacher" ? "teacher-results" : "admin-results"],
      [/leader|rank/, role === "Student" ? "leaderboard" : null],
      [/analytic|report|performance/, "analytics"],
      [/notif|alert/, "notifications"],
      [/setting|password|security/, "settings"],
      [/profile|account/, "profile"],
      [/dashboard|home/, "dashboard"]
    ];
    const hit = rules.find(([re, pg]) => pg && re.test(q));
    if (hit) {
      nav(hit[1]);
      setQuery("");
    } else {
      notify(`No results for "${raw.trim()}"`);
    }
  };

  const resultFor = (score) => {
    const total = questions.length;
    const correct = Math.round((score / 100) * total);
    return {
      correct,
      incorrect: total - correct,
      unanswered: 0,
      percentage: score
    };
  };

  const viewResult = (e) => {
    setResult(resultFor(e.score ?? 0));
    nav("result");
  };

  const logout = () => {
    localStorage.removeItem("oqes_token");
    localStorage.removeItem("oqes_user");
    setAuth(false);
    setPage("dashboard");
    setResult(null);
    setExam(null);
  };

  return (
    <div className="app">
      <aside
        className={
          "sidebar " +
          (collapsed ? "collapsed " : "") +
          (mobile ? "open" : "")
        }
      >
        <div className="brand">
          <div className="brandmark">Q</div>
          <span>Online Quiz and Examination System</span>
        </div>

        <button
          className="collapse"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <PanelLeft /> : <PanelLeftClose />}
        </button>

        <div className="workspace">
          <small>WORKSPACE</small>
          <div className="workspace-role">{role} workspace</div>
        </div>

        <nav>
          <Nav
            i={<LayoutDashboard />}
            t="Dashboard"
            a={page === "dashboard"}
            c={() => nav("dashboard")}
          />

          {role === "Student" && (
            <Nav
              i={<ClipboardCheck />}
              t="Examinations"
              a={page === "exams"}
              c={() => nav("exams")}
            />
          )}

          {role === "Student" && (
            <Nav
              i={<Trophy />}
              t="My Results"
              a={page === "result"}
              c={() => nav("result")}
            />
          )}

          {role === "Teacher" && (
            <>

              <Nav
                i={<FileText />}
                t="Manage Exams"
                a={page === "manage-exams"}
                c={() => nav("manage-exams")}
              />

              <Nav
                i={<ClipboardCheck />}
                t="Exam Results"
                a={page === "teacher-results"}
                c={() => nav("teacher-results")}
              />
            </>
          )}

          {role === "Admin" && (
            <>
              <Nav
                i={<Users />}
                t="User Management"
                a={page === "users"}
                c={() => nav("users")}
              />

              <Nav
                i={<FileText />}
                t="Manage Exams"
                a={page === "manage-exams"}
                c={() => nav("manage-exams")}
              />

              <Nav
                i={<ClipboardCheck />}
                t="All Results"
                a={page === "admin-results"}
                c={() => nav("admin-results")}
              />
            </>
          )}

          <Nav
            i={<BarChart3 />}
            t={role === "Admin" ? "System Analytics" : "Analytics"}
            a={page === "analytics"}
            c={() => nav("analytics")}
          />

          {role === "Student" && (
            <Nav
              i={<Trophy />}
              t="Leaderboard"
              a={page === "leaderboard"}
              c={() => nav("leaderboard")}
            />
          )}
        </nav>

        <div className="side-bottom">
          <Nav
            i={<Bell />}
            t="Notifications"
            a={page === "notifications"}
            c={() => nav("notifications")}
          />

          <Nav
            i={<Settings />}
            t="Settings"
            a={page === "settings"}
            c={() => nav("settings")}
          />

          <Nav
            i={<UserCircle />}
            t="My Profile"
            a={page === "profile"}
            c={() => nav("profile")}
          />

          <Nav
            i={<LogOut />}
            t="Logout"
            a={false}
            c={logout}
          />
        </div>
      </aside>

      <main className={"main " + (collapsed ? "wide" : "")}>
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>

          <div className="crumb">
            <span className="muted">Online Quiz and Examination System / </span>
            {page.replaceAll("-", " ")}
          </div>

          <div className="top-actions">
            <div className="global-search">
              <Search size={16} />
              <input
                placeholder="Search anything..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
              />
            </div>

            <button
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => nav("notifications")}
            >
              <Bell />
              {unread > 0 && <b>{unread}</b>}
            </button>

            <button
              type="button"
              className="avatar"
              aria-label="My profile"
              onClick={() => nav("profile")}
            >
              DS
            </button>
          </div>
        </header>

        {page === "dashboard" && (
          <Dashboard role={role} start={start} nav={nav} />
        )}

        {page === "exams" && <Exams start={start} viewResult={viewResult} userEmail={userEmail} />}

        {page === "instructions" && (
          <Instructions
            exam={exam}
            onStart={() => nav("attempt")}
          />
        )}

        {page === "attempt" && (
          <Attempt
            exam={exam}
            onSubmit={(r) => {
              setResult(r);
              nav("result");
            }}
          />
        )}

        {page === "result" && (
          <Result nav={nav} result={result || resultFor(0)} />
        )}

        {page === "analytics" && (
          <Analytics role={role} />
        )}

        {page === "questions" && (
          <QuestionBank notify={notify} />
        )}

        {page === "manage-exams" && (
          <ManageExams notify={notify} />
        )}

        {page === "users" && <UsersPage notify={notify} />}

        {page === "teacher-results" && (
          <TeacherResults />
        )}

        {page === "admin-results" && (
          <AdminResults />
        )}

        {page === "leaderboard" && <Leaderboard />}

        {page === "notifications" && (
          <Notifications notes={notes} setNotes={setNotes} notify={notify} />
        )}

        {page === "profile" && (
          <Profile notify={notify} role={role} />
        )}

        {page === "settings" && (
          <SettingsPage notify={notify} />
        )}

        {toast && (
          <div className="toast">
            <CheckCircle2 /> {toast}
          </div>
        )}
      </main>
    </div>
  );
}

function Nav({ i, t, a, c }) {
  return (
    <button
      className={"nav " + (a ? "active" : "")}
      onClick={c}
    >
      {i}
      <span>{t}</span>
    </button>
  );
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "";

  const handleSubmit = async () => {
    const key = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(key)) return setError("Please enter a valid email address.");
    if (!password) return setError("Please enter your password.");
    if (mode === "signup" && (!name.trim() || password.length < 8)) return setError("Enter your name and a password of at least 8 characters.");
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/auth/${mode === "signup" ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { name: name.trim(), email: key, password } : { email: key, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.detail || "Unable to authenticate. Check your details and try again.");
      localStorage.setItem("oqes_token", data.token);
      localStorage.setItem("oqes_user", JSON.stringify(data.user));
      const roleName = data.user.role.charAt(0) + data.user.role.slice(1).toLowerCase();
      onLogin(roleName, data.user.email);
    } catch (err) {
      setError(err.message || "Cannot connect to the server. Make sure the backend and database are running.");
    }
  };

  const closeForgot = () => {
    setForgot(false);
    setResetSent(false);
    setResetEmail("");
  };

  return (
    <div className="auth">
      <div className="auth-art">
        <div className="auth-brand">
          <div className="brandmark">Q</div>
          Online Quiz and Examination System
        </div>

        <div className="art-copy">
          <span className="eyebrow">SMART EXAMINATION PLATFORM</span>

          <h1>
            Assess. Learn.
            <br />
            <em>Improve.</em>
          </h1>

          <p>
            One intelligent platform for modern online
            examinations, assessment and performance analytics.
          </p>

          <div className="art-stats">
            <span><strong>10K+</strong> Assessments</span>
            <span><strong>98%</strong> Reliability</span>
          </div>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-head">
          <div className="mini-logo">Q</div>

          <h2>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>

          <p>
            {mode === "login"
              ? "Sign in to continue to your workspace."
              : "Start managing and taking smarter assessments."}
          </p>
        </div>

        {mode === "signup" && (
          <label>
            Full name
            <input
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}

        <label>
          Email address

          <div className="input-icon">
            <Mail />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
        </label>

        <label>
          Password

          <div className="input-icon">
            <Lock />
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="••••••••"
            />

            <button type="button" onClick={() => setShow(!show)}>
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="primary auth-submit" onClick={handleSubmit}>
          {mode === "login" ? "Sign in" : "Create account"}
          <ArrowRight />
        </button>

        <p className="switch">
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </p>


      </div>


    </div>
  );
}

function Dashboard({ role, start, nav }) {
  if (role === "Student") {
    return <StudentDashboard start={start} nav={nav} />;
  }

  if (role === "Teacher") {
    return <TeacherDashboard nav={nav} />;
  }

  return <AdminDashboard nav={nav} />;
}

function StudentDashboard({ start, nav }) {
  const published = loadStore("examsphere_exams", []).filter(e=>e.status==="Available");
  return (
    <section className="content">
      <div className="hero">
        <div>
          <p className="eyebrow">
            STUDENT WORKSPACE
          </p>

          <h1>
            Welcome back <span>✦</span>
          </h1>

          <p>
            Track your examinations, performance and
            learning progress.
          </p>
        </div>

        <button
          className="primary"
          onClick={() => nav("exams")}
        >
          <Play /> Quick Start
        </button>
      </div>

      <div className="stats">
        <Stat i={<ClipboardCheck />} v="0" l="Exams Attempted" />
        <Stat
          i={<BarChart3 />}
          v="0%"
          l="Average Score"
        />
        <Stat
          i={<Target />}
          v="0%"
          l="Accuracy"
        />
        <Stat
          i={<Clock />}
          v="0h"
          l="Learning Time"
        />
      </div>

      <div className="grid2">
        <div className="panel">
          <Head
            title="Upcoming examinations"
            sub="Your scheduled and available assessments"
            action={() => nav("exams")}
          />

          {published.slice(0,3).map((e, i) => (
              <ExamRow
                e={e}
                key={e.id}
                start={start}
                i={i}
              />
            ))}
        </div>

        <div className="panel">
          <Head
            title="Performance overview"
            sub="Last 7 activity points"
          />
          <MiniChart />
        </div>
      </div>

      <div className="section-title">
        <h2>Continue learning</h2>

        <button
          className="link"
          onClick={() => nav("analytics")}
        >
          View progress <ChevronRight />
        </button>
      </div>

      <div className="learning-grid">
        <Learning
          t="Data Structures"
          p={72}
          m="18 / 25 topics"
        />

        <Learning
          t="DBMS"
          p={48}
          m="12 / 25 topics"
        />

        <Learning
          t="Operating Systems"
          p={31}
          m="8 / 26 topics"
        />
      </div>
    </section>
  );
}

function TeacherDashboard({ nav }) {
  return (
    <section className="content">
      <div className="hero">
        <div>
          <p className="eyebrow">
            TEACHER WORKSPACE
          </p>

          <h1>
            Good evening, Teacher <span>✦</span>
          </h1>

          <p>
            Create assessments, add questions and
            review student performance.
          </p>
        </div>

        <button
          className="primary"
          onClick={() => nav("manage-exams")}
        >
          <Plus /> Create Exam
        </button>
      </div>

      <div className="stats">
        <Stat
          i={<FileText />}
          v="0"
          l="Exams Created"
        />
        <Stat
          i={<Play />}
          v="0"
          l="Active Exams"
        />
        <Stat
          i={<Users />}
          v="0"
          l="Students Assessed"
        />
        <Stat
          i={<BarChart3 />}
          v="0%"
          l="Average Class Score"
        />
      </div>

      <div className="grid2">
        <div className="panel">
          <Head
            title="Class performance"
            sub="Average scores by subject"
          />

          {[
            ["Data Structures", 84],
            ["DBMS", 76],
            ["Operating Systems", 72],
            ["Computer Networks", 81]
          ].map(([subject, score]) => (
            <div
              className="metric"
              key={subject}
            >
              <div>
                <span>{subject}</span>
                <strong>{score}%</strong>
              </div>

              <div className="progress">
                <i
                  style={{
                    width: score + "%"
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <Head
            title="Recent examinations"
            sub="Latest assessment activity"
          />

          <Activity
            title="Data Structures Assessment"
            detail="42 students attempted"
          />

          <Activity
            title="DBMS Mid Examination"
            detail="38 students attempted"
          />

          <Activity
            title="Operating Systems Quiz"
            detail="31 students attempted"
          />
        </div>
      </div>

      <div className="section-title">
        <h2>Teacher actions</h2>
      </div>

      <div className="learning-grid">

        <ActionCard
          icon={<FileText />}
          title="Manage Exams"
          text="Create and schedule assessments"
          onClick={() => nav("manage-exams")}
        />

        <ActionCard
          icon={<BarChart3 />}
          title="Exam Results"
          text="Review student performance"
          onClick={() => nav("teacher-results")}
        />
      </div>
    </section>
  );
}

function AdminDashboard({ nav }) {
  return (
    <section className="content">
      <div className="hero">
        <div>
          <p className="eyebrow">
            ADMINISTRATION
          </p>

          <h1>
            Good evening, Admin <span>✦</span>
          </h1>

          <p>
            Monitor the complete Online Quiz and Examination System platform.
          </p>
        </div>

        <button
          className="primary"
          onClick={() => nav("users")}
        >
          <Users /> Manage Users
        </button>
      </div>

      <div className="stats">
        <Stat
          i={<Users />}
          v="0"
          l="Total Students"
        />
        <Stat
          i={<Users />}
          v="0"
          l="Total Teachers"
        />
        <Stat
          i={<FileText />}
          v="0"
          l="Active Exams"
        />
        <Stat
          i={<ClipboardCheck />}
          v="0"
          l="Total Attempts"
        />
      </div>

      <div className="grid2">
        <div className="panel">
          <Head
            title="System overview"
            sub="Platform activity"
          />

          <Metric
            label="Students"
            value="0"
            percent={86}
          />

          <Metric
            label="Teachers"
            value="24"
            percent={48}
          />

          <Metric
            label="Active examinations"
            value="18"
            percent={72}
          />

          <Metric
            label="Question bank"
            value="1,248"
            percent={91}
          />
        </div>

        <div className="panel">
          <Head
            title="System activity"
            sub="Recent platform events"
          />

          <Activity
            title="New teacher registered"
            detail="2 hours ago"
          />

          <Activity
            title="New examination published"
            detail="4 hours ago"
          />

          <Activity
            title="Question bank updated"
            detail="5 hours ago"
          />

          <Activity
            title="System backup completed"
            detail="Yesterday"
          />
        </div>
      </div>

      <div className="section-title">
        <h2>Administration</h2>
      </div>

      <div className="learning-grid">
        <ActionCard
          icon={<Users />}
          title="User Management"
          text="Manage platform users"
          onClick={() => nav("users")}
        />

        <ActionCard
          icon={<FileText />}
          title="Manage Exams"
          text="Manage all examinations"
          onClick={() => nav("manage-exams")}
        />

        <ActionCard
          icon={<BarChart3 />}
          title="System Analytics"
          text="View platform analytics"
          onClick={() => nav("analytics")}
        />
      </div>
    </section>
  );
}

function Stat({ i, v, l }) {
  return (
    <div className="stat">
      <div className="stat-icon">{i}</div>

      <div>
        <strong>{v}</strong>
        <span>{l}</span>
      </div>
    </div>
  );
}

function Head({ title, sub, action }) {
  return (
    <div className="panel-head">
      <div>
        <h2>{title}</h2>
        <p className="muted">{sub}</p>
      </div>

      {action && (
        <button
          className="link"
          onClick={action}
        >
          View all <ChevronRight />
        </button>
      )}
    </div>
  );
}

function ExamRow({ e, start, i }) {
  return (
    <div className="exam-row">
      <div className="exam-icon">
        {["DS", "DB", "OS"][i] || "EX"}
      </div>

      <div className="exam-info">
        <strong>{e.title}</strong>
        <span>
          {e.questions} Questions · {e.duration} Minutes ·{" "}
          {e.level}
        </span>
      </div>

      <span
        className={
          "pill " +
          (e.status === "Available" ? "green" : "")
        }
      >
        {e.status}
      </span>

      <button
        className="outline"
        onClick={() => start(e)}
        disabled={e.status !== "Available"}
      >
        {e.status === "Available"
          ? "Start"
          : "Scheduled"}
      </button>
    </div>
  );
}

function MiniChart() {
  return (
    <div className="chart">
      <div className="bars">
        {[52, 70, 62, 81, 73, 88, 82].map(
          (v, i) => (
            <div className="barwrap" key={i}>
              <div
                className="bar"
                style={{ height: v + "%" }}
              />
              <span>
                {["M", "T", "W", "T", "F", "S", "S"][i]}
              </span>
            </div>
          )
        )}
      </div>

      <div className="legend">
        <span>Weekly score</span>
        <strong>82% avg.</strong>
      </div>
    </div>
  );
}

function Learning({ t, p, m }) {
  return (
    <div className="learning">
      <div className="course-symbol">
        {t.slice(0, 2)}
      </div>

      <div className="learning-body">
        <div>
          <strong>{t}</strong>
          <span>{m}</span>
        </div>

        <div className="progress">
          <i style={{ width: p + "%" }} />
        </div>

        <small>{p}% complete</small>
      </div>
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  sub,
  button
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{sub}</p>
      </div>

      {button}
    </div>
  );
}

function Exams({ start, viewResult, userEmail }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [created,setCreated] = useState(() => loadStore("examsphere_exams", []));
  useEffect(() => { if(localStorage.getItem("oqes_token")) apiRequest("/api/exams/published").then(rows=>{const next=rows.map(fromApiExam);setCreated(next);}).catch(()=>{}); }, []);
  const allExams = created.filter(x => x.status === "Available" && ((x.assignedTo || ["ALL"]).includes("ALL") || (x.assignedTo || []).includes(userEmail)));

  const visible = allExams.filter(
    (e) =>
      (filter === "All" || e.status === filter) &&
      (e.title + " " + e.subject)
        .toLowerCase()
        .includes(search.trim().toLowerCase())
  );

  return (
    <section className="content">
      <PageTitle
        eyebrow="ASSESSMENTS"
        title="Examinations"
        sub="Discover, schedule and attempt assessments."
      />

      <div className="filterbar">
        {["All", "Available", "Upcoming", "Completed"].map((f) => (
          <button
            key={f}
            className={"filter " + (filter === f ? "active" : "")}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}

        <div className="filter-search">
          <Search />
          <input
            placeholder="Search examinations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 && (
        <div className="panel empty">No examinations match your filters.</div>
      )}

      <div className="cards">
        {visible.map((e) => (
          <div className="exam-card" key={e.id}>
            <div className="card-top">
              <span className={"pill " + (e.status === "Available" ? "green" : "")}>
                {e.status}
              </span>
              <span className="muted">{e.level}</span>
            </div>

            <div className="exam-avatar">{e.title.slice(0, 2)}</div>

            <h2>{e.title}</h2>
            <p className="muted">{e.subject}</p>

            <div className="card-meta">
              <span><ClipboardCheck /> {e.questions} Questions</span>
              <span><Clock /> {e.duration} min</span>
            </div>

            {e.score && (
              <div className="previous">
                Previous score <strong>{e.score}%</strong>
              </div>
            )}

            <button
              className="primary full"
              disabled={e.status === "Upcoming"}
              onClick={() =>
                e.status === "Completed" ? viewResult(e) : start(e)
              }
            >
              {e.status === "Available"
                ? "Begin examination"
                : e.status === "Completed"
                ? "View result"
                : "Coming soon"}

              <ChevronRight />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Instructions({ exam, onStart }) {
  return (
    <section className="content">
      <div className="instruction-wrap">
        <div className="instruction-main">
          <p className="eyebrow">
            EXAMINATION READY
          </p>

          <h1>
            {exam?.title ||
              "Data Structures & Algorithms"}
          </h1>

          <p className="muted">
            Please read the instructions carefully before
            starting your examination.
          </p>

          <div className="exam-details">
            <Stat
              i={<ClipboardCheck />}
              v={exam?.questions || 40}
              l="Questions"
            />

            <Stat
              i={<Clock />}
              v={(exam?.duration || 60) + " min"}
              l="Duration"
            />

            <Stat
              i={<Target />}
              v="1"
              l="Attempt"
            />
          </div>

          <div className="panel instructions">
            <h2>General instructions</h2>

            <ul>
              <li>
                The examination will be automatically
                submitted when the timer reaches zero.
              </li>

              <li>
                You can navigate between questions using
                the question palette.
              </li>

              <li>
                You can mark questions for review and
                return to them later.
              </li>

              <li>
                Do not refresh or close the browser while
                the examination is active.
              </li>

              <li>
                Each question carries marks as displayed.
                Negative marking may apply.
              </li>
            </ul>

            <div className="warning">
              <AlertCircle />

              <span>
                Once you click{" "}
                <b>Start Examination</b>, the timer will
                begin immediately.
              </span>
            </div>
          </div>

          <button
            className="primary start-btn"
            onClick={onStart}
          >
            Start Examination <ArrowRight />
          </button>
        </div>
      </div>
    </section>
  );
}

function Attempt({ onSubmit, exam }) {
  const attemptQuestions = (exam?.questionsData || []).map(q => ({
    q: q.q, a: q.options || [], correct: Number(q.correct || 0), marks: Number(q.marks || 1)
  }));
  const [cur, setCur] = useState(0);
  const [ans, setAns] = useState({});
  const [marked, setMarked] = useState([]);
  const [sec, setSec] = useState(
    (exam?.duration || 60) * 60
  );
  const [submitted, setSubmitted] = useState(false);

  const submitExam = () => {
    if (submitted) return;

    setSubmitted(true);

    const correct = attemptQuestions.reduce((n, q, i) => n + (ans[i] === q.correct ? 1 : 0), 0);
    const answered = Object.keys(ans).length;
    const incorrect = answered - correct;
    const unanswered = attemptQuestions.length - answered;
    const totalMarks = attemptQuestions.reduce((n,q)=>n+q.marks,0);
    const earnedMarks = attemptQuestions.reduce((n,q,i)=>n+(ans[i] === q.correct ? q.marks : 0),0);
    const percentage = totalMarks ? Math.round(earnedMarks / totalMarks * 100) : 0;
    onSubmit({ correct, incorrect, unanswered, percentage, earnedMarks, totalMarks });
  };

  useEffect(() => {
    if (submitted) return;

    const timer = setInterval(() => {
      setSec((s) => {
        if (s <= 1) {
          clearInterval(timer);
          setTimeout(submitExam, 0);
          return 0;
        }

        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted]);

  const q = attemptQuestions[cur];
  if (!attemptQuestions.length) return <section className="content"><div className="panel empty">This test has no questions. Ask the teacher to update it before attempting.</div></section>;

  const selectAnswer = (index) => {
    setAns((previous) => ({
      ...previous,
      [cur]: index
    }));
  };

  const toggleReview = () => {
    setMarked((previous) =>
      previous.includes(cur)
        ? previous.filter((x) => x !== cur)
        : [...previous, cur]
    );
  };

  return (
    <div className="exam-screen">
      <div className="exam-top">
        <div>
          <strong>
            {exam?.title ||
              "Data Structures & Algorithms"}
          </strong>

          <span>
            Live examination · Question {cur + 1} of{" "}
            {attemptQuestions.length}
          </span>
        </div>

        <div className="timer">
          <Clock />

          {String(Math.floor(sec / 60)).padStart(
            2,
            "0"
          )}
          :
          {String(sec % 60).padStart(2, "0")}
        </div>

        <button
          className="danger"
          onClick={submitExam}
        >
          Submit Exam
        </button>
      </div>

      <div className="exam-body">
        <aside className="palette">
          <h3>Question palette</h3>

          <div className="palette-grid">
            {attemptQuestions.map((_, i) => (
              <button
                key={i}
                className={
                  (i === cur ? "current " : "") +
                  (ans[i] !== undefined
                    ? "answered "
                    : "") +
                  (marked.includes(i)
                    ? "marked"
                    : "")
                }
                onClick={() => setCur(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="palette-legend">
            <span>Answered</span>
            <span>Marked for review</span>
            <span>Unanswered</span>
          </div>
        </aside>

        <main className="question-area">
          <div className="question-card">
            <span className="pill">
              Multiple Choice · 1 mark
            </span>

            <h1>{q.q}</h1>

            <div className="options">
              {q.a.map((option, i) => (
                <button
                  key={option}
                  className={
                    "option " +
                    (ans[cur] === i
                      ? "selected"
                      : "")
                  }
                  onClick={() =>
                    selectAnswer(i)
                  }
                >
                  <span>
                    {String.fromCharCode(65 + i)}
                  </span>

                  {option}

                  {ans[cur] === i && (
                    <CheckCircle2 />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="question-actions">
            <button
              className="outline"
              disabled={cur === 0}
              onClick={() => setCur(cur - 1)}
            >
              Previous
            </button>

            <button
              className="review"
              onClick={toggleReview}
            >
              {marked.includes(cur)
                ? "Remove review"
                : "Mark for review"}
            </button>

            <button
              className="primary"
              onClick={() =>
                cur === attemptQuestions.length - 1
                  ? submitExam()
                  : setCur(cur + 1)
              }
            >
              {cur === attemptQuestions.length - 1
                ? "Submit"
                : "Next"}

              <ChevronRight />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function Result({ nav, result }) {
  const correct = result?.correct ?? 0;
  const incorrect = result?.incorrect ?? 0;
  const unanswered =
    result?.unanswered ?? 0;
  const percentage = result?.percentage ?? 0;

  return (
    <section className="content result-page">
      <div className="result-hero">
        <div className="success-icon">
          <CheckCircle2 />
        </div>

        <p className="eyebrow">
          EXAM COMPLETED
        </p>

        <h1>Excellent work, Divya!</h1>

        <p className="muted">
          Your examination has been evaluated
          successfully.
        </p>

        <div className="score">
          {percentage}
          <span>%</span>
        </div>

        <span className="pill green">
          {percentage >= 40
            ? "Passed"
            : "Needs Improvement"}
        </span>
      </div>

      <div className="stats">
        <Stat
          i={<CheckCircle2 />}
          v={correct}
          l="Correct"
        />

        <Stat
          i={<AlertCircle />}
          v={incorrect}
          l="Incorrect"
        />

        <Stat
          i={<Target />}
          v={`${percentage}%`}
          l="Accuracy"
        />

        <Stat
          i={<Clock />}
          v="Submitted"
          l="Status"
        />
      </div>

      <div className="result-grid">
        <div className="panel">
          <h2>Performance breakdown</h2>

          {[
            ["Correct answers", correct],
            ["Incorrect answers", incorrect],
            ["Unanswered", unanswered]
          ].map(([label, value]) => {
            const percent = Math.round(
              (value / Math.max(1, (result?.correct || 0) + (result?.incorrect || 0) + (result?.unanswered || 0))) * 100
            );

            return (
              <div
                className="metric"
                key={label}
              >
                <div>
                  <span>{label}</span>
                  <strong>
                    {value}{" "}
                    <small>{percent}%</small>
                  </strong>
                </div>

                <div className="progress">
                  <i
                    style={{
                      width: percent + "%"
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel">
          <h2>What next?</h2>

          <p className="muted">
            Review your weak areas and keep your
            learning streak active.
          </p>

          <button
            className="outline full"
            onClick={() => nav("analytics")}
          >
            View detailed analytics
          </button>

          <button
            className="primary full"
            onClick={() => nav("exams")}
          >
            Take another exam
          </button>
        </div>
      </div>
    </section>
  );
}

function Analytics({ role }) {
  if (role === "Teacher") {
    return <TeacherAnalytics />;
  }

  if (role === "Admin") {
    return <AdminAnalytics />;
  }

  return (
    <section className="content">
      <PageTitle
        eyebrow="INSIGHTS"
        title="Performance Analytics"
        sub="Detailed insights across your assessments."
      />

      <div className="stats">
        <Stat
          i={<BarChart3 />}
          v="0%"
          l="Overall Score"
        />

        <Stat
          i={<Target />}
          v="0%"
          l="Accuracy"
        />

        <Stat
          i={<Trophy />}
          v="#14"
          l="Class Rank"
        />

        <Stat
          i={<Clock />}
          v="0m"
          l="Avg. Time"
        />
      </div>

      <div className="grid2">
        <div className="panel">
          <h2>Subject performance</h2>

          {[
            ["Data Structures", 88],
            ["DBMS", 76],
            ["Operating Systems", 71],
            ["Computer Networks", 84],
            ["Java", 91]
          ].map(([subject, score]) => (
            <div
              className="metric"
              key={subject}
            >
              <div>
                <span>{subject}</span>
                <strong>{score}%</strong>
              </div>

              <div className="progress">
                <i
                  style={{
                    width: score + "%"
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <h2>Recent activity</h2>

          {[
            "Data Structures — 82%",
            "Computer Networks — 76%",
            "DBMS — 79%",
            "Java Fundamentals — 91%"
          ].map((x, i) => (
            <Activity
              key={x}
              title={x}
              detail={`${i + 1} days ago · Completed`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TeacherAnalytics() {
  return (
    <section className="content">
      <PageTitle
        eyebrow="TEACHER INSIGHTS"
        title="Class Analytics"
        sub="Monitor student performance across assessments."
      />

      <div className="stats">
        <Stat
          i={<BarChart3 />}
          v="0%"
          l="Class Average"
        />

        <Stat
          i={<Target />}
          v="0%"
          l="Class Accuracy"
        />

        <Stat
          i={<Users />}
          v="0"
          l="Students"
        />

        <Stat
          i={<FileText />}
          v="0"
          l="Examinations"
        />
      </div>

      <div className="grid2">
        <div className="panel">
          <h2>Class performance</h2>

          {[
            ["Data Structures", 84],
            ["DBMS", 76],
            ["Operating Systems", 72],
            ["Computer Networks", 81]
          ].map(([subject, score]) => (
            <div
              className="metric"
              key={subject}
            >
              <div>
                <span>{subject}</span>
                <strong>{score}%</strong>
              </div>

              <div className="progress">
                <i
                  style={{
                    width: score + "%"
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <h2>Recent activity</h2>

          <Activity
            title="Data Structures Assessment"
            detail="42 students attempted"
          />

          <Activity
            title="DBMS Mid Examination"
            detail="38 students attempted"
          />

          <Activity
            title="Operating Systems Quiz"
            detail="31 students attempted"
          />
        </div>
      </div>
    </section>
  );
}

function AdminAnalytics() {
  return (
    <section className="content">
      <PageTitle
        eyebrow="SYSTEM INSIGHTS"
        title="System Analytics"
        sub="Platform-wide examination and user statistics."
      />

      <div className="stats">
        <Stat
          i={<Users />}
          v="0"
          l="Total Users"
        />

        <Stat
          i={<FileText />}
          v="0"
          l="Active Exams"
        />

        <Stat
          i={<ClipboardCheck />}
          v="0"
          l="Attempts"
        />

        <Stat
          i={<BarChart3 />}
          v="0%"
          l="System Average"
        />
      </div>

      <div className="grid2">
        <div className="panel">
          <h2>Platform usage</h2>

          <Metric
            label="Student activity"
            value="86%"
            percent={86}
          />

          <Metric
            label="Teacher activity"
            value="72%"
            percent={72}
          />

          <Metric
            label="Exam completion"
            value="91%"
            percent={91}
          />

          <Metric
            label="Question bank usage"
            value="78%"
            percent={78}
          />
        </div>

        <div className="panel">
          <h2>System activity</h2>

          <Activity
            title="New examination published"
            detail="2 hours ago"
          />

          <Activity
            title="New teacher registered"
            detail="4 hours ago"
          />

          <Activity
            title="Question bank updated"
            detail="5 hours ago"
          />

          <Activity
            title="Backup completed"
            detail="Yesterday"
          />
        </div>
      </div>
    </section>
  );
}

function QuestionBank({ notify }) {
  const seed = qBank.map(q => ({
    ...q,
    options: q.options || ["Option A", "Option B", "Option C", "Option D"],
    correct: q.correct ?? 0,
    explanation: q.explanation || "",
  }));
  const [items, setItems] = useState(() => loadStore("examsphere_questions", seed));
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [diff, setDiff] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(null);
  const subjects = ["Data Structures", "DBMS", "Operating Systems", "Computer Networks", "Java Programming", "Software Engineering", "Computer Science"];
  const blank = { q: "", subject: subjects[0], topic: "", difficulty: "Easy", marks: 1, options: ["", "", "", ""], correct: 0, explanation: "" };
  const visible = items.filter(x => (subjectFilter === "All" || x.subject === subjectFilter) && (diff === "All" || x.difficulty === diff) && (x.q + " " + x.subject + " " + (x.topic || "")).toLowerCase().includes(search.trim().toLowerCase()));
  const open = (type, q) => { setModal({ type, q }); setForm(type === "new" ? { ...blank, options: [...blank.options] } : q ? { ...q, options: [...(q.options || ["", "", "", ""])] } : null); };
  const close = () => setModal(null);
  const set = k => e => setForm({ ...form, [k]: e.target.value });
  const setOption = (i, value) => setForm({ ...form, options: form.options.map((v, n) => n === i ? value : v) });
  const save = () => {
    if (!form.q.trim()) return notify("Enter the question text.");
    if (form.options.some(x => !x.trim())) return notify("Enter all four options.");
    const clean = { ...form, q: form.q.trim(), topic: form.topic.trim(), marks: Number(form.marks) || 1, correct: Number(form.correct) };
    const next = modal.type === "new" ? [{ ...clean, id: Date.now() }, ...items] : items.map(x => x.id === clean.id ? clean : x);
    setItems(next); saveStore("examsphere_questions", next); notify(modal.type === "new" ? "Question added to its subject bank." : "Question updated."); close();
  };
  const remove = () => { const next = items.filter(x => x.id !== modal.q.id); setItems(next); saveStore("examsphere_questions", next); notify("Question deleted."); close(); };
  const exportCSV = () => { downloadCSV("question-bank.csv", [["ID","Question","Subject","Topic","Difficulty","Marks","Option A","Option B","Option C","Option D","Correct Option"], ...visible.map(x => [x.id,x.q,x.subject,x.topic,x.difficulty,x.marks,...(x.options || []), String.fromCharCode(65 + Number(x.correct || 0))])]); notify(`Exported ${visible.length} questions`); };
  return <section className="content">
    <PageTitle eyebrow="CONTENT MANAGEMENT" title="Question Bank" sub="Questions are stored separately by subject. Add MCQs with four options and an answer key." button={<button className="primary" onClick={() => open("new")}><Plus /> New Question</button>} />
    <div className="toolbar"><div className="filter-search"><Search /><input placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}><option>All</option>{[...new Set([...subjects, ...items.map(x => x.subject)])].map(x => <option key={x}>{x}</option>)}</select>
      <button className="outline" onClick={() => setShowFilters(!showFilters)}><Filter /> Difficulty</button><button className="outline" onClick={exportCSV}><Download /> Export</button></div>
    {showFilters && <div className="filterbar">{["All","Easy","Medium","Hard"].map(d => <button key={d} className={"filter " + (diff === d ? "active" : "")} onClick={() => setDiff(d)}>{d}</button>)}</div>}
    <div className="panel table"><div className="table-head qgrid"><span>Question</span><span>Subject / Topic</span><span>Difficulty</span><span>Marks</span><span>Actions</span></div>
      {!visible.length && <div className="empty">No questions in this subject yet. Use “New Question” to add one.</div>}
      {visible.map(q => <div className="table-row qgrid" key={q.id}><strong>{q.q}</strong><span>{q.subject}<small>{q.topic || "General"}</small></span><span><b className={"difficulty " + q.difficulty.toLowerCase()}>{q.difficulty}</b></span><span>{q.marks}</span><span className="actions"><button title="View" onClick={() => open("view",q)}><Eye /></button><button title="Edit" onClick={() => open("edit",q)}><Edit3 /></button><button title="Delete" onClick={() => open("delete",q)}><Trash2 /></button></span></div>)}
    </div>
    {modal?.type === "view" && <Modal title="Question details" onClose={close}><h4 className="modal-q">{modal.q.q}</h4><p><b>{modal.q.subject}</b> · {modal.q.topic} · {modal.q.difficulty} · {modal.q.marks} mark(s)</p><ol>{(modal.q.options || []).map((o,i)=><li key={i}>{o}{i === Number(modal.q.correct) ? " ✓ Correct answer" : ""}</li>)}</ol>{modal.q.explanation && <p>{modal.q.explanation}</p>}</Modal>}
    {(modal?.type === "new" || modal?.type === "edit") && form && <Modal title={modal.type === "new" ? "Add subject question" : "Edit question"} onClose={close} footer={<><button className="outline" onClick={close}>Cancel</button><button className="primary" onClick={save}>Save question</button></>}>
      <Field label="Question"><textarea rows={3} value={form.q} onChange={set("q")} autoFocus /></Field><div className="two-col"><Field label="Subject (choose or type a new one)"><input list="examsphere-subject-options" value={form.subject} onChange={set("subject")} placeholder="Enter subject name"/><datalist id="examsphere-subject-options">{[...new Set([...subjects, ...items.map(x=>x.subject)])].map(x=><option key={x} value={x}/>)}</datalist></Field><Field label="Topic"><input value={form.topic} onChange={set("topic")} placeholder="e.g. Normalization" /></Field><Field label="Difficulty"><select value={form.difficulty} onChange={set("difficulty")}><option>Easy</option><option>Medium</option><option>Hard</option></select></Field><Field label="Marks"><input type="number" min="1" value={form.marks} onChange={set("marks")} /></Field></div>
      <h4>Answer options</h4>{form.options.map((o,i)=><Field key={i} label={`Option ${String.fromCharCode(65+i)}`}><input value={o} onChange={e=>setOption(i,e.target.value)} /></Field>)}<Field label="Correct answer"><select value={form.correct} onChange={set("correct")}>{form.options.map((o,i)=><option value={i} key={i}>{String.fromCharCode(65+i)} — {o || "Option text not entered"}</option>)}</select></Field><Field label="Explanation (optional)"><textarea rows={2} value={form.explanation} onChange={set("explanation")} /></Field>
    </Modal>}
    {modal?.type === "delete" && <Modal title="Delete question?" onClose={close} footer={<><button className="outline" onClick={close}>Cancel</button><button className="danger" onClick={remove}>Delete</button></>}><p>“{modal.q.q}” will be permanently removed from this browser's question bank.</p></Modal>}
  </section>;
}

function ManageExams({ notify }) {
  const [exams, setExams] = useState(() => loadStore("examsphere_exams", []));
  const [modal, setModal] = useState(null);
  useEffect(() => { if (!localStorage.getItem("oqes_token")) return; apiRequest("/api/exams").then(rows=>{const next=rows.map(fromApiExam);setExams(next);saveStore("examsphere_exams",next);}).catch(err=>notify(`Could not load tests from server: ${err.message}`)); }, []);
  const blankQuestion = () => ({ q:"", options:["","","",""], correct:0, marks:1, difficulty:"Easy", explanation:"" });
  const blank = () => ({ title:"", subject:"", duration:30, description:"", assignedTo:"ALL", questionsData:[blankQuestion()] });
  const [form, setForm] = useState(blank());
  const [assigneeText, setAssigneeText] = useState("");
  const open = (type, e) => {
    setModal({type,e});
    setForm(type === "new" ? blank() : {...e, questionsData:(e.questionsData||[]).map(q=>({...q,options:[...(q.options||["","","",""])]}))});
    setAssigneeText(type === "edit" && !(e.assignedTo||["ALL"]).includes("ALL") ? e.assignedTo.join(", ") : "");
  };
  const close = () => setModal(null);
  const patch = (key,value) => setForm(f=>({...f,[key]:value}));
  const patchQuestion = (index,key,value) => setForm(f=>({...f,questionsData:f.questionsData.map((q,i)=>i===index?{...q,[key]:value}:q)}));
  const patchOption = (qi,oi,value) => setForm(f=>({...f,questionsData:f.questionsData.map((q,i)=>i===qi?{...q,options:q.options.map((o,j)=>j===oi?value:o)}:q)}));
  const addQuestion = () => patch("questionsData",[...form.questionsData,blankQuestion()]);
  const removeQuestion = (index) => patch("questionsData",form.questionsData.filter((_,i)=>i!==index));
  const save = async () => {
    if (!form.title.trim() || !form.subject.trim()) return notify("Enter a test name and subject.");
    if (!form.questionsData.length) return notify("Add at least one question.");
    for (let i=0;i<form.questionsData.length;i++) {
      const q=form.questionsData[i];
      if (!q.q.trim() || q.options.some(o=>!o.trim())) return notify(`Complete question ${i+1} and all four options.`);
    }
    const assigned = form.assignedTo === "ALL" ? ["ALL"] : assigneeText.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
    if (form.assignedTo !== "ALL" && (!assigned.length || assigned.some(x=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))) return notify("Enter valid student email addresses.");
    const totalMarks=form.questionsData.reduce((n,q)=>n+(Number(q.marks)||1),0);
    const clean={...form,title:form.title.trim(),subject:form.subject.trim(),duration:Math.max(1,Number(form.duration)||1),questionsData:form.questionsData.map(q=>({...q,correct:Number(q.correct),marks:Number(q.marks)||1})),questions:form.questionsData.length,totalMarks,assignedTo:assigned,status:modal.type==="edit"?(form.status||"Draft"):"Draft"};
    try {
      if (localStorage.getItem("oqes_token")) {
        const payload={title:clean.title,description:clean.description,subject:clean.subject,durationMinutes:clean.duration,questions:clean.questionsData.map(q=>({text:q.q,options:q.options,correct:Number(q.correct),marks:Number(q.marks)||1,explanation:q.explanation||""}))};
        const saved=await apiRequest(modal.type==="new"?"/api/exams":`/api/exams/${clean.id}`,{method:modal.type==="new"?"POST":"PUT",body:JSON.stringify(payload)});
        const normalized=fromApiExam(saved); const next=modal.type==="new"?[...exams,normalized]:exams.map(x=>x.id===normalized.id?normalized:x);setExams(next);saveStore("examsphere_exams",next);
      } else { const next=modal.type==="new"?[...exams,{...clean,id:Date.now()}]:exams.map(x=>x.id===clean.id?clean:x);setExams(next);saveStore("examsphere_exams",next); }
      notify(modal.type==="new"?"Test saved as draft.":"Test updated."); close();
    } catch(err) { notify(`Unable to save test: ${err.message}`); }
  };
  const updateStatus = async (id,status) => { try { if(localStorage.getItem("oqes_token")) await apiRequest(`/api/exams/${id}/${status==="Available"?"publish":"unpublish"}`,{method:"PATCH"}); const next=exams.map(x=>x.id===id?{...x,status}:x);setExams(next);saveStore("examsphere_exams",next);notify(status==="Available"?"Test published.":"Test moved to draft.");close(); } catch(err) { notify(`Unable to update test: ${err.message}`); } };
  const remove = async () => {try {if(localStorage.getItem("oqes_token")) await apiRequest(`/api/exams/${modal.e.id}`,{method:"DELETE"});const next=exams.filter(x=>x.id!==modal.e.id);setExams(next);saveStore("examsphere_exams",next);notify("Test deleted.");close();}catch(err){notify(`Unable to delete test: ${err.message}`);}};
  const duplicate = () => {const next=[...exams,{...modal.e,id:Date.now(),title:modal.e.title+" (Copy)",status:"Draft"}];setExams(next);saveStore("examsphere_exams",next);notify("Test duplicated.");close();};
  const count = status => exams.filter(x=>x.status===status).length;
  return <section className="content">
    <PageTitle eyebrow="ASSESSMENT MANAGEMENT" title="Create and Manage Tests" sub="Create a test and write every question in the same form. Each test keeps its own questions." button={<button className="primary" onClick={()=>open("new")}><Plus/> Create Test</button>}/>
    <div className="stats"><Stat i={<FileText/>} v={exams.length} l="Total Tests"/><Stat i={<Play/>} v={count("Available")} l="Published"/><Stat i={<CheckCircle2/>} v={count("Draft")} l="Drafts"/><Stat i={<ClipboardCheck/>} v={exams.reduce((n,e)=>n+(e.questionsData||[]).length,0)} l="Questions Created"/></div>
    <div className="panel table"><div className="table-head examgrid"><span>Test</span><span>Questions</span><span>Duration</span><span>Status</span><span>Actions</span></div>
      {!exams.length?<div className="empty">No tests created yet. Choose <b>Create Test</b> to build your first test.</div>:exams.map(e=><div className="table-row examgrid" key={e.id}><strong>{e.title}<small>{e.subject}</small></strong><span>{(e.questionsData||[]).length}</span><span>{e.duration} min</span><span><b className={"status "+String(e.status).toLowerCase()}>{e.status}</b></span><span className="actions"><button title="View test" onClick={()=>setModal({type:"view",e})}><Eye/></button><button title="Edit test" onClick={()=>open("edit",e)}><Edit3/></button><button title="More actions" onClick={()=>setModal({type:"more",e})}><MoreHorizontal/></button></span></div>)}</div>
    {(modal?.type==="new"||modal?.type==="edit")&&<Modal title={modal.type==="new"?"Create Test":"Edit Test"} onClose={close} footer={<><button className="outline" onClick={close}>Cancel</button><button className="primary" onClick={save}>Save Test</button></>}>
      <div className="two-col"><Field label="Test name"><input value={form.title} onChange={e=>patch("title",e.target.value)} placeholder="e.g. Java Programming – Unit Test 1" autoFocus/></Field><Field label="Subject"><input value={form.subject} onChange={e=>patch("subject",e.target.value)} placeholder="e.g. Java Programming"/></Field></div>
      <Field label="Description (optional)"><textarea rows="2" value={form.description||""} onChange={e=>patch("description",e.target.value)} placeholder="Brief instructions for students"/></Field>
      <div className="two-col"><Field label="Duration (minutes)"><input type="number" min="1" value={form.duration} onChange={e=>patch("duration",e.target.value)}/></Field><Field label="Assign test to"><select value={form.assignedTo||"ALL"} onChange={e=>patch("assignedTo",e.target.value)}><option value="ALL">All students</option><option value="CUSTOM">Specific students</option></select></Field></div>
      {form.assignedTo==="CUSTOM"&&<Field label="Student email addresses (comma-separated)"><input value={assigneeText} onChange={e=>setAssigneeText(e.target.value)} placeholder="student@example.com"/></Field>}
      <div className="question-builder"><div className="row-between"><div><h3>Questions in this test</h3><p className="muted">Add MCQs directly here. They belong only to this test.</p></div><span className="pill">{form.questionsData.length} question(s)</span></div>
      {form.questionsData.map((q,i)=><div className="question-editor" key={i}><div className="row-between"><b>Question {i+1}</b>{form.questionsData.length>1&&<button className="danger-text" type="button" onClick={()=>removeQuestion(i)}><Trash2 size={15}/> Remove</button>}</div>
        <Field label="Question text"><textarea rows="2" value={q.q} onChange={e=>patchQuestion(i,"q",e.target.value)} placeholder="Enter your question"/></Field>
        <div className="two-col">{q.options.map((o,j)=><Field key={j} label={`Option ${String.fromCharCode(65+j)}`}><input value={o} onChange={e=>patchOption(i,j,e.target.value)} placeholder={`Enter option ${String.fromCharCode(65+j)}`}/></Field>)}</div>
        <div className="two-col"><Field label="Correct answer"><select value={q.correct} onChange={e=>patchQuestion(i,"correct",Number(e.target.value))}>{[0,1,2,3].map(j=><option key={j} value={j}>Option {String.fromCharCode(65+j)}</option>)}</select></Field><Field label="Marks"><input type="number" min="0.5" step="0.5" value={q.marks} onChange={e=>patchQuestion(i,"marks",e.target.value)}/></Field></div>
        <Field label="Explanation (optional)"><input value={q.explanation||""} onChange={e=>patchQuestion(i,"explanation",e.target.value)} placeholder="Explain the correct answer"/></Field>
      </div>)}
      <button type="button" className="outline full" onClick={addQuestion}><Plus/> Add another question</button>
      <div className="question-summary">Total: <b>{form.questionsData.length} questions</b> · Marks: <b>{form.questionsData.reduce((n,q)=>n+(Number(q.marks)||0),0)}</b></div></div>
      <p className="muted">The test is saved as a draft. Publish it from the actions menu when it is ready.</p>
    </Modal>}
    {modal?.type==="view"&&<Modal title="Test details" onClose={close}><h3>{modal.e.title}</h3><p>{modal.e.subject} · {modal.e.questions} questions · {modal.e.duration} minutes · {modal.e.totalMarks} marks</p><p>Status: {modal.e.status}</p><ol>{(modal.e.questionsData||[]).map((q,i)=><li key={i}>{q.q}</li>)}</ol></Modal>}
    {modal?.type==="more"&&<Modal title={modal.e.title} onClose={close}><div className="menu-list">{modal.e.status!=="Available"&&<button onClick={()=>updateStatus(modal.e.id,"Available")}>Publish test</button>}{modal.e.status==="Available"&&<button onClick={()=>updateStatus(modal.e.id,"Draft")}>Unpublish test</button>}<button onClick={duplicate}>Duplicate</button><button className="danger-text" onClick={()=>setModal({type:"delete",e:modal.e})}>Delete</button></div></Modal>}
    {modal?.type==="delete"&&<Modal title="Delete test?" onClose={close} footer={<><button className="outline" onClick={close}>Cancel</button><button className="danger" onClick={remove}>Delete test</button></>}><p>This permanently removes “{modal.e.title}” from this browser's saved test list.</p></Modal>}
  </section>;
}

function UsersPage({ notify }) {
  const [users, setUsers] = useState(() => loadStore("examsphere_users", []));
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "Student" });

  const close = () => setModal(null);
  const emailOf = (u) => u.email || u.name.toLowerCase().replace(" ", ".") + "@example.com";
  const count = (r) => users.filter((u) => u.role === r).length;

  const add = () => {
    if (!form.name.trim()) return notify("Please enter a name");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return notify("Please enter a valid email");
    const next=[...users, { id: Date.now(), name: form.name.trim(), email: form.email.trim(), role: form.role, active: true }]; setUsers(next); saveStore("examsphere_users",next);
    notify("User added");
    setForm({ name: "", email: "", role: "Student" });
    close();
  };

  const patch = (id, change, msg) => {
    const next=users.map((u) => (u.id === id ? { ...u, ...change } : u)); setUsers(next); saveStore("examsphere_users",next);
    notify(msg);
    close();
  };

  const remove = (id) => {
    const next=users.filter((u) => u.id !== id); setUsers(next); saveStore("examsphere_users",next);
    notify("User removed");
    close();
  };

  return (
    <section className="content">
      <PageTitle
        eyebrow="ADMINISTRATION"
        title="User Management"
        sub="Manage students, teachers and administrators."
        button={
          <button className="primary" onClick={() => setModal({ type: "add" })}>
            <Plus /> Add User
          </button>
        }
      />

      <div className="stats">
        <Stat i={<Users />} v={String(count("Student"))} l="Students" />
        <Stat i={<Users />} v={String(count("Teacher"))} l="Teachers" />
        <Stat i={<ShieldCheck />} v={String(count("Admin"))} l="Admins" />
        <Stat i={<CheckCircle2 />} v={String(users.filter((u) => u.active).length)} l="Active" />
      </div>

      <div className="panel table">
        <div className="table-head usergrid">
          <span>User</span>
          <span>Role</span>
          <span>Last active</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {!users.length && <div className="empty">No users have been added yet. Use <b>Add User</b> to create the first record.</div>}
        {users.map((u, i) => (
          <div className="table-row usergrid" key={u.id}>
            <div className="usercell">
              <div className="avatar small">
                {u.name.split(" ").map((x) => x[0]).join("")}
              </div>

              <strong>
                {u.name}
                <small>{emailOf(u)}</small>
              </strong>
            </div>

            <span>{u.role}</span>
            <span>{i + 1}h ago</span>

            <span className={"pill " + (u.active ? "green" : "")}>
              {u.active ? "Active" : "Inactive"}
            </span>

            <span className="actions">
              <button title="View" aria-label="View" onClick={() => setModal({ type: "view", u })}>
                <Eye />
              </button>
              <button title="More" aria-label="More actions" onClick={() => setModal({ type: "more", u })}>
                <MoreHorizontal />
              </button>
            </span>
          </div>
        ))}
      </div>

      {modal?.type === "add" && (
        <Modal
          title="Add user"
          onClose={close}
          footer={
            <>
              <button className="outline" onClick={close}>Cancel</button>
              <button className="primary" onClick={add}>Add user</button>
            </>
          }
        >
          <Field label="Full name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Student</option>
              <option>Teacher</option>
              <option>Admin</option>
            </select>
          </Field>
        </Modal>
      )}

      {modal?.type === "view" && (
        <Modal title="User details" onClose={close} footer={<button className="primary" onClick={close}>Close</button>}>
          <dl className="detail-list">
            <dt>Name</dt><dd>{modal.u.name}</dd>
            <dt>Email</dt><dd>{emailOf(modal.u)}</dd>
            <dt>Role</dt><dd>{modal.u.role}</dd>
            <dt>Status</dt><dd>{modal.u.active ? "Active" : "Inactive"}</dd>
          </dl>
        </Modal>
      )}

      {modal?.type === "more" && (
        <Modal title={modal.u.name} onClose={close}>
          <div className="menu-list">
            <button onClick={() => patch(modal.u.id, { active: !modal.u.active }, modal.u.active ? "User deactivated" : "User activated")}>
              {modal.u.active ? "Deactivate" : "Activate"}
            </button>
            {["Student", "Teacher", "Admin"].filter((r) => r !== modal.u.role).map((r) => (
              <button key={r} onClick={() => patch(modal.u.id, { role: r }, `Role changed to ${r}`)}>
                Make {r}
              </button>
            ))}
            <button className="danger-text" onClick={() => remove(modal.u.id)}>Remove user</button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function TeacherResults() {
  return (
    <section className="content">
      <PageTitle
        eyebrow="ASSESSMENT RESULTS"
        title="Exam Results"
        sub="Review student performance across your examinations."
      />

      <div className="stats">
        <Stat
          i={<ClipboardCheck />}
          v="0"
          l="Attempts"
        />

        <Stat
          i={<BarChart3 />}
          v="0%"
          l="Average Score"
        />

        <Stat
          i={<Target />}
          v="0%"
          l="Average Accuracy"
        />

        <Stat
          i={<Trophy />}
          v="0%"
          l="Pass Rate"
        />
      </div>

      <div className="panel table">
        <div className="table-head resultgrid">
          <span>Student</span>
          <span>Examination</span>
          <span>Score</span>
          <span>Status</span>
          <span>Date</span>
        </div>

        {[
          ["Divya Sri", "Data Structures", "82%"],
          ["Ananya Rao", "Data Structures", "96%"],
          ["Rahul Kumar", "DBMS", "88%"],
          ["Priya Sharma", "Operating Systems", "79%"],
          ["Arjun Mehta", "Computer Networks", "84%"]
        ].map((r) => (
          <div
            className="table-row resultgrid"
            key={r[0] + r[1]}
          >
            <strong>{r[0]}</strong>
            <span>{r[1]}</span>
            <strong>{r[2]}</strong>
            <span className="pill green">
              Passed
            </span>
            <span>Oct 6, 2026</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminResults() {
  return (
    <section className="content">
      <PageTitle
        eyebrow="SYSTEM RESULTS"
        title="All Examination Results"
        sub="Monitor examination results across the platform."
      />

      <div className="stats">
        <Stat
          i={<ClipboardCheck />}
          v="0"
          l="Total Attempts"
        />

        <Stat
          i={<BarChart3 />}
          v="0%"
          l="Average Score"
        />

        <Stat
          i={<Trophy />}
          v="0%"
          l="Pass Rate"
        />

        <Stat
          i={<Users />}
          v="0"
          l="Students"
        />
      </div>

      <div className="panel table">
        <div className="table-head resultgrid">
          <span>Student</span>
          <span>Examination</span>
          <span>Score</span>
          <span>Status</span>
          <span>Date</span>
        </div>

        {[
          ["Divya Sri", "Data Structures", "82%"],
          ["Ananya Rao", "DBMS", "96%"],
          ["Rahul Kumar", "Operating Systems", "88%"],
          ["Priya Sharma", "Computer Networks", "79%"],
          ["Arjun Mehta", "Java Programming", "84%"]
        ].map((r) => (
          <div
            className="table-row resultgrid"
            key={r[0] + r[1]}
          >
            <strong>{r[0]}</strong>
            <span>{r[1]}</span>
            <strong>{r[2]}</strong>
            <span className="pill green">
              Passed
            </span>
            <span>Oct 6, 2026</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Leaderboard() {
  const students = [
    ["Ananya Rao", 96, 1840],
    ["Rahul Kumar", 93, 1720],
    ["Priya Sharma", 91, 1650],
    ["Divya Sri", 82, 1420],
    ["Arjun Mehta", 80, 1390],
    ["Sanjana Reddy", 79, 1365]
  ];

  return (
    <section className="content">
      <PageTitle
        eyebrow="COMPETITION"
        title="Leaderboard"
        sub="See how you rank against your peers."
      />

      <div className="leader-hero">
        <Trophy />

        <div>
          <strong>You're ranked #14</strong>
          <span>
            Top 8% of all active students
          </span>
        </div>
      </div>

      <div className="panel leaderboard">
        {students.map((s, i) => (
          <div
            className={
              "leader-row " +
              (s[0] === "Divya Sri" ? "me" : "")
            }
            key={s[0]}
          >
            <b>#{i + 11}</b>

            <div className="avatar small">
              {s[0]
                .split(" ")
                .map((x) => x[0])
                .join("")}
            </div>

            <strong>{s[0]}</strong>

            <span>{s[1]}%</span>

            <small>{s[2]} pts</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function Notifications({ notes, setNotes, notify }) {
  const markRead = (id) =>
    setNotes(notes.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAll = () => {
    setNotes(notes.map((n) => ({ ...n, read: true })));
    notify("All notifications marked as read");
  };
  const unread = notes.filter((n) => !n.read).length;

  return (
    <section className="content">
      <PageTitle
        eyebrow="UPDATES"
        title="Notifications"
        sub="Important updates and examination reminders."
        button={
          <button className="outline" onClick={markAll} disabled={unread === 0}>
            <CheckCircle2 /> Mark all read
          </button>
        }
      />

      <div className="panel notifications">
        {notes.length === 0 && <div className="empty">You're all caught up.</div>}

        {notes.map((n, i) => (
          <div className={"notification " + (n.read ? "is-read" : "")} key={n.id}>
            <div className="notify-icon">
              {n.read ? <CheckCircle2 /> : <Bell />}
            </div>

            <div>
              <strong>{n.text}</strong>
              <span>
                {i + 1} hour{i ? "s" : ""} ago
              </span>
            </div>

            {n.read ? (
              <span className="muted">Read</span>
            ) : (
              <button className="link" onClick={() => markRead(n.id)}>
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Profile({ notify, role }) {
  const [info, setInfo] = useState({
    name: "Divya Sri",
    email: "divya@example.com",
    phone: "+91 98765 43210"
  });
  const setF = (k) => (e) => setInfo({ ...info, [k]: e.target.value });
  const initials = info.name.split(" ").filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase() || "DS";
  const roleLabel =
    role === "Student"
      ? "CSE Student"
      : role === "Teacher"
      ? "Faculty / Teacher"
      : "System Administrator";

  return (
    <section className="content">
      <PageTitle
        eyebrow="ACCOUNT"
        title="My Profile"
        sub="Manage your personal information and preferences."
      />

      <div className="profile-grid">
        <div className="panel profile-card">
          <div className="profile-avatar">{initials}</div>

          <h2>{info.name}</h2>

          <p className="muted">{roleLabel}</p>

          <span className="pill green">
            Active
          </span>

          <div className="profile-stats">
            <span>
              <b>{role === "Student" ? "12" : "18"}</b>
              Exams
            </span>

            <span>
              <b>
                {role === "Student"
                  ? "82%"
                  : "78%"}
              </b>
              Avg. score
            </span>

            <span>
              <b>
                {role === "Student"
                  ? "87%"
                  : "81%"}
              </b>
              Accuracy
            </span>
          </div>
        </div>

        <div className="panel form-panel">
          <h2>Personal information</h2>

          <div className="form-grid">
            <label>
              Full name
              <input value={info.name} onChange={setF("name")} />
            </label>

            <label>
              Email
              <input type="email" value={info.email} onChange={setF("email")} />
            </label>

            <label>
              Phone
              <input value={info.phone} onChange={setF("phone")} />
            </label>

            <label>
              Department
              <select>
                <option>
                  Computer Science & Engineering
                </option>
              </select>
            </label>
          </div>

          <button
            className="primary"
            onClick={() =>
              notify("Profile changes saved")
            }
          >
            Save changes
          </button>
        </div>
      </div>
    </section>
  );
}

function SettingsPage({ notify }) {
  const labels = [
    "Exam reminders",
    "Result announcements",
    "Weekly performance report",
    "New question bank alerts"
  ];
  const [prefs, setPrefs] = useState(() =>
    loadStore("examsphere_prefs", Object.fromEntries(labels.map((l) => [l, true])))
  );
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [twoFA, setTwoFA] = useState(false);
  const [twoFAOpen, setTwoFAOpen] = useState(false);

  const toggle = (l) => {
    const next = { ...prefs, [l]: !prefs[l] };
    setPrefs(next);
    saveStore("examsphere_prefs", next);
    notify(`${l} ${next[l] ? "enabled" : "disabled"}`);
  };

  const closePw = () => {
    setPwOpen(false);
    setPw({ current: "", next: "", confirm: "" });
    setPwError("");
  };

  const savePw = () => {
    if (!pw.current) return setPwError("Enter your current password.");
    if (pw.next.length < 6) return setPwError("New password must be at least 6 characters.");
    if (pw.next !== pw.confirm) return setPwError("Passwords do not match.");
    closePw();
    notify("Password updated");
  };

  return (
    <section className="content">
      <PageTitle
        eyebrow="PREFERENCES"
        title="Settings"
        sub="Configure your Online Quiz and Examination System experience."
      />

      <div className="settings-grid">
        <div className="panel">
          <h2>Notifications</h2>

          {labels.map((x) => (
            <div className="toggle-row" key={x}>
              <div>
                <strong>{x}</strong>
                <span>Receive updates related to this setting.</span>
              </div>

              <input
                type="checkbox"
                aria-label={x}
                checked={!!prefs[x]}
                onChange={() => toggle(x)}
              />
            </div>
          ))}
        </div>

        <div className="panel">
          <h2>Security</h2>

          <div className="security-item">
            <Lock />

            <div>
              <strong>Password</strong>
              <span>Last changed 30 days ago</span>
            </div>

            <button className="outline" onClick={() => setPwOpen(true)}>
              Change
            </button>
          </div>

          <div className="security-item">
            <ShieldCheck />

            <div>
              <strong>Two-factor authentication</strong>
              <span>
                {twoFA ? "Enabled" : "Recommended for account security"}
              </span>
            </div>

            <button
              className="outline"
              onClick={() => {
                if (twoFA) {
                  setTwoFA(false);
                  notify("Two-factor authentication disabled");
                } else {
                  setTwoFAOpen(true);
                }
              }}
            >
              {twoFA ? "Disable" : "Enable"}
            </button>
          </div>
        </div>
      </div>

      {pwOpen && (
        <Modal
          title="Change password"
          onClose={closePw}
          footer={
            <>
              <button className="outline" onClick={closePw}>Cancel</button>
              <button className="primary" onClick={savePw}>Update password</button>
            </>
          }
        >
          <Field label="Current password">
            <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoFocus />
          </Field>
          <Field label="New password">
            <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </Field>
          <Field label="Confirm new password">
            <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </Field>
          {pwError && <div className="form-error">{pwError}</div>}
        </Modal>
      )}

      {twoFAOpen && (
        <Modal
          title="Enable two-factor authentication"
          onClose={() => setTwoFAOpen(false)}
          footer={
            <>
              <button className="outline" onClick={() => setTwoFAOpen(false)}>Cancel</button>
              <button
                className="primary"
                onClick={() => {
                  setTwoFA(true);
                  setTwoFAOpen(false);
                  notify("Two-factor authentication enabled");
                }}
              >
                Enable
              </button>
            </>
          }
        >
          <p className="muted">
            Demo mode: this switches 2FA on for the interface only. A real
            deployment would connect an authenticator app here.
          </p>
        </Modal>
      )}
    </section>
  );
}

function Activity({ title, detail }) {
  return (
    <div className="activity">
      <div className="activity-dot" />

      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, percent }) {
  return (
    <div className="metric">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className="progress">
        <i
          style={{
            width: percent + "%"
          }}
        />
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  text,
  onClick
}) {
  return (
    <button
      className="learning action-card"
      onClick={onClick}
    >
      <div className="course-symbol">
        {icon}
      </div>

      <div className="learning-body">
        <strong>{title}</strong>
        <span>{text}</span>
      </div>

      <ChevronRight />
    </button>
  );
}

createRoot(
  document.getElementById("root")
).render(<App />);