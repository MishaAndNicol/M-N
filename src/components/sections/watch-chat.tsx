"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Pencil, Trash2, Check, X as XIcon } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/base-path";
import { CHAT_COLLECTION, markWatchChatRead } from "@/lib/watch-chat";
import { useTypingWriter, usePartnerPresence } from "@/lib/presence";

type ChatMessage = {
  id: string;
  text: string;
  who: "a" | "b";
  createdAt: Timestamp | null;
  edited?: boolean;
};

// Firestore's `limit()` just takes the first N docs matching the sort
// order - it does NOT mean "most recent N". The query below sorts newest
// first specifically so this cap keeps the *latest* messages instead of
// silently freezing the chat once the older messages fill it up. Two
// people won't get anywhere near this in practice; it exists only as a
// sanity ceiling, not a real limit.
const MAX_MESSAGES = 2000;

function formatTime(ts: Timestamp | null): string {
  if (!ts) return "";
  const withToDate = ts as unknown as { toDate?: () => Date };
  const date = typeof withToDate.toDate === "function" ? withToDate.toDate() : new Date(ts as unknown as string);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Small round avatar - falls back to an initial-letter circle when no
// photo is configured, so the layout doesn't depend on both people having
// uploaded one.
function Avatar({ name, photo, size = 28 }: { name: string; photo?: string; size?: number }) {
  if (photo) {
    return (
      <span
        className="relative block shrink-0 overflow-hidden rounded-full ring-1 ring-white/20"
        style={{ width: size, height: size }}
      >
        <Image src={withBasePath(photo)} alt={name} fill sizes={`${size}px`} className="object-cover" />
      </span>
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-thread/20 text-[10px] font-medium text-thread"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
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
  photoA,
  photoB,
  variant = "panel",
}: {
  whoAmI: "a" | "b";
  nameA: string;
  nameB: string;
  photoA?: string;
  photoB?: string;
  // "panel" - the original fixed-height card, meant to sit in normal page
  // flow. "overlay" - fills its parent (the video stage) and uses a dark,
  // translucent surface so it reads well sitting on top of the film.
  variant?: "panel" | "overlay";
}) {
  const connected = isFirebaseConfigured;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { notifyTyping, stopTyping } = useTypingWriter(whoAmI);
  const partnerPresence = usePartnerPresence(whoAmI);

  const myName = whoAmI === "a" ? nameA : nameB;
  const otherName = whoAmI === "a" ? nameB : nameA;
  const myPhoto = whoAmI === "a" ? photoA : photoB;
  const otherPhoto = whoAmI === "a" ? photoB : photoA;

  useEffect(() => {
    if (!connected) return;
    const db = getDb();
    if (!db) return;
    // Sorted newest-first so the cap above keeps the latest conversation;
    // reversed back to chronological order just for display.
    const q = query(collection(db, CHAT_COLLECTION), orderBy("createdAt", "desc"), limit(MAX_MESSAGES));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs
          .map((d) => {
            const data = d.data() as Partial<ChatMessage>;
            return {
              id: d.id,
              text: data.text ?? "",
              who: data.who === "b" ? "b" : "a",
              createdAt: (data.createdAt as Timestamp | undefined) ?? null,
              edited: Boolean(data.edited),
            } satisfies ChatMessage;
          })
          .reverse()
      );
    });
    return () => unsub();
  }, [connected]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // This component only exists in the DOM while the person is actually
  // looking at the chat - always-on for the "panel" layout, and only while
  // the overlay is toggled open in the room. So mounted + new message =
  // seen; mark it read here rather than waiting for an explicit click.
  useEffect(() => {
    markWatchChatRead(whoAmI);
  }, [whoAmI, messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    stopTyping();

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

  function startEdit(m: ChatMessage) {
    setEditingId(m.id);
    setEditDraft(m.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function saveEdit(id: string) {
    const text = editDraft.trim();
    if (!text) return;
    if (!connected) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text, edited: true } : m)));
      cancelEdit();
      return;
    }
    const db = getDb();
    if (!db) return;
    await updateDoc(doc(db, CHAT_COLLECTION, id), { text, edited: true });
    cancelEdit();
  }

  async function handleDelete(id: string) {
    if (!connected) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      return;
    }
    const db = getDb();
    if (!db) return;
    await deleteDoc(doc(db, CHAT_COLLECTION, id));
  }

  // Two-step confirm (click once to arm, click again to actually clear)
  // instead of a browser confirm() dialog, so it fits the rest of the UI.
  async function handleClearChat() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    setConfirmClear(false);
    if (!connected) {
      setMessages([]);
      return;
    }
    const db = getDb();
    if (!db) return;
    const snap = await getDocs(collection(db, CHAT_COLLECTION));
    // Firestore batches top out at 500 writes; chunk just in case a chat
    // ever genuinely grows past that.
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const batch = writeBatch(db);
      docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
      await batch.commit();
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
          "flex items-center justify-between gap-2 border-b px-6 py-5",
          overlay ? "border-white/10" : "border-line dark:border-line-dark"
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative shrink-0">
            <Avatar name={otherName} photo={otherPhoto} size={32} />
            {connected && (
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2",
                  overlay ? "ring-black/70" : "ring-paper dark:ring-void",
                  partnerPresence.online ? "bg-emerald-500" : "bg-mist/50"
                )}
              />
            )}
          </span>
          <div className="min-w-0">
            <p className={cn("eyebrow !text-sm", overlay && "!text-white/70")}>Chat</p>
            <p className={cn("truncate text-xs", overlay ? "text-white/60" : "text-mist")}>
              {!connected
                ? `Local preview - talking to yourself as ${myName}`
                : partnerPresence.typing
                  ? `${otherName} is typing...`
                  : partnerPresence.online
                    ? `${otherName} is online`
                    : `You, ${myName} - talking with ${otherName}`}
            </p>
          </div>
        </div>
        <button
          onClick={handleClearChat}
          disabled={messages.length === 0}
          title="Clear entire chat"
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            confirmClear
              ? "border-red-500 bg-red-500 text-white"
              : overlay
                ? "border-white/20 text-white/70 hover:border-red-400/60 hover:bg-red-500/10 hover:text-red-300"
                : "border-line text-mist hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 dark:border-line-dark"
          )}
        >
          <Trash2 className="h-3 w-3" />
          {confirmClear ? "Confirm clear" : "Clear chat"}
        </button>
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
            const isEditing = editingId === m.id;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={cn("group flex items-end gap-1.5", mine ? "justify-end" : "justify-start")}
              >
                {!mine && <Avatar name={otherName} photo={otherPhoto} size={22} />}

                {mine && !isEditing && (
                  <span className="mb-1 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(m)}
                      title="Edit message"
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full transition-colors",
                        overlay ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-mist hover:bg-thread/10 hover:text-thread"
                      )}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      title="Delete message"
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full transition-colors",
                        overlay ? "text-white/50 hover:bg-red-500/20 hover:text-red-300" : "text-mist hover:bg-red-500/10 hover:text-red-500"
                      )}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                )}

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
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(m.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="w-full min-w-[10rem] rounded-full border border-white/30 bg-transparent px-3 py-1 text-sm text-inherit outline-none"
                      />
                      <button onClick={() => saveEdit(m.id)} title="Save" className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-white/20">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={cancelEdit} title="Cancel" className="grid h-6 w-6 shrink-0 place-items-center rounded-full hover:bg-white/20">
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      {(m.createdAt || m.edited) && (
                        <p className={cn("mt-1 text-[10px] opacity-60", mine ? "text-right" : "text-left")}>
                          {formatTime(m.createdAt)}
                          {m.edited ? " · edited" : ""}
                        </p>
                      )}
                    </>
                  )}
                </div>
                {mine && <Avatar name={myName} photo={myPhoto} size={22} />}
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
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) notifyTyping();
            else stopTyping();
          }}
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
