import { Reveal } from "@/components/ui/reveal";

export const metadata = { title: "Admin - two story" };

const PANELS = [
  { title: "Memories", desc: "Upload real photos to Storage once they exist, replacing an empty-state tile." },
  { title: "Not Yet", desc: "Flip an item to \"it happened\" once it's real." },
  { title: "Music", desc: "Add tracks with Spotify or YouTube embed links." },
  { title: "Watch together", desc: "Manage the shared watch-room playlist and chat." },
  { title: "Site text", desc: "Edit hero copy, bios, and quotes." },
];

export default function AdminDashboardPage() {
  return (
    <div className="pb-32 pt-40">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow mb-4">Admin</p>
          <h1 className="font-display text-3xl">Dashboard</h1>
          <p className="mt-3 max-w-lg text-sm text-mist">
            This is a scaffold. Each panel below maps to a Firestore collection - wire up the read/write calls
            (see <code className="font-mono">src/lib/firebase.ts</code>) once your project is configured, and
            protect this route with the auth check pattern in <code className="font-mono">src/hooks</code>.
          </p>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PANELS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-dashed border-line p-6 dark:border-line-dark">
              <h3 className="font-display text-lg">{p.title}</h3>
              <p className="mt-2 text-sm text-mist">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
