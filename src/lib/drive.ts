// Builds a URL that streams a Drive file's raw bytes directly, honoring
// Range requests for seeking - unlike the old /preview iframe embed, this
// gives the page real play()/pause()/currentTime control over playback,
// because it's just a <video> tag pointed at a normal media URL rather than
// someone else's player running inside a cross-origin iframe.
//
// <video>/<audio> elements don't need CORS headers to play a cross-origin
// URL (CORS only matters if you read pixel data back out via canvas, which
// we never do here), so this works fine from a fully static export with no
// server-side proxy involved.
//
// Requirements:
//  - the file must be shared as "Anyone with the link can view" in Drive
//    (same requirement the old iframe embed already had)
//  - a Drive API key, restricted by HTTP referrer to this site's domain(s)
//    in Google Cloud Console, set as NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY
export function buildDriveMediaUrl(fileId: string, apiKey: string): string {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}`;
}
