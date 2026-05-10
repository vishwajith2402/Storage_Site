# VaultDrop

Dark luxury storage-themed static website that can be published directly on static hosting.

## Static Publish Mode

- Main publishable page lives at `public/index.html`
- Root `index.html` redirects to `public/` for simple hosting setups
- Accounts, folders, uploaded files, tags, favorites, shares, and activity are stored in the browser with `localStorage`
- No app-level file type restriction is enforced in the UI

## Included Features

- Fixed top header with page name and logged-in username
- Multiple file upload with drag-and-drop queue
- Folder creation with icon, color, parent folder, and pinning
- Search, sorting, folder focus, type filtering, favorites-only mode, and recycle-bin view
- File previews for images, videos, PDFs, and text files
- Favorites, tags, bulk actions, recent activity, and recent access tracking
- Share-link generation with optional password and expiry date
- Storage analytics, pinned folders, profile card, and theme personalization
- Recycle bin and restore flow for deleted files

## Important Limitation

This static version is publishable, but it does not provide true multi-device cloud storage. Data stays in the browser on the device where the user creates it. For real sync across devices, the next step would be connecting the UI to a backend database and file storage service.

## Preview Locally

You can open `public/index.html` directly in a browser, or serve the folder with any static host.
