import { useState } from "react";
import { Landing } from "./components/landing/Landing";
import { AppShell } from "./components/AppShell";
import { MeetingsList } from "./components/MeetingsList";
import { MeetingView } from "./components/MeetingView";
import { NewMeetingForm } from "./components/NewMeetingForm";
import type { CreateMeetingResponse } from "./api/meetings";

type View =
  | { kind: "landing" }
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "meeting"; meetingId: string }
  | { kind: "created"; created: CreateMeetingResponse };

function App() {
  const [view, setView] = useState<View>({ kind: "landing" });

  if (view.kind === "landing") {
    return (
      <Landing
        onTryDemo={() => setView({ kind: "list" })}
        onPasteTranscript={() => setView({ kind: "new" })}
      />
    );
  }

  return (
    <AppShell
      onHome={() => setView({ kind: "landing" })}
      onMeetings={() => setView({ kind: "list" })}
      onNewMeeting={() => setView({ kind: "new" })}
    >
      {view.kind === "list" && (
        <MeetingsList
          onOpenMeeting={(meetingId) => setView({ kind: "meeting", meetingId })}
          onNewMeeting={() => setView({ kind: "new" })}
        />
      )}

      {view.kind === "new" && (
        <NewMeetingForm onCreated={(created) => setView({ kind: "created", created })} />
      )}

      {view.kind === "meeting" && (
        <MeetingView
          source={{ kind: "id", id: view.meetingId }}
          onBack={() => setView({ kind: "list" })}
        />
      )}

      {view.kind === "created" && (
        <MeetingView
          source={{ kind: "result", id: view.created.id, result: view.created.result }}
          onBack={() => setView({ kind: "list" })}
        />
      )}
    </AppShell>
  );
}

export default App;
