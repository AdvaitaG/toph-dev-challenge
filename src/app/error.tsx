"use client";

export default function DashboardError({ retry }: { retry: () => void }) {
  return <main className="empty-state" role="alert">
    <h1>Unable to load the dashboard</h1>
    <p>The farm database could not be loaded. Please try again.</p>
    <button className="pill pill-active" onClick={retry}>Try again</button>
    <a className="text-button" href="/login">Return to sign in</a>
  </main>;
}
