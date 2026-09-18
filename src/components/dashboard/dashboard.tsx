"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { X } from "lucide-react";
import { CalendarMetric as CalendarDays, ClipboardPen, Percent, Search } from "@/components/ui/design-icons";
import { ActivityLogTable } from "@/components/logs/activity-log-table";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Modal } from "@/components/ui/modal";
import { formatActivityDate } from "@/lib/format";
import type { DashboardData } from "@/types/dashboard";

export function Dashboard({ data }: { data: DashboardData }) {
  const guest = data.source === "fixtures";
  const [search, setSearch] = useState("");
  const [loggingOut, startLogout] = useTransition();
  function logout() {
    startLogout(async () => {
      const result = await signOut();
      if (result.error) setNotice({ title: "Log Out", text: result.error });
    });
  }
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);
  const metrics = [
    { label: "Todays Recordings", value: data.metrics.todaysRecordings, icon: CalendarDays, href: "/activity-logs" },
    { label: "Active Workers", value: data.metrics.activeWorkers, icon: ClipboardPen, href: "/employees" },
    { label: "Response Accuracy", value: data.metrics.responseAccuracy ?? "—", icon: Percent, href: "/activity-logs" },
  ];

  function showDemoInfo() {
    setNotice({
      title: "About this dashboard",
      text: `Demo snapshot: ${formatActivityDate(data.referenceDate)}. ${guest ? "This guest view uses sample records and is read-only. Sample audio and live field locations are not available." : "Records are loaded from the farm database."}`,
    });
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to dashboard</a>
      <Sidebar activePage="dashboard" farmName={data.farm.name} newCount={data.metrics.newRecordings} onInfo={showDemoInfo} onLogout={logout} loggingOut={loggingOut} guest={guest} onUnavailable={(label) => setNotice({ title: label, text: `${label} is not available in this dashboard preview. You can explore employee logs from the Dashboard.` })} />
      <main id="main-content" className="dashboard-main">
        <header className="dashboard-header">
          <div><h1>Dashboard</h1><p>An overview of your farm and employee activity</p><Link className="mobile-directory-link" href="/employees">Employees</Link>{guest && <Link className="mobile-directory-link" href="/login">Sign In</Link>}</div>
          <div className="search-field">
            <Search size={16} aria-hidden="true" />
            <input aria-label="Search employee logs" placeholder="Search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
            {search && <button className="icon-button" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}
          </div>
        </header>
        <section aria-label="Dashboard metrics">
          <dl className="metrics-grid">
            {metrics.map(({ label, value, icon: Icon, href }, index) => (
              <div className="metric-card" key={label} title={index === 0 ? guest ? "Demo snapshot: April 22, 2026." : "Employee activities submitted today in the farm's timezone." : undefined}>
                <dt><Icon size={16} strokeWidth={1.7} aria-hidden="true" /><Link href={href} aria-label={`Open ${label}`}>{label}</Link></dt>
                <dd>{value}{index === 0 && <span>{data.metrics.newRecordings} New</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
        <ActivityLogTable logs={data.logs} timezone={data.farm.timezone} currentDate={data.currentDate} search={search} onClearSearch={() => setSearch("")} source={data.source} />
      </main>
      <Modal open={notice !== null} title={notice?.title ?? "Dashboard information"} onClose={() => setNotice(null)}><p className="modal-copy">{notice?.text}</p></Modal>
    </div>
  );
}
