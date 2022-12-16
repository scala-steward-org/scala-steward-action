export class NonEmptyString {
  static from(string: string): NonEmptyString | undefined {
    return (string === '') ? undefined : new NonEmptyString(string)
  }

  private constructor(readonly value: string) {}
}

export function nonEmpty(string: string): NonEmptyString | undefined {
  return NonEmptyString.from(string)
}
