#!/usr/bin/env python3
"""Automatic prompt/response capture for the 8x assignment.

Wired as both a UserPromptSubmit hook and a Stop hook in .claude/settings.json.

UserPromptSubmit: stashes the raw prompt text + timestamp in a per-session
state file (we don't know the model yet at this point).

Stop: reads the stashed prompt, reads the session transcript to pull out the
final assistant text (skipping thinking/tool_use/tool_result blocks) and the
model that produced it, then appends a matched PROMPT+RESPONSE pair to the
session's log file in .agent-logs/.

Deliberately swallows its own errors (writes them to .agent-logs/.hook-errors.log
and exits 0) so a bug in this logger never blocks the actual session.
"""
import json
import os
import re
import sys
import time
import traceback
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOG_DIR = os.path.join(REPO_ROOT, ".agent-logs")
STATE_DIR = os.path.join(REPO_ROOT, ".claude", "hooks", ".capture-state")
ERROR_LOG = os.path.join(LOG_DIR, ".hook-errors.log")

AUTHOR = "kasamthapa"
TOOL = "claude-code"
PROJECT = os.path.basename(REPO_ROOT)
ENTRIES_MARKER = "<!-- ENTRIES -->\n"


def now_iso():
    dt = datetime.now(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def state_path(session_id):
    return os.path.join(STATE_DIR, f"{session_id}.json")


def load_state(session_id):
    p = state_path(session_id)
    if not os.path.exists(p):
        return None
    with open(p, "r") as f:
        return json.load(f)


def save_state(session_id, state):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(state_path(session_id), "w") as f:
        json.dump(state, f)


def render_head(state):
    return (
        "---\n"
        f"session_id: {state['session_id']}\n"
        f"date: {state['date']}\n"
        f"author: {AUTHOR}\n"
        f"model: {state.get('last_model', 'unknown')}\n"
        f"tool: {TOOL}\n"
        f"project: {PROJECT}\n"
        f"total_exchanges: {state['exchange_count']}\n"
        f"first_prompt_time: {state['first_prompt_time']}\n"
        f"last_prompt_time: {state.get('last_prompt_time', state['first_prompt_time'])}\n"
        "---\n\n"
        f"# Session Log - {state['date']}\n\n"
        f"Session: `{state['short_id']}` | Project: `{PROJECT}` | Author: `{AUTHOR}`\n\n"
        "---\n\n"
    )


def create_log_file(state):
    with open(state["log_path"], "w") as f:
        f.write(render_head(state))
        f.write(ENTRIES_MARKER)


def rewrite_head(state):
    with open(state["log_path"], "r") as f:
        content = f.read()
    idx = content.find(ENTRIES_MARKER)
    tail = content[idx + len(ENTRIES_MARKER):] if idx != -1 else ""
    with open(state["log_path"], "w") as f:
        f.write(render_head(state))
        f.write(ENTRIES_MARKER)
        f.write(tail)


def append_entries(state, prompt_text, prompt_ts, response_text, response_ts, model):
    num = state["exchange_count"]
    short_id = state["short_id"]
    block = (
        f"[LOG_ENTRY type=PROMPT num={num} session={short_id}]\n"
        f"timestamp: {prompt_ts}\n"
        f"model: {model}\n\n"
        f"{prompt_text}\n\n\n"
        f"[LOG_ENTRY type=RESPONSE num={num} session={short_id}]\n"
        f"timestamp: {response_ts}\n"
        f"model: {model}\n\n"
        f"{response_text}\n\n\n"
    )
    with open(state["log_path"], "a") as f:
        f.write(block)


def find_model_for_text(transcript_path, expected_text):
    """Scan the transcript for the assistant text block matching
    expected_text (the harness-provided last_assistant_message) and return
    the model that produced it. Retries briefly since the transcript file
    can lag a beat behind the Stop hook firing."""
    if not transcript_path or not expected_text:
        return None
    expected_text = expected_text.strip()
    for _ in range(20):
        if os.path.exists(transcript_path):
            model = None
            with open(transcript_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if entry.get("type") != "assistant":
                        continue
                    message = entry.get("message") or {}
                    content = message.get("content") or []
                    texts = [
                        block.get("text", "")
                        for block in content
                        if isinstance(block, dict) and block.get("type") == "text"
                    ]
                    if not texts:
                        continue
                    if "\n".join(texts).strip() == expected_text:
                        model = message.get("model") or entry.get("model")
            if model:
                return model
        time.sleep(0.1)
    return None


def handle_prompt_submit(data):
    session_id = data["session_id"]
    prompt = data.get("prompt", "")
    ts = now_iso()

    state = load_state(session_id)
    if state is None:
        short_id = session_id[:8]
        date_str = ts[:10]
        file_stamp = ts[:19].replace(":", "-").replace("T", "_")
        log_path = os.path.join(LOG_DIR, f"{file_stamp}_{session_id}.md")
        state = {
            "session_id": session_id,
            "short_id": short_id,
            "date": date_str,
            "log_path": log_path,
            "first_prompt_time": ts,
            "exchange_count": 0,
        }
        os.makedirs(LOG_DIR, exist_ok=True)
        create_log_file(state)

    state["last_prompt_time"] = ts
    state["pending_prompt"] = {"text": prompt, "timestamp": ts}
    save_state(session_id, state)


def handle_stop(data):
    session_id = data["session_id"]
    transcript_path = data.get("transcript_path")

    state = load_state(session_id)
    if state is None or not state.get("pending_prompt"):
        return

    pending = state.pop("pending_prompt")
    response_text = data.get("last_assistant_message")
    if not response_text:
        response_text = "[capture: no assistant text found for this turn]"
    model = find_model_for_text(transcript_path, response_text) or "unknown"

    state["exchange_count"] += 1
    state["last_model"] = model

    append_entries(
        state,
        pending["text"],
        pending["timestamp"],
        response_text,
        now_iso(),
        model,
    )
    rewrite_head(state)
    save_state(session_id, state)


def main():
    os.makedirs(LOG_DIR, exist_ok=True)
    raw = sys.stdin.read()
    data = json.loads(raw) if raw.strip() else {}
    event = data.get("hook_event_name")

    if event == "UserPromptSubmit":
        handle_prompt_submit(data)
    elif event == "Stop":
        handle_stop(data)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        try:
            os.makedirs(LOG_DIR, exist_ok=True)
            with open(ERROR_LOG, "a") as f:
                f.write(f"--- {datetime.now(timezone.utc).isoformat()} ---\n")
                f.write(traceback.format_exc())
                f.write("\n")
        except Exception:
            pass
    sys.exit(0)
