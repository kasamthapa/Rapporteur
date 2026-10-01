import type { ReactNode } from "react";
import { Logo } from "./landing/Logo";

interface AppShellProps {
  children: ReactNode;
  onHome: () => void;
  onMeetings: () => void;
  onNewMeeting: () => void;
}

export function AppShell({ children, onHome, onMeetings, onNewMeeting }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Logo onClick={onHome} />
        <nav className="app-topbar-nav" aria-label="App navigation">
          <button type="button" className="app-nav-link" onClick={onMeetings}>
            meetings
          </button>
          <button type="button" className="app-nav-link" onClick={onNewMeeting}>
            new meeting
          </button>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
