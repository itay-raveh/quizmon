/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactElement } from 'react';

interface SPRouterProps<T extends string> {
  page: T;
  pages: Record<T, ReactElement<any, any> | null>;
}

const SPRouter = <T extends string>({
  page,
  pages,
}: React.PropsWithChildren<SPRouterProps<T>>): ReactElement<any, any> | null =>
  pages[page];

export default SPRouter;
