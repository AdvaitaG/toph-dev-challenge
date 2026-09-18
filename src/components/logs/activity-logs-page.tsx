"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ActivityLogTable } from "@/components/logs/activity-log-table";
import { Search } from "@/components/ui/design-icons";
import { Modal } from "@/components/ui/modal";
import type { DashboardData } from "@/types/dashboard";

export function ActivityLogsPage({ data }: { data: DashboardData }) {
  const guest = data.source === "fixtures";
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);
  const [loggingOut, startLogout] = useTransition();

  function logout() {
    startLogout(async () => {
      const result = await signOut();
      if (result.error) setNotice({ title: "Log Out", text: result.error });
    });
  }

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to activity logs</a>
    <Sidebar activePage="activity logs" farmName={data.farm.name} pendingApprovals={data.pendingApprovals} onInfo={() => setNotice({ title: "Activity Logs", text: guest ? "Read-only demo history from the April 22, 2026 snapshot." : "This page shows pending, approved, and denied activity from your farm." })} onLogout={logout} loggingOut={loggingOut} guest={guest} onUnavailable={(label) => setNotice({ title: label, text: `${label} is not available in this dashboard preview.` })} />
    <main id="main-content" className="dashboard-main">
      <header className="dashboard-header">
        <div><h1>Activity Logs</h1><p>A complete history of farm activity</p><Link className="mobile-directory-link" href="/">Dashboard</Link>{guest && <Link className="mobile-directory-link" href="/login">Sign In</Link>}</div>
        <div className="search-field"><Search size={16} aria-hidden="true" /><input aria-label="Search activity logs" placeholder="Search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button className="icon-button" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}</div>
      </header>
      <ActivityLogTable mode="history" logs={data.logs} timezone={data.farm.timezone} currentDate={data.currentDate} search={search} onClearSearch={() => setSearch("")} source={data.source} />
    </main>
    <Modal open={notice !== null} title={notice?.title ?? "Activity Logs"} onClose={() => setNotice(null)}><p className="modal-copy">{notice?.text}</p></Modal>
  </div>;
}
