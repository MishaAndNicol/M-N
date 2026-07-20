export function Eyebrow({ children, index }: { children: React.ReactNode; index?: string }) {
  return (
    <p className="eyebrow flex items-center gap-2">
      {index && <span className="text-thread">{index}</span>}
      {children}
    </p>
  );
}
