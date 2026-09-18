import Link from "next/link";
import { ArrowLeftRight, AudioLines, CalendarDays, ChartNoAxesCombined, ChartPie, ClipboardCheck, Files, Handshake, Inbox, LogOut, Mail, Map, Settings, UserRoundCog, UsersRound } from "@/components/ui/design-icons";

const groups = [
  { label: "Overview", items: [{ label: "Dashboard", icon: ChartNoAxesCombined }, { label: "Activity Logs", icon: AudioLines }, { label: "Map", icon: Map }] },
  { label: "Compliance", items: [{ label: "Audit Manager", icon: ClipboardCheck }, { label: "Reports", icon: Files }, { label: "Schedule", icon: CalendarDays }] },
  { label: "Team Management", items: [{ label: "Employees", icon: UsersRound }, { label: "Performance", icon: ChartPie }, { label: "Messages", icon: Mail }] },
  { label: "Other", items: [{ label: "Settings", icon: Settings }, { label: "Support", icon: Handshake }] },
];

interface SidebarProps {
  activePage: "dashboard" | "employees" | "activity logs";
  farmName: string;
  pendingApprovals: number;
  onInfo: () => void;
  onUnavailable: (label: string) => void;
  onLogout: () => void;
  loggingOut: boolean;
  guest?: boolean;
}

export function Sidebar({ activePage, farmName, pendingApprovals, onInfo, onUnavailable, onLogout, loggingOut, guest = false }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Farm navigation">
      <div className="farm-profile">
        <div className="farm-avatar" role="img" aria-label="Bays Ranch profile photograph" />
        <div className="farm-identity"><strong>{farmName}</strong><span><UserRoundCog size={10} aria-hidden="true" />{guest ? "Guest Manager" : "Admin"}</span></div>
        <button className="icon-button farm-info" aria-label="About this dashboard" title={guest ? "Guest Manager demo snapshot" : "Demo snapshot · April 22, 2026"} onClick={onInfo}><Inbox size={15} /></button>
      </div>
      <nav aria-label="Main navigation">
        {groups.map((group) => <div className="nav-group" key={group.label}>
          <p className="nav-group-label">{group.label}</p>
          {group.items.map(({ label, icon: Icon }) => label === "Dashboard" || label === "Employees" || label === "Activity Logs" ? (
            <Link key={label} className={`nav-item${activePage === label.toLowerCase() ? " active" : ""}`} href={label === "Dashboard" ? (activePage === "dashboard" ? "#main-content" : "/") : label === "Employees" ? "/employees" : "/activity-logs"} aria-current={activePage === label.toLowerCase() ? "page" : undefined} title={label}>
              <Icon size={16} aria-hidden="true" /><span>{label}</span>
              {label === "Dashboard" && pendingApprovals > 0 && <span className="nav-badge" aria-hidden="true">{pendingApprovals}</span>}
            </Link>
          ) : (
            <button key={label} className="nav-item" title={label} onClick={() => onUnavailable(label)}><Icon size={16} aria-hidden="true" /><span>{label}</span></button>
          ))}
        </div>)}
      </nav>
      <div className="sidebar-footer">
        {guest ? <>
          <Link className="nav-item" href="/login" title="Switch User"><ArrowLeftRight size={16} aria-hidden="true" /><span>Switch User</span></Link>
          <Link className="nav-item" href="/login" title="Sign In"><LogOut size={16} aria-hidden="true" /><span>Sign In</span></Link>
        </> : <>
          <button className="nav-item" title="Switch User" onClick={() => onUnavailable("Switch User")}><ArrowLeftRight size={16} aria-hidden="true" /><span>Switch User</span></button>
          <button className="nav-item" title="Log Out" onClick={onLogout} disabled={loggingOut} aria-busy={loggingOut}><LogOut size={16} aria-hidden="true" /><span>Log Out</span></button>
        </>}
      </div>
    </aside>
  );
}
