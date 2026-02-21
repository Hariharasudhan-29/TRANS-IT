import '@transit/ui/styles.css';
import '../styles/responsive.css';
import '../styles/driver-mobile.css';
import '../styles/mobile-enhanced.css';
import Head from 'next/head';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%230ea5e9%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M8 6v6%22/><path d=%22M15 6v6%22/><path d=%22M2 12h19.6%22/><path d=%22M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.3-.1-.6-.2-.9l-2-4.5c-.3-.7-1-1.1-1.8-1.1H5.2c-.8 0-1.5.4-1.8 1.1l-2 4.5c-.1.3-.2.6-.2.9 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3%22/><path d=%22M18 18v-5%22/><path d=%22M5 18v-5%22/><circle cx=%227%22 cy=%2218%22 r=%222%22/><circle cx=%2217%22 cy=%2218%22 r=%222%22/></svg>" />
        <title>Driver App - Trans-It</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
