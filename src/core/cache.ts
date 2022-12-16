export type ActionCache = {
  /**
   * Restores cache from keys
   */
  restoreCache(paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<string | undefined>;

  /**
   * Saves a list of files with the specified key
   */
  saveCache(paths: string[], key: string): Promise<number>;
}
