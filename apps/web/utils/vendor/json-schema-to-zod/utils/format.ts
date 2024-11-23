import babelParser from 'prettier/parser-babel';
import prettier from 'prettier/standalone';

export const format = (source: string): string =>
  // @ts-ignore
  prettier.format(source, {
    parser: "babel",
    plugins: [babelParser],
  });
