"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Search } from "@/components/ui/design-icons";
import { signOut } from "@/app/login/actions";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Modal } from "@/components/ui/modal";
import type { EmployeeContact, EmployeeDirectoryData } from "@/types/dashboard";
import { saveEmployeeEmail } from "./actions";
import styles from "./employees.module.css";

function ContactCell({ employee, guest }: { employee: EmployeeContact; guest: boolean }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("email") ?? "");
    startSaving(async () => {
      try {
        const result = await saveEmployeeEmail(employee.id, value);
        if (result.error) { setError(result.error); return; }
        setError(""); setEditing(false); router.refresh();
      } catch { setError("Unable to save this employee email. Please try again."); }
    });
  }

  return <div className={styles.contactCell}>
    {editing ? <form className={styles.emailForm} onSubmit={submit}>
      <input name="email" type="email" aria-label={`Email for ${employee.name}`} defaultValue={employee.email ?? ""} maxLength={254} autoFocus />
      <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      <button type="button" onClick={() => { setEditing(false); setError(""); }} disabled={saving}>Cancel</button>
    </form> : <>
      {employee.email ? <a href={`mailto:${employee.email}`}>{employee.email}</a> : <span className={styles.missing}>No email on file</span>}
      {!guest && <button type="button" className={styles.editButton} onClick={() => { setEditing(true); setError(""); }} aria-label={`${employee.email ? "Edit" : "Add"} email for ${employee.name}`}>{employee.email ? "Edit" : "Add email"}</button>}
    </>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}

export function EmployeesDirectory({ data, guest = false }: { data: EmployeeDirectoryData; guest?: boolean }) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);
  const [loggingOut, startLogout] = useTransition();
  const visible = data.employees.filter((employee) =>
    `${employee.name} ${employee.email ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  function logout() {
    startLogout(async () => {
      const result = await signOut();
      if (result.error) setNotice({ title: "Log Out", text: result.error });
    });
  }

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to employees</a>
    <Sidebar activePage="employees" farmName={data.farmName} newCount={0} onInfo={() => setNotice({ title: "About this farm", text: guest ? "This read-only directory contains sample workers. Their contact details are not public." : "Employee names and contact emails are loaded from your farm database. The original demo workers have no email until one is provided." })} onLogout={logout} loggingOut={loggingOut} guest={guest} onUnavailable={(label) => setNotice({ title: label, text: `${label} is not available in this dashboard preview.` })} />
    <main id="main-content" className={`dashboard-main ${styles.main}`}>
      <header className="dashboard-header">
        <div><h1>Employees</h1><p>{guest ? `Sample workers at ${data.farmName} · Read-only demo` : `Contact information for ${data.farmName} workers`}</p><Link href="/" className={styles.backLink}>← Dashboard</Link>{guest && <Link href="/login" className={styles.backLink}>Sign In</Link>}</div>
        <div className="search-field"><Search size={16} aria-hidden="true" /><input aria-label="Search employees" placeholder="Search employees" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button className="icon-button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}</div>
      </header>
      <section className={styles.panel} aria-labelledby="directory-heading">
        <div className={styles.panelHeader}><h2 id="directory-heading">All employees <span>({visible.length})</span></h2><p>{guest ? "Sample names only. Contact details require manager sign-in." : "Use an email address to contact a worker. Add one where it is missing."}</p></div>
        <div className={styles.tableScroll} role="region" aria-label="Employee directory" tabIndex={0}>
          <table className={styles.table}><thead><tr><th scope="col">Name</th><th scope="col">Email address</th><th scope="col">Status</th></tr></thead>
            <tbody>{visible.map((employee) => <tr key={employee.id}><th scope="row">{employee.name}</th><td><ContactCell employee={employee} guest={guest} /></td><td><span className={employee.active ? styles.active : styles.inactive}>{employee.active ? "Active" : "Inactive"}</span></td></tr>)}
              {visible.length === 0 && <tr><td colSpan={3} className={styles.noResults}>No employees match your search.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </main>
    <Modal open={notice !== null} title={notice?.title ?? "Information"} onClose={() => setNotice(null)}><p className="modal-copy">{notice?.text}</p></Modal>
  </div>;
}
