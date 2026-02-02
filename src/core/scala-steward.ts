/**
 * Returns the Scala version suffix for the Scala Steward artifact.
 *
 * Scala Steward started publishing Scala 3 artifacts from version 0.33.0.
 * Older versions only have Scala 2.13 artifacts.
 *
 * @param version The Scala Steward version string (e.g. "0.33.0").
 * @returns "3" for versions >= 0.33.0, "2.13" otherwise.
 */
export function scalaVersion(version: string): string {
  const parts = version.split('.').map(Number)
  const [major = 0, minor = 0] = parts

  if (major > 0 || minor >= 33) {
    return '3'
  }

  return '2.13'
}
