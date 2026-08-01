# Sticker Frontend

Next.js frontend for uploading an image, adjusting crop lines, previewing sticker tiles, and exporting a ZIP through the backend API.

## Start

```powershell
npm.cmd install
npm.cmd run dev
```

The frontend usually runs at:

```txt
http://localhost:3000
```

If port 3000 is already used, Next.js may choose another port such as 3001.

## Backend API

The frontend calls the backend through:

```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

This value is stored in `.env.local`.

## Scripts

```txt
npm.cmd run dev      Start Next.js development server
npm.cmd run build    Build the frontend
npm.cmd run start    Start the production build
```

## Important Files

```txt
app/layout.tsx
  Global HTML layout and page metadata.

app/page.tsx
  Home page. Renders the GridCutter component.

app/globals.css
  Global styles and preview tile background.

components/GridCutter.tsx
  Main UI and workflow:
  upload image, choose sticker count, drag crop lines, preview tiles, call backend, download ZIP.

tailwind.config.ts
  Tailwind content paths and custom colors.

.env.local
  Backend API base URL.
```

## Port Summary

```txt
3000 = frontend website
4000 = backend API
```
