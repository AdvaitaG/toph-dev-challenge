"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { CalendarDays, Check, X } from "lucide-react";
import { AudioLines, Funnel as Filter, ListFilter } from "@/components/ui/design-icons";
import { dateInTimezone, formatActivityDate, formatTimeRange } from "@/lib/format";
import { LogDetails } from "@/components/logs/log-details";
import type { DashboardData, DashboardLog, ReviewStatus } from "@/types/dashboard";

interface ActivityLogTableProps {
  logs: DashboardLog[];
  timezone: string;
  currentDate: string;
  search: string;
  onClearSearch: () => void;
  source: DashboardData["source"];
  mode?: "pending" | "history";
}

type Sort = "date-asc" | "date-desc" | "employee" | "none";
const sortOptions: { value: Sort; label: string }[] = [{ value: "date-asc", label: "Date: oldest first" }, { value: "date-desc", label: "Date: newest first" }, { value: "employee", label: "Employee: A–Z" }];
const statusLabels: Record<ReviewStatus, string> = { pending: "Pending", approved: "Approved", denied: "Denied" };

export function ActivityLogTable({ logs, timezone, currentDate, search, onClearSearch, source, mode = "pending" }: ActivityLogTableProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("date-asc");
  // Start unfiltered so the April design snapshot remains visible; the control
  // always targets the farm's real current month when the manager activates it.
  const [monthOnly, setMonthOnly] = useState(false);
  const [month, setMonth] = useState(currentDate.slice(0, 7));
  const [activity, setActivity] = useState("");
  const [employee, setEmployee] = useState("");
  const [field, setField] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [notice, setNotice] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [popover, setPopover] = useState<"sort" | "filter" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const controlsRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${month}-01T00:00:00Z`));
  const query = search.trim().toLowerCase();
  const visibleLogs = logs.filter((log) =>
    (!query || `${log.employee.name} ${log.activityType} ${log.field}`.toLowerCase().includes(query)) &&
    (!monthOnly || log.activityDate.startsWith(month)) &&
    (!employee || log.employeeId === employee) &&
    (!activity || log.activityType === activity) && (!field || log.field === field) &&
    (!status || log.reviewStatus === status) &&
    (!tag || log.tags.some((item) => item.name.toLowerCase() === tag)) &&
    (!fromDate || log.activityDate >= fromDate) && (!toDate || log.activityDate <= toDate),
  ).sort((a, b) => sort === "employee" ? a.employee.name.localeCompare(b.employee.name) : sort === "date-desc" ? b.activityDate.localeCompare(a.activityDate) : sort === "date-asc" ? a.activityDate.localeCompare(b.activityDate) : 0);
  const selectedVisibleCount = visibleLogs.filter((log) => selected.has(log.id)).length;
  const filterCount = [employee, activity, field, status, tag, fromDate || toDate].filter(Boolean).length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleLogs.length;
  }, [selectedVisibleCount, visibleLogs.length]);

  useEffect(() => {
    if (!popover) return;
    function closeOutside(event: PointerEvent) { if (!controlsRef.current?.contains(event.target as Node)) setPopover(null); }
    function closeEscape(event: KeyboardEvent) { if (event.key === "Escape") { setPopover(null); controlsRef.current?.querySelector<HTMLButtonElement>(`[data-control="${popover}"]`)?.focus(); } }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [popover]);

  function resetFilters() { setEmployee(""); setActivity(""); setField(""); setStatus(""); setTag(""); setFromDate(""); setToDate(""); }
  function toggleLog(id: string) { setExpandedLogId((current) => current === id ? null : id); }
  function toggleSelected(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  return <section className="logs-panel" aria-labelledby="employee-logs-heading">
    <div className="logs-toolbar">
      <h2 id="employee-logs-heading"><AudioLines size={16} aria-hidden="true" />{mode === "history" ? "All Activity Logs" : source === "fixtures" ? "New Employee Logs" : "Employee Logs"} <span>({visibleLogs.length})</span></h2>
      <div className="log-controls" ref={controlsRef}>
        {sort !== "none" && <button className="pill pill-active" onClick={() => setSort("none")} aria-label="Remove sorting"><X size={15} />{sort === "employee" ? "Employee" : "Date"}</button>}
        <div className="popover-anchor">
          <button data-control="sort" className="pill" aria-expanded={popover === "sort"} aria-controls="sort-options" onClick={() => setPopover(popover === "sort" ? null : "sort")}><ListFilter size={16} />Sort</button>
          {popover === "sort" && <div className="control-popover sort-popover" id="sort-options" aria-label="Sort logs">
            <p className="popover-heading">Sort employee logs</p>
            {sortOptions.map((option) => <button key={option.value} className="sort-option" aria-pressed={sort === option.value} onClick={() => { setSort(option.value); setPopover(null); }}><span>{option.label}</span>{sort === option.value && <Check size={14} />}</button>)}
          </div>}
        </div>
        {mode === "pending" && <button className={`pill${monthOnly ? " pill-active" : ""}`} aria-pressed={monthOnly} title={`Show activities from ${monthLabel}`} onClick={() => { if (!monthOnly) setMonth(dateInTimezone(new Date().toISOString(), timezone).slice(0, 7)); setMonthOnly(!monthOnly); }}>{monthOnly ? <X size={15} /> : <CalendarDays size={15} />}This Month{expandedLogId === null && monthOnly ? ` (${visibleLogs.length})` : ""}</button>}
        <div className="popover-anchor">
          <button data-control="filter" className={`pill${filterCount ? " filter-applied" : ""}`} aria-expanded={popover === "filter"} aria-controls="filter-options" onClick={() => setPopover(popover === "filter" ? null : "filter")}><Filter size={16} />Filter{filterCount > 0 ? ` (${filterCount})` : ""}</button>
          {popover === "filter" && <div className="control-popover filter-popover" id="filter-options" aria-label="Filter logs">
            <p className="popover-heading">Filter employee logs</p>
            {mode === "history" && <label>Employee<select value={employee} onChange={(event) => setEmployee(event.target.value)}><option value="">All employees</option>{[...new Map(logs.map((log) => [log.employeeId, log.employee.name])).entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
            <label>Activity<select value={activity} onChange={(event) => setActivity(event.target.value)}><option value="">All activities</option>{[...new Set(logs.map((log) => log.activityType))].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Field<select value={field} onChange={(event) => setField(event.target.value)}><option value="">All fields</option>{[...new Set(logs.map((log) => log.field))].map((value) => <option key={value}>{value}</option>)}</select></label>
            {mode === "history" && <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="denied">Denied</option></select></label>}
            <label>Tag<select value={tag} onChange={(event) => setTag(event.target.value)}><option value="">All tags</option>{[...new Map(["Needs Review", ...logs.flatMap((log) => log.tags.map((item) => item.name))].map((name) => [name.toLowerCase(), name])).entries()].map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
            <div className="date-inputs"><label>From<input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} /></label><label>To<input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} /></label></div>
            {fromDate && toDate && fromDate > toDate && <p className="control-hint" role="alert">The end date must be after the start date.</p>}
            <div className="popover-footer"><button className="text-button" onClick={resetFilters}>Reset filters</button><button className="pill pill-active" onClick={() => setPopover(null)}>Done</button></div>
          </div>}
        </div>
      </div>
    </div>
    {notice && <p className="control-hint" role="status">{notice}</p>}
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Employee activity table">
      <table className="activity-table">
        <caption className="sr-only">{mode === "history" ? "Complete farm activity history." : "Pending and approved employee activity."} View a log to read its details.</caption>
        <colgroup><col className="select-column" /><col /><col /><col /><col /><col />{mode === "history" && <col />}<col className="action-column" /></colgroup>
        <thead><tr>
          <th scope="col" className="checkbox-cell"><input ref={selectAllRef} type="checkbox" aria-label="Select all visible logs" disabled={visibleLogs.length === 0} checked={visibleLogs.length > 0 && selectedVisibleCount === visibleLogs.length} onChange={() => setSelected((current) => { const next = new Set(current); for (const log of visibleLogs) { if (selectedVisibleCount === visibleLogs.length) next.delete(log.id); else next.add(log.id); } return next; })} /></th>
          <th scope="col" aria-sort={sort === "employee" ? "ascending" : undefined}>Employee</th><th scope="col">Activity</th><th scope="col" aria-sort={sort === "date-asc" ? "ascending" : sort === "date-desc" ? "descending" : undefined}>Date</th><th scope="col">Field</th><th scope="col">Time</th>{mode === "history" && <th scope="col">Status</th>}<th scope="col"><span className="sr-only">Details</span></th>
        </tr></thead>
        <tbody>
          {visibleLogs.map((log) => {
            const expanded = expandedLogId === log.id;
            return <Fragment key={log.id}>
              <tr className={`log-row${expanded ? " is-expanded" : ""}${selected.has(log.id) ? " is-selected" : ""}`} onClick={() => toggleLog(log.id)}>
                <td className="checkbox-cell" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected.has(log.id)} onChange={() => toggleSelected(log.id)} aria-label={`Select ${log.employee.name}'s log`} /></td>
                <th scope="row">{log.employee.name}</th><td>{log.activityType}{mode === "pending" && source !== "fixtures" && <span className={`log-status log-status-${log.reviewStatus}`}>{statusLabels[log.reviewStatus]}</span>}</td><td><time dateTime={log.activityDate}>{formatActivityDate(log.activityDate)}</time></td><td>{log.field}</td><td>{formatTimeRange(log.startedAt, log.endedAt, timezone)}</td>{mode === "history" && <td><span className={`log-status log-status-${log.reviewStatus}`}>{statusLabels[log.reviewStatus]}</span></td>}
                <td className="row-action"><button className="view-button" aria-label={`${expanded ? "Close" : "View"} ${log.employee.name}'s log`} aria-expanded={expanded} aria-controls={expanded ? `log-${log.id}` : undefined} onClick={(event) => { event.stopPropagation(); toggleLog(log.id); }}>{expanded ? "Close" : "View"}</button></td>
              </tr>
              {expanded && <tr className="details-row"><td colSpan={mode === "history" ? 8 : 7}><LogDetails key={log.id} log={log} source={source} onDecided={(decision) => setNotice(decision === "approved" ? "Activity approved. It remains on the Dashboard and in Activity Logs." : "Activity denied. It remains in Activity Logs.")} /></td></tr>}
            </Fragment>;
          })}
          {visibleLogs.length === 0 && <tr><td colSpan={mode === "history" ? 8 : 7}><div className="empty-state"><ListFilter size={26} aria-hidden="true" /><h3>No matching logs</h3><p>{monthOnly ? `No logs match your filters for ${monthLabel}.` : "Try another employee, activity, field, status, or date range."}</p><button className="pill" onClick={() => { resetFilters(); setMonthOnly(false); onClearSearch(); }}>Clear search and filters</button></div></td></tr>}
        </tbody>
      </table>
    </div>
    <p className="sr-only" role="status">{visibleLogs.length} logs shown. {selectedVisibleCount} selected.</p>
  </section>;
}
