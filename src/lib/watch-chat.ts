"use client";

// Same key watch-room.tsx stores "which person is this browser" under -
// shared here so anything reading unread counts doesn't need to import the
// room component itself.
export const WATCH_WHOAMI_KEY = "twostory-watch-whoami";
export const CHAT_COLLECTION = "watchRoomChat";

const LAST_READ_KEY_PREFIX = "twostory-watch-chat-lastread-";

export function getWatchWhoAmI(): "a" | "b" | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(WATCH_WHOAMI_KEY);
  return v === "a" || v === "b" ? v : null;
}

// Exported so WatchChat can compute its own unread count from the messages
// it already has loaded through its single live listener, instead of a
// second onSnapshot listener existing purely to recompute the same number.
export function getLastRead(who: "a" | "b"): number {
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
}
