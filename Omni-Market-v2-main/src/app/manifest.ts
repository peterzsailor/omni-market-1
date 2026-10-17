import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Omni Market — Buy & Sell',
    short_name: 'Omni Market',
    description: 'A smarter marketplace for great finds across Kenya.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f7f3ea',
    theme_color: '#123b32',
    categories: ['shopping', 'lifestyle'],
    icons: [
      {
        src: '/icons/omni-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}