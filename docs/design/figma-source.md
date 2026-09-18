# Figma source and visual verification

Source: [user-provided copied challenge file](https://www.figma.com/design/CBQYrcf39WjlSY14lZLwpr/F26-Dev-Challenge-Figma--Copy-?node-id=0-1).

- Default frame: `1:1481`, 1676 × 955.
- Expanded frame: `1:762`, 1676 × 955.
- Both frames retrieved using the official Figma MCP design context and screenshot tools.
- Followed the Figma design-to-code skill, adapting measurements and exported assets to existing components and retaining their interactions.

The sidebar is 280px wide at (10,10); main content begins at x=330. Search is 370px wide; metrics have 10px gaps and 20px padding. Expanded details use 40px padding/gap, a roughly 593 × 81 waveform, 42px controls, and two balanced columns. Geist uses weights 400, 500, and 600.

Assets in `public/design/figma` retain the bytes returned by Figma. Names match the exported context identifiers. The avatar is displayed in a 42px circle. Icons retain their complete exported 16px viewboxes (the admin icon is 10px). The waveform fills its measured outer box. Map imagery uses the source's 116.92% × 115.42% crop, with separate field and location overlays; the location SVG includes its original glow extent. Small interactive controls not present in the design continue to use Lucide.

Geist Latin WOFF2 was copied from the installed Next.js distribution; `public/fonts/OFL.txt` is the license from the official vercel/geist-font repository. The font is served with `next/font/local`, without runtime external font requests.

Browser captures use the native frame viewport. The application supports scrolling below the expanded entry and responsive layouts; Figma's fixed frame crops the lower records. The temporary tag editor, unavailable-audio message, and map dialog remain explicitly preview functionality. No claim of exact pixel equality or production backend completion is made.
