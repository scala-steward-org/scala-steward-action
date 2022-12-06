/**
 * Represent file operations performed by the action
 */
export type Files = {
  /**
   * Read file contents from the filesystem.
   */
  readFileSync: (path: string, encoding: 'utf8') => string;

  /**
   * Returns `true` if the provided path exists.
   */
  existsSync: (path: string) => boolean;
}
