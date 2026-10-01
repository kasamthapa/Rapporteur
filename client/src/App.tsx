import { useState } from "react";
import { Landing } from "./components/landing/Landing";
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <button
            type="button"
            onClick={() => setView({ kind: "list" })}
            className="text-lg font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Rapporteur
          </button>
        </div>
      </header>

      <main>
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
      </main>
    </div>
  );
}

export default App;
