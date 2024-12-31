export class NonEmptyString {
  static from(string: string): NonEmptyString | undefined {
    return (string === '') ? undefined : new NonEmptyString(string)
  }

  private constructor(readonly value: string) {}
}

/**
 * Creates a `NonEmptyString` from a `string`. Returns `undefined` if the string is empty.
 */
export function nonEmpty(string: string): NonEmptyString | undefined {
  return NonEmptyString.from(string)
}

/**
 * Creates a `NonEmptyString` from a `string`. Throws an `Error` if the string is empty.
 */
export function mandatory(string: string, message = `Input ${string} cannot be empty`): NonEmptyString {
  const value = nonEmpty(string)

  if (value === undefined) {
    throw new Error(message)
  }

  return value
}
