export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex items-center gap-3">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-thread" />
        <span className="font-mono text-xs uppercase tracking-widest text-mist">Loading</span>
      </div>
    </div>
  );
}
