import { Box, MantineProvider } from '@mantine/core';
import type { AppProps } from 'next/app';
import Image from 'next/future/image';
import bg from 'public/bg.jpg';
import type { FC } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

const qc = new QueryClient();

const App: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <Box
        sx={{
          position: 'fixed',
          width: '100vw',
          height: '100vh',
          zIndex: -1,
        }}
      >
        <Image src={bg} alt='' style={{ objectFit: 'cover' }} fill priority />
      </Box>
      <QueryClientProvider client={qc}>
        <Component {...pageProps} />
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </MantineProvider>
  );
};

export default App;
