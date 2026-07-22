"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send } from "lucide-react";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  text: string;
  who: "a" | "b";
  createdAt: Timestamp | null;
};

const CHAT_COLLECTION = "watchRoomChat";
const MAX_MESSAGES = 300;

function formatTime(ts: Timestamp | null): string {
  if (!ts) return "";
  const withToDate = ts as unknown as { toDate?: () => Date };
  const date = typeof withToDate.toDate === "function" ? withToDate.toDate() : new Date(ts as unknown as string);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// A dedicated live chat for the watch room - separate from the shared
// playback state in watch-room.tsx, but rendered alongside it so a film
// night has somewhere to actually talk. Same Firestore-optional pattern
// as the rest of the room: fully usable locally if Firebase isn't
// configured, syncs live between both people once it is.
export function WatchChat({
  whoAmI,
  nameA,
  nameB,
  variant = "panel",
}: {
  whoAmI: "a" | "b";
  nameA: string;
  nameB: string;
  // "panel" - the original fixed-height card, meant to sit in normal page
  // flow. "overlay" - fills its parent (the video stage) and uses a dark,
  // translucent surface so it reads well sitting on top of the film.
  variant?: "panel" | "overlay";
}) {
  const connected = isFirebaseConfigured;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const myName = whoAmI === "a" ? nameA : nameB;
  const otherName = whoAmI === "a" ? nameB : nameA;

  useEffect(() => {
    if (!connected) return;
    const db = getDb();
    if (!db) return;
    const q = query(collection(db, CHAT_COLLECTION), orderBy("createdAt", "asc"), limit(MAX_MESSAGES));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => {
          const data = d.data() as Partial<ChatMessage>;
          return {
            id: d.id,
            text: data.text ?? "",
            who: data.who === "b" ? "b" : "a",
            createdAt: (data.createdAt as Timestamp | undefined) ?? null,
          };
        })
      );
    });
    return () => unsub();
  }, [connected]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    if (!connected) {
      // Local-only preview: message just appears in this browser tab so
      // the UI is fully explorable before Firebase is configured.
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, text, who: whoAmI, createdAt: new Date() as unknown as Timestamp },
      ]);
      setDraft("");
      return;
    }

    const db = getDb();
    if (!db) return;
    setSending(true);
    try {
      await addDoc(collection(db, CHAT_COLLECTION), {
        text,
        who: whoAmI,
        createdAt: serverTimestamp(),
      });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  const emptyState = useMemo(
    () => messages.length === 0,
    [messages.length]
  );

  const overlay = variant === "overlay";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden",
        overlay
          ? "h-full border-l border-white/10 bg-black/70 backdrop-blur-md"
          : "card-surface h-[32rem] p-0 lg:h-[70vh] lg:min-h-[560px]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-6 py-5",
          overlay ? "border-white/10" : "border-line dark:border-line-dark"
        )}
      >
        <MessageCircle className={cn("h-4 w-4", overlay ? "text-white" : "text-thread")} />
        <div>
          <p className={cn("eyebrow !text-sm", overlay && "!text-white/70")}>Chat</p>
          <p className={cn("text-xs", overlay ? "text-white/60" : "text-mist")}>
            {connected ? `You, ${myName} - talking with ${otherName}` : `Local preview - talking to yourself as ${myName}`}
          </p>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {emptyState && (
          <div className={cn("flex h-full items-center justify-center px-6 text-center text-sm", overlay ? "text-white/50" : "text-mist")}>
            No messages yet - say hi while the film loads.
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.who === whoAmI;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    mine
                      ? "rounded-br-sm bg-thread text-white dark:text-black"
                      : overlay
                        ? "rounded-bl-sm border border-white/15 bg-white/10 text-white"
                        : "rounded-bl-sm border border-line bg-white/40 dark:border-line-dark dark:bg-white/[0.04]"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  {m.createdAt && (
                    <p className={cn("mt-1 text-[10px] opacity-60", mine ? "text-right" : "text-left")}>
                      {formatTime(m.createdAt)}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <form
        onSubmit={handleSend}
        className={cn("flex items-center gap-2 border-t p-4", overlay ? "border-white/10" : "border-line dark:border-line-dark")}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${otherName}...`}
          className={cn(
            "w-full rounded-full border bg-transparent px-4 py-2.5 text-sm outline-none transition-colors",
            overlay
              ? "border-white/15 text-white placeholder:text-white/40 focus:border-white/40"
              : "border-line focus:border-thread dark:border-line-dark"
          )}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          aria-label="Send message"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-thread text-white transition-opacity hover:opacity-90 disabled:opacity-40 dark:text-black"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
