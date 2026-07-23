"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";

// Same key watch-room.tsx stores "which person is this browser" under -
// shared here so the navbar badge can read it without importing the room
// component.
export const WATCH_WHOAMI_KEY = "twostory-watch-whoami";
export const CHAT_COLLECTION = "watchRoomChat";

const LAST_READ_KEY_PREFIX = "twostory-watch-chat-lastread-";
// localStorage's own "storage" event only fires in *other* tabs, not the
// one that made the change - this custom event lets components in the same
// tab (e.g. the chat panel marking itself read) tell the navbar badge to
// re-check immediately instead of waiting for the next snapshot.
const READ_EVENT = "twostory-watch-chat-read";

export function getWatchWhoAmI(): "a" | "b" | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(WATCH_WHOAMI_KEY);
  return v === "a" || v === "b" ? v : null;
}

function getLastRead(who: "a" | "b"): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LAST_READ_KEY_PREFIX + who);
  return raw ? Number(raw) || 0 : 0;
}

// Called whenever a person is actively looking at the chat (panel mounted,
// or the overlay opened) - resets the "last read" mark to now, so anything
// that arrived before this point stops counting toward the unread badge.
export function markWatchChatRead(who: "a" | "b") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_READ_KEY_PREFIX + who, String(Date.now()));
  window.dispatchEvent(new Event(READ_EVENT));
}

// Live count of messages from the *other* person that arrived after this
// person's last-read mark. Used to badge the chat toggle button inside the
// watch room, and the "Watch" link in the navbar, so a message doesn't go
// unnoticed just because the chat window is closed.
export function useUnreadWatchChatCount(): number {
  const [whoAmI, setWhoAmI] = useState<"a" | "b" | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setWhoAmI(getWatchWhoAmI());
    function refresh() {
      setWhoAmI(getWatchWhoAmI());
    }
    window.addEventListener(READ_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(READ_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!whoAmI || !isFirebaseConfigured) {
      setCount(0);
      return;
    }
    const db = getDb();
    if (!db) return;
    const q = query(collection(db, CHAT_COLLECTION), orderBy("createdAt", "desc"), limit(200));
    function recompute(docs: { who?: string; createdAt?: Timestamp | null }[]) {
      const lastRead = getLastRead(whoAmI as "a" | "b");
      let n = 0;
      for (const data of docs) {
        if (data.who === whoAmI) continue;
        const withToMillis = data.createdAt as unknown as { toMillis?: () => number } | null;
        const ms = withToMillis && typeof withToMillis.toMillis === "function" ? withToMillis.toMillis() : 0;
        if (ms > lastRead) n++;
      }
      setCount(n);
    }
    let latestDocs: { who?: string; createdAt?: Timestamp | null }[] = [];
    const unsub = onSnapshot(q, (snap) => {
      latestDocs = snap.docs.map((d) => d.data() as { who?: string; createdAt?: Timestamp | null });
      recompute(latestDocs);
    });
    // Re-run against the last known snapshot the instant this person marks
    // the chat read (e.g. the overlay just opened), instead of waiting for
    // the next incoming message to trigger a fresh Firestore event.
    function onReadEvent() {
      recompute(latestDocs);
    }
    window.addEventListener(READ_EVENT, onReadEvent);
    return () => {
      unsub();
      window.removeEventListener(READ_EVENT, onReadEvent);
    };
  }, [whoAmI]);

  return count;
}
