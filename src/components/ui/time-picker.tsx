"use client";

// Small hour/minute picker used anywhere the site needs a time value
// ("HH:MM", 24h). Swapped in for the native <input type="time"> in the
// watch scheduler, whose OS-drawn spinner is fussy to operate with a
// mouse (tiny hit targets, platform-inconsistent styling, no keyboard-
// free path on touch). Two plain <select> elements are boring but
// completely reliable across browsers and easy to style consistently
// with the rest of the site.

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function TimePicker({
  value,
  onChange,
  className,
}: {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
}) {
  const [hh = "19", mm = "00"] = value.split(":");
  const hour = Number(hh);
  // Snap the displayed minute to the nearest 5-minute stop so a value
  // that didn't originate here (e.g. an old stored proposal) still
  // renders as a valid, selectable option instead of silently mismatching.
  const minute = MINUTES.reduce((closest, m) => (Math.abs(m - Number(mm)) < Math.abs(closest - Number(mm)) ? m : closest), 0);

  function setHour(h: number) {
    onChange(`${pad(h)}:${pad(minute)}`);
  }
  function setMinute(m: number) {
    onChange(`${pad(hour)}:${pad(m)}`);
  }

  const selectClass =
    "appearance-none rounded-full border border-line bg-transparent px-3 py-1.5 text-sm outline-none transition-colors focus:border-thread dark:border-line-dark";

  return (
    <div className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <select aria-label="Hour" value={hour} onChange={(e) => setHour(Number(e.target.value))} className={selectClass}>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {pad(h)}
          </option>
        ))}
      </select>
      <span className="text-mist">:</span>
      <select aria-label="Minute" value={minute} onChange={(e) => setMinute(Number(e.target.value))} className={selectClass}>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {pad(m)}
          </option>
        ))}
      </select>
    </div>
  );
}
