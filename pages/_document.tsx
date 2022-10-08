import { createGetInitialProps } from '@mantine/next';
import {
  default as NextDocument,
  Head,
  Html,
  Main,
  NextScript,
} from 'next/document';

const getInitialProps = createGetInitialProps();

export default class Document extends NextDocument {
  static getInitialProps = getInitialProps;

  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
