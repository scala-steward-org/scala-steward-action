/**
 * Represents the logger used across the action.
 */
export type Logger = {
  startGroup(group: string): void;

  endGroup(): void;

  info(message: string): void;

  debug(message: string): void;

  error(message: string): void;

  warning(message: string): void;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Logger = {
  noOp: {
    info() {}, debug() {}, error() {}, warning() {}, startGroup() {}, endGroup() {},
  },

}
