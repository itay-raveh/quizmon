import {
  ColorScheme,
  ColorSchemeProvider,
  MantineProvider,
} from '@mantine/core';
import { useColorScheme } from '@mantine/hooks';
import bgDark from '@public/bg/dark.jpg';
import bgLight from '@public/bg/light.jpg';
import { getCookie, setCookie } from 'cookies-next';
import {
  AppContext,
  AppProps as NextAppProps,
  default as NextApp,
} from 'next/app';
import Image from 'next/image';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

const COLOR_SCHEME_COOKIE = 'color-scheme';

const qc = new QueryClient();

interface AppProps extends NextAppProps {
  colorSchemeCookie?: ColorScheme;
}

const App = ({ Component, pageProps, colorSchemeCookie }: AppProps) => {
  // get the system color scheme preference
  const preferredColorScheme = useColorScheme();

  // initialize color scheme state with cookie, fallback to system preference
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    colorSchemeCookie || preferredColorScheme
  );

  const toggleColorScheme = (value?: ColorScheme) => {
    const nextColorScheme =
      value || (colorScheme === 'dark' ? 'light' : 'dark');
    setColorScheme(nextColorScheme);
    setCookie(COLOR_SCHEME_COOKIE, nextColorScheme, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  };

  return (
    <QueryClientProvider client={qc}>
      <ColorSchemeProvider
        colorScheme={colorScheme}
        toggleColorScheme={toggleColorScheme}
      >
        <MantineProvider withGlobalStyles withNormalizeCSS>
          <Image
            src={colorScheme === 'light' ? bgLight : bgDark}
            alt=''
            // layout=fill + z-index=-1 = background image
            layout='fill'
            style={{ zIndex: -1 }}
          />
          <Component {...pageProps} />
        </MantineProvider>
      </ColorSchemeProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

App.getInitialProps = async (appContext: AppContext) => {
  const appProps = await NextApp.getInitialProps(appContext);

  return {
    ...appProps,
    colorSchemeCookie: getCookie(COLOR_SCHEME_COOKIE, appContext.ctx),
  };
};

export default App;
