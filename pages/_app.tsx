import { Box, MantineProvider } from '@mantine/core';
import { NotificationsProvider } from '@mantine/notifications';
import { Analytics } from '@vercel/analytics/react';
import Footer from 'components/Footer';
import type { AppProps } from 'next/app';
import Image from 'next/future/image';
import bg from 'public/bg.jpg';
import type { FC } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

const qc = new QueryClient();

const App: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <>
      <MantineProvider withGlobalStyles withNormalizeCSS>
        <NotificationsProvider>
          <Box
            sx={{
              position: 'fixed',
              width: '100vw',
              height: '100vh',
              zIndex: -1,
            }}
          >
            <Image
              src={bg}
              alt=''
              fill
              style={{
                objectFit: 'cover',
                filter:
                  'blur(3px) contrast(50%) saturate(175%) brightness(115%)',
                transform: 'scale(105%)',
              }}
            />
          </Box>
          <QueryClientProvider client={qc}>
            <Component {...pageProps} />
            {process.env.NODE_ENV === 'development' && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </QueryClientProvider>
        </NotificationsProvider>
        <Footer />
      </MantineProvider>
      <Analytics />
    </>
  );
};

export default App;
