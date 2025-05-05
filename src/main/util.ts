/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';

export function resolveHtmlPath(htmlFileName: string, port?: number) {
  const resolvedPort = port || Number(process.env.PORT) || 1212;
  if (process.env.NODE_ENV === 'development') {
    const url = new URL(`http://localhost:${resolvedPort}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}
