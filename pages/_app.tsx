import { Box, MantineProvider } from '@mantine/core';
import { AppProps as NextAppProps } from 'next/app';
import Image from 'next/future/image';
import bg from 'public/bg.jpg';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { wrapper } from 'store/store';

const qc = new QueryClient();

interface AppProps extends NextAppProps {}

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <QueryClientProvider client={qc}>
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
        <Component {...pageProps} />
      </MantineProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

export default wrapper.withRedux(App);
