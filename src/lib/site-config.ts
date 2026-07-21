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

  // No meeting date exists yet. Leave this as `null` until one is real -
  // the Journey page reads this directly and stays in its honest "no date
  // yet" state for as long as it's null.
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
      city: "Prague",
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
      coords: { lat: 50.0755, lng: 14.4378 },
    },
  ],

  // Milestone-level only - see project brief Section 8. No day-by-day log.
  // Labels are relative on purpose: nothing here claims a calendar date that
  // isn't actually known.
  timeline: [
    {
      label: "The beginning",
      title: "Met playing Genshin Impact",
      text: "Two strangers on the same server, for no particular reason.",
    },
    {
      label: "Not long after",
      title: "Talking became daily",
      text: "What started as occasional messages turned into an actual habit.",
    },
    {
      label: "As trust grew",
      title: "The conversations went deeper",
      text: "Books, life, countries, languages, software, university, the future.",
    },
    {
      label: "Right now",
      title: "Still getting to know each other",
      text: "No in-person meeting yet, and no date for one - just two people talking, most days.",
    },
  ],

  // Shared Library - see brief Section 9. Games is pre-seeded because it's a
  // confirmed shared fact, not a guess. Everything else stays empty until
  // it's real.
  library: {
    books: [
      { title: "Crime and Punishment - Fyodor Dostoevsky", note: "She wants to read it" },
      { title: "The Brothers Karamazov - Fyodor Dostoevsky", note: "Read it in elementary school" },
      { title: "White Nights - Fyodor Dostoevsky", note: "Misha recommended the book and film; she agreed to try it" },
      { title: "Dungeon Crawler Carl - Matt Dinniman", note: "She wants to read it" },
      { title: "The Hunger Games - Suzanne Collins", note: "Her favorite classic - what got her into reading" },
      { title: "Nevernight - Jay Kristoff", note: "She likes it a lot" },
      { title: "Dcéra zimy (Daughter of Winter)", note: "Slovak novel about Morena and Vesna - she has parts 1 and 2" },
      { title: "Ballad of Sword and Wine", note: "Danmei novel - she has volume 1, saving the rest for later" },
      { title: "Copper Coins", note: "Danmei novel - on her list" },
      { title: "Run Wild", note: "Danmei novel - she has volume 1" },
      { title: "The Villain's White Halo", note: "Danmei novel - on her list" },
      { title: "Blossoms of the White Night", note: "Danmei novel - recently read, a romantic one she likes" },
      { title: "Smyrna and Capri", note: "Danmei novel - one of her favorites" },
      { title: "The Unquenchable Mr. Kim", note: "Danmei novel she knows" },
      { title: "BJ Alex", note: "Manhwa - she knows it well" },
      { title: "Killing Stalking", note: "Manhwa/thriller, often labeled BL" },
      { title: "Painter of the Night", note: "Manhwa Misha called the most beautiful art-wise; she knows it" },
      { title: "Window to Window", note: "Manhwa she recognized by name" },
    ] as { title: string; note?: string }[],
    movies: [
      { title: "Saga of Tanya the Evil", note: "Her favorite anime - waiting for a new season" },
      { title: "Attack on Titan", note: "Her most favorite anime, though she lost interest after season 3" },
      { title: "Overlord", note: "She likes it, but prefers the light novels" },
      { title: "Death Note", note: "She likes it" },
      { title: "Saiki K", note: "She finds it fun" },
      { title: "Alien Stage", note: "Musical project - she wants to binge it again" },
      { title: "Beautiful Disaster", note: "\"Horrible movie\" in her words, but fun to watch drunk with a friend" },
      { title: "White Nights", note: "Soviet film Misha suggested; she agreed to watch it" },
    ] as { title: string; note?: string }[],
    games: [
      { title: "Genshin Impact", note: "Where we met" },
      { title: "Honkai: Star Rail", note: "She actively plays, waiting on new characters" },
      { title: "Hades", note: "She plays it" },
      { title: "Baldur's Gate 3", note: "She's thinking about starting it" },
      { title: "Stardew Valley", note: "Discussed as something to play together" },
      { title: "Dead by Daylight", note: "She considered it, decided against" },
      { title: "Hatsune Miku: Colorful Stage", note: "She plays it sometimes" },
    ] as { title: string; note?: string }[],
    places: [] as { title: string; note?: string }[],
  },

  // "Not Yet" - capped 4–6, hopeful framing only. `achieved` flips to true
  // later without any structural change to the component.
  notYet: [
    { title: "First photo together", achieved: false },
    { title: "First café together", achieved: false },
    { title: "First walk together", achieved: false },
    { title: "First time meeting in person", achieved: false },
  ],

  // Real songs only - see brief Section 11. `audioUrl` is the primary way
  // to make a track actually play: paste a public Cloudflare R2 URL (or,
  // if NEXT_PUBLIC_R2_PUBLIC_BASE_URL is set, just the object key) to your
  // own audio file for that song, e.g. "homewrecked.mp3". Left blank on
  // purpose until real files are uploaded - see CLOUDFLARE_R2_SETUP.md.
  // spotifyUrl/youtubeUrl still work as a fallback embed if you'd rather
  // link out than host the file yourself.
  playlist: [
    {
      title: "Homewrecked",
      artist: "Adela",
      note: "One of Nicol's favorite artists - a real starting point, not a placeholder.",
      audioUrl: "",
      spotifyUrl: "",
      youtubeUrl: "",
      art: "",
    },
    { title: "Superscar", artist: "Adela", note: "", audioUrl: "", spotifyUrl: "", youtubeUrl: "", art: "" },
    { title: "MachineGirl", artist: "Adela", note: "", audioUrl: "", spotifyUrl: "", youtubeUrl: "", art: "" },
    {
      title: "Crown",
      artist: "TXT (Tomorrow X Together)",
      note: "",
      audioUrl: "",
      spotifyUrl: "",
      youtubeUrl: "",
      art: "",
    },
    {
      title: "0X1=LOVESONG (I Know I Love You)",
      artist: "TXT (Tomorrow X Together)",
      note: "",
      audioUrl: "",
      spotifyUrl: "",
      youtubeUrl: "",
      art: "",
    },
    {
      title: "Deja Vu",
      artist: "TXT (Tomorrow X Together)",
      note: "",
      audioUrl: "",
      spotifyUrl: "",
      youtubeUrl: "",
      art: "",
    },
    { title: "Spring Day", artist: "BTS", note: "", audioUrl: "", spotifyUrl: "", youtubeUrl: "", art: "" },
    { title: "Dynamite", artist: "BTS", note: "", audioUrl: "", spotifyUrl: "", youtubeUrl: "", art: "" },
    { title: "Life Goes On", artist: "BTS", note: "", audioUrl: "", spotifyUrl: "", youtubeUrl: "", art: "" },
    { title: "Gnarly", artist: "Katseye", note: "", audioUrl: "", spotifyUrl: "", youtubeUrl: "", art: "" },
    { title: "Touch", artist: "Katseye", note: "", audioUrl: "", spotifyUrl: "", youtubeUrl: "", art: "" },
    { title: "Gabriela", artist: "Katseye", note: "", audioUrl: "", spotifyUrl: "", youtubeUrl: "", art: "" },
    { title: "Zitti e Buoni", artist: "Måneskin", note: "", audioUrl: "", spotifyUrl: "", youtubeUrl: "", art: "" },
    {
      title: "I Wanna Be Your Slave",
      artist: "Måneskin",
      note: "",
      audioUrl: "",
      spotifyUrl: "",
      youtubeUrl: "",
      art: "",
    },
    { title: "Beggin'", artist: "Måneskin", note: "", audioUrl: "", spotifyUrl: "", youtubeUrl: "", art: "" },
  ],
};
