import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Reset Loop',
    short_name: 'Reset Loop',
    description: 'A low-energy daily reset app for daily momentum.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fbff',
    theme_color: '#5b8dff',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
