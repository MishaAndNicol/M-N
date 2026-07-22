// Central content file. Edit the values below to personalize the site -
// this is the low-tech equivalent of the "edit texts" admin feature until
// the Firestore-backed admin panel (see /admin) is wired up with real content.
//
// Hard rule for anyone editing this file: no invented facts, hobbies,
// quotes, or dates. If something isn't confirmed, leave the array/field
// empty rather than guessing - the components are built to show an honest
// empty state instead.

export const site = {
  names: { a: "Misha", b: "Nicol" },

  // Confirmed real date - the day they started talking. Drives the
  // real-time "days" count on the homepage.
  metAt: new Date("2026-07-10"),

  // No meeting date exists yet. Leave this as `null` until one is real.
  meetingDate: null as Date | null,

  hero: {
    title: "Two countries. Two different lives. One conversation.",
  },

  people: [
    {
      name: "Misha",
      country: "Russia",
      city: "Suwon",
      cityCountry: "South Korea",
      university: "Sungkyunkwan University",
      major: "Software Engineering",
      languages: ["Russian", "English", "Korean"],
      hobbies: [
        "Cooking",
        "Writing",
        "Programming",
        "Photography",
        "Used to play piano",
      ],
      bio: "From Russia, currently studying Software Engineering at Sungkyunkwan University in Suwon, South Korea. Outside of coursework he cooks, writes, codes, and photographs the places and scenes he passes through - he used to play piano, too. He's currently building a personal project, a Dialogue Localisation Tool, and collects books: Russian titles he brought with him to Korea, plus Japanese books translated into Korean. This year he was selected as an advisor for incoming first-year students at his university. Next, he's aiming for a Master's degree somewhere in the EU, alongside an international internship.",
      photo: "/images/profile-a.jpg",
      coords: { lat: 37.2636, lng: 127.0286 },
    },
    {
      name: "Nicol",
      country: "Slovakia",
      city: "Brno",
      cityCountry: "Czech Republic",
      note: "Currently studying and interning in the Czech Republic",
      major: "Law",
      languages: ["English", "Slovak"],
      hobbies: [
        "Reads a couple of ongoing translated web-novel series",
        "Plays single-player games - Genshin Impact, Honkai: Star Rail, Hades",
        "Cooks, though she keeps it to the bare minimum",
      ],
      bio: "From Slovakia, currently studying law and completing a supervised internship in the Czech Republic - mandatory for her degree, and she's been clear she wants to stay in law rather than switch fields. She has a cat waiting for her back home in Slovakia, cooks only the bare minimum, and works through a couple of ongoing translated web-novel series between everything else. When she plays, it's solo - Genshin Impact, Honkai: Star Rail, Hades - multiplayer isn't really her thing. Careful with new people, protective of her independence, and always says what she means.",
      photo: "/images/profile-b.jpg",
      coords: { lat: 49.1951, lng: 16.6068 },
    },
  ],

  // "Not Yet" - capped 4–6, hopeful framing only. `achieved` flips to true
  // later without any structural change to the component.
  notYet: [
    { title: "First photo together", achieved: false },
    { title: "First café together", achieved: false },
    { title: "First walk together", achieved: false },
    { title: "First time meeting in person", achieved: false },
  ],

  // Real songs only - see brief Section 11. `audioUrl` points at a public
  // Cloudflare R2 object (full URL, or - since NEXT_PUBLIC_R2_PUBLIC_BASE_URL
  // is configured - just the object key). Trimmed down to only the tracks
  // that actually have an uploaded file; add more the same way any time
  // (full entry shape: title, artist, note, audioUrl, spotifyUrl, youtubeUrl, art).
  playlist: [
    { title: "Superscar", artist: "Adela", note: "", audioUrl: "music/3.m4a", spotifyUrl: "", youtubeUrl: "", art: "" },
    {
      title: "Upside Down Kiss",
      artist: "TXT (Tomorrow X Together)",
      note: "",
      audioUrl: "music/1.mp3",
      spotifyUrl: "",
      youtubeUrl: "",
      art: "",
    },
    {
      title: "Ghost Girl",
      artist: "TXT (Tomorrow X Together)",
      note: "",
      audioUrl: "music/6.mp3",
      spotifyUrl: "",
      youtubeUrl: "",
      art: "",
    },
    {
      title: "Anti-Romantic",
      artist: "TXT (Tomorrow X Together)",
      note: "",
      audioUrl: "music/7.mp3",
      spotifyUrl: "",
      youtubeUrl: "",
      art: "",
    },
    {
      title: "Frost",
      artist: "TXT (Tomorrow X Together)",
      note: "",
      audioUrl: "music/8.mp3",
      spotifyUrl: "",
      youtubeUrl: "",
      art: "",
    },
    {
      title: "LO$ER=LO♡ER",
      artist: "TXT (Tomorrow X Together)",
      note: "",
      audioUrl: "music/9.mp3",
      spotifyUrl: "",
      youtubeUrl: "",
      art: "",
    },
    { title: "Zitti e Buoni", artist: "Måneskin", note: "", audioUrl: "music/5.mp3", spotifyUrl: "", youtubeUrl: "", art: "" },
    { title: "MAMMAMIA", artist: "Måneskin", note: "", audioUrl: "music/4.mp3", spotifyUrl: "", youtubeUrl: "", art: "" },
    {
      title: "I Wanna Be Your Slave",
      artist: "Måneskin",
      note: "",
      audioUrl: "music/2.mp3",
      spotifyUrl: "",
      youtubeUrl: "",
      art: "",
    },
  ],
};
