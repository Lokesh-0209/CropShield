import { useEffect } from 'react';

/**
 * Custom hook to dynamically manage page title, meta description, and favicon per route
 * @param {Object} options
 * @param {string} options.title - The document title
 * @param {string} [options.description] - Meta description for SEO and accessibility
 * @param {string} [options.favicon] - Path to favicon SVG/icon
 */
export function useDocumentMetadata({ title, description, favicon } = {}) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) {
      document.title = title.includes('CropShield') ? title : `${title} | CropShield`;
    }

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute('content') : null;
    if (description) {
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }

    let faviconLink = document.querySelector("link[rel*='icon']");
    const prevFavicon = faviconLink ? faviconLink.getAttribute('href') : null;
    if (favicon) {
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.setAttribute('rel', 'icon');
        faviconLink.setAttribute('type', 'image/svg+xml');
        document.head.appendChild(faviconLink);
      }
      faviconLink.setAttribute('href', favicon);
    }

    return () => {
      document.title = prevTitle;
      if (prevDesc && metaDesc) {
        metaDesc.setAttribute('content', prevDesc);
      }
      if (prevFavicon && faviconLink) {
        faviconLink.setAttribute('href', prevFavicon);
      }
    };
  }, [title, description, favicon]);
}

export default useDocumentMetadata;
