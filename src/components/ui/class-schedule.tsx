"use client";

export type ClassEntry = { day: string; start: string; end: string; title: string };

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ROW_HEIGHT = 30; // px per hour - tall enough for a 2-line title in a 45-75min slot

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function shortTz(timezone?: string) {
  if (!timezone) return "";
  return timezone.split("/").pop()?.replace("_", " ") ?? timezone;
}

function OneSchedule({
  name,
  timezone,
  entries,
  accent,
  startHour,
  endHour,
}: {
  name: string;
  timezone?: string;
  entries: ClassEntry[];
  accent: string;
  startHour: number;
  endHour: number;
}) {
  const days = DAY_ORDER.filter((d) => entries.some((e) => e.day === d));
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const bodyHeight = hours.length * ROW_HEIGHT;
  const hourColW = 34;

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex items-baseline gap-2">
        <p className="text-sm font-medium">{name}</p>
        {timezone && <p className="text-[11px] text-mist">{shortTz(timezone)} time</p>}
      </div>

      {days.length === 0 ? (
        <p className="text-xs text-mist">No classes on file.</p>
      ) : (
        <div className="overflow-hidden rounded-[var(--season-radius-sm)] border border-line dark:border-line-dark">
          {/* day header row */}
          <div className="flex border-b border-line bg-[var(--season-surface,transparent)] dark:border-line-dark">
            <div className="shrink-0" style={{ width: hourColW }} />
            {days.map((day) => (
              <div
                key={day}
                className="flex-1 border-l border-line py-1 text-center text-[11px] text-mist dark:border-line-dark"
              >
                {day}
              </div>
            ))}
          </div>

          {/* hour grid */}
          <div className="flex">
            <div className="shrink-0 text-right" style={{ width: hourColW }}>
              {hours.map((h) => (
                <div key={h} className="relative" style={{ height: ROW_HEIGHT }}>
                  <span className="absolute -top-1.5 right-1 text-[9px] text-mist">{String(h).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
            <div className="relative flex flex-1" style={{ height: bodyHeight }}>
              {/* hour gridlines */}
              <div className="pointer-events-none absolute inset-0">
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-line/60 dark:border-line-dark/60"
                    style={{ top: i * ROW_HEIGHT }}
                  />
                ))}
              </div>
              {days.map((day) => (
                <div key={day} className="relative flex-1 border-l border-line first:border-l-0 dark:border-line-dark">
                  {entries
                    .filter((e) => e.day === day)
                    .map((e, i) => {
                      const top = ((toMinutes(e.start) - startHour * 60) / 60) * ROW_HEIGHT;
                      const height = ((toMinutes(e.end) - toMinutes(e.start)) / 60) * ROW_HEIGHT;
                      return (
                        <div
                          key={i}
                          title={`${e.title} · ${e.start}-${e.end}`}
                          className="absolute inset-x-0.5 overflow-hidden rounded-md border px-1 py-0.5 text-[9px] leading-tight"
                          style={{
                            top,
                            height: Math.max(height, 14),
                            borderColor: accent,
                            background: `${accent}22`,
                            color: accent,
                          }}
                        >
                          <div className="font-medium">{e.start}</div>
                          <div className="truncate">{e.title}</div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Two weekly grids side by side, "facing" each other - each in its own
// owner's local time (not converted), since that's how each of them
// actually reads their own timetable. Deliberately doesn't try to line
// up "12:00 for me" with "12:00 for them" as the same instant - the
// watch-time picker below is where the timezone math for overlap
// actually happens.
export function ClassSchedules({
  people,
}: {
  people: { name: string; timezone?: string; entries: ClassEntry[]; accent: string }[];
}) {
  const all = people.flatMap((p) => p.entries);
  const startHour = all.length ? Math.max(0, Math.floor(Math.min(...all.map((e) => toMinutes(e.start))) / 60)) : 8;
  const endHour = all.length ? Math.min(24, Math.ceil(Math.max(...all.map((e) => toMinutes(e.end))) / 60)) : 20;

  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      {people.map((p) => (
        <OneSchedule
          key={p.name}
          name={p.name}
          timezone={p.timezone}
          entries={p.entries}
          accent={p.accent}
          startHour={startHour}
          endHour={endHour}
        />
      ))}
    </div>
  );
}
