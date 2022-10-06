import { MantineProvider } from '@mantine/core';
import { AppProps as NextAppProps } from 'next/app';
import Image from 'next/image';
import bg from 'public/bg.jpg';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

const qc = new QueryClient();

interface AppProps extends NextAppProps {}

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <QueryClientProvider client={qc}>
      <MantineProvider withGlobalStyles withNormalizeCSS>
        <Image
          src={bg}
          alt=''
          layout='fill'
          objectFit='cover'
          style={{ zIndex: -1 }}
        />
        <Component {...pageProps} />
      </MantineProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

export default App;
