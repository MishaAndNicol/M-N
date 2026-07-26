"use client";

import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp, type Timestamp } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";

const PRESENCE_COLLECTION = "watchRoomPresence";
// How often the active tab re-announces itself, and how stale a heartbeat
// has to get before we stop trusting it. Generous gap between the two so a
// single missed beat (background tab throttling, brief network hiccup)
// doesn't flip someone to "offline" and back.
const HEARTBEAT_MS = 45_000;
const ONLINE_STALE_MS = 100_000;
// How long a "typing" flag is trusted without a fresh keystroke - matches
// the local clear timer in useTypingWriter, plus slack for clock skew.
const TYPING_STALE_MS = 6_000;

type PresenceDoc = {
  online: boolean;
  lastSeen: Timestamp | null;
  typing: boolean;
  typingAt: Timestamp | null;
};

function otherOf(who: "a" | "b"): "a" | "b" {
  return who === "a" ? "b" : "a";
}

function millisOf(ts: Timestamp | null | undefined): number {
  if (!ts) return 0;
  const withToMillis = ts as unknown as { toMillis?: () => number };
  if (typeof withToMillis.toMillis === "function") return withToMillis.toMillis();
  const parsed = new Date(ts as unknown as string).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Keeps this browser's presence doc alive while whoAmI is known - marks
// online on mount/focus, offline on tab close/hide. Nothing to render;
// call it once near the top of the room.
export function usePresenceHeartbeat(whoAmI: "a" | "b" | null) {
  useEffect(() => {
    if (!whoAmI || !isFirebaseConfigured) return;
    const db = getDb();
    if (!db) return;
    const ref = doc(db, PRESENCE_COLLECTION, whoAmI);

    function beat(online: boolean) {
      setDoc(ref, { online, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    }

    beat(true);
    const interval = setInterval(() => beat(document.visibilityState === "visible"), HEARTBEAT_MS);

    function onVisibility() {
      beat(document.visibilityState === "visible");
    }
    function onGone() {
      beat(false);
    }

    document.addEventListener("visibilitychange", onVisibility);
    // pagehide covers mobile Safari/backgrounding cases beforeunload misses.
    window.addEventListener("pagehide", onGone);
    window.addEventListener("beforeunload", onGone);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onGone);
      window.removeEventListener("beforeunload", onGone);
      beat(false);
    };
  }, [whoAmI]);
}

// How often a still-typing person is allowed to re-announce "typing: true".
// Well under TYPING_STALE_MS so the flag never expires on the other side
// while someone is genuinely mid-sentence, but far enough apart that a
// whole message doesn't cost one write per keystroke.
const TYPING_WRITE_THROTTLE_MS = 3_000;

// Writes "typing" to this person's presence doc, auto-clearing it a few
// seconds after the last keystroke so it can't get stuck on if the tab
// closes mid-message.
export function useTypingWriter(whoAmI: "a" | "b" | null) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Timestamp of the last "typing: true" write actually sent, so rapid
  // keystrokes between throttle windows don't each trigger their own
  // setDoc - only the first keystroke in a window does.
  const lastTypingWriteRef = useRef<number>(0);

  function writeTyping(typing: boolean) {
    if (!whoAmI || !isFirebaseConfigured) return;
    const db = getDb();
    if (!db) return;
    setDoc(
      doc(db, PRESENCE_COLLECTION, whoAmI),
      { typing, typingAt: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
  }

  function notifyTyping() {
    if (!whoAmI || !isFirebaseConfigured) return;
    const now = Date.now();
    if (now - lastTypingWriteRef.current >= TYPING_WRITE_THROTTLE_MS) {
      lastTypingWriteRef.current = now;
      writeTyping(true);
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      writeTyping(false);
      // Reset so the very next keystroke after a pause announces "typing"
      // right away instead of waiting out a stale throttle window.
      lastTypingWriteRef.current = 0;
    }, TYPING_STALE_MS - 1_000);
  }

  function stopTyping() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    lastTypingWriteRef.current = 0;
    writeTyping(false);
  }

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { notifyTyping, stopTyping };
}

// Live read of the *other* person's presence - online/offline and
// currently-typing, both treated as stale (and so ignored) past the
// thresholds above in case a doc never got cleaned up properly.
export function usePartnerPresence(whoAmI: "a" | "b" | null): { online: boolean; typing: boolean } {
  const [state, setState] = useState({ online: false, typing: false });

  useEffect(() => {
    if (!whoAmI || !isFirebaseConfigured) {
      setState({ online: false, typing: false });
      return;
    }
    const db = getDb();
    if (!db) return;
    const ref = doc(db, PRESENCE_COLLECTION, otherOf(whoAmI));
    let latest: Partial<PresenceDoc> = {};

    function recompute() {
      const now = Date.now();
      const online = Boolean(latest.online) && now - millisOf(latest.lastSeen) < ONLINE_STALE_MS;
      const typing = Boolean(latest.typing) && now - millisOf(latest.typingAt) < TYPING_STALE_MS;
      setState({ online, typing });
    }

    const unsub = onSnapshot(ref, (snap) => {
      latest = (snap.data() as Partial<PresenceDoc>) ?? {};
      recompute();
    });
    // Snapshots only arrive on writes - without this, a stale "typing" or
    // "online" flag would sit in the UI forever if the other side's tab
    // died before it could send a final "false" write.
    const interval = setInterval(recompute, 2_000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [whoAmI]);

  return state;
}
