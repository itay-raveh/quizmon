import { Box, MantineProvider } from '@mantine/core';
import type { AppProps as NextAppProps } from 'next/app';
import Image from 'next/future/image';
import bg from 'public/bg.jpg';
import type { FC } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Provider as StoreProvider } from 'react-redux';
import { wrapper } from 'store/store';

const qc = new QueryClient();

interface AppProps extends NextAppProps {}

const App: FC<AppProps> = ({ Component, ...rest }) => {
  const {
    store,
    props: { pageProps },
  } = wrapper.useWrappedStore(rest);

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
        <StoreProvider store={store}>
          <Component {...pageProps} />
        </StoreProvider>
      </MantineProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

export default App;
