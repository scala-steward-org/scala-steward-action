/**
 * Represent file operations performed by the action
 */
export type Files = {
  /**
   * Changes the permissions of a file.
   */
  chmodSync: (path: string, mode: number) => void;

  /**
   * Write file contents to the filesystem.
   */
  writeFileSync: (path: string, content: string) => void;

  /**
   * Make a directory. Creates the full path with folders in between.
   */
  mkdirP: (path: string) => Promise<void>;

  /**
   * Read file contents from the filesystem.
   */
  rmRF: (path: string) => Promise<void>;

  /**
   * Read file contents from the filesystem.
   */
  readFileSync: (path: string, encoding: 'utf8') => string;

  /**
   * Returns `true` if the provided path exists.
   */
  existsSync: (path: string) => boolean;
}
