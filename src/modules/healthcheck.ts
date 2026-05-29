import {type Logger} from '../core/logger.js'

/**
 * Returns `true` if the configured Maven repositories are reachable.
 */
export type ConnectivityProbe = () => Promise<boolean>

export class HealthCheck {
  static from(logger: Logger, probe: ConnectivityProbe) {
    return new HealthCheck(logger, probe)
  }

  constructor(private readonly logger: Logger, private readonly probe: ConnectivityProbe) {}

  /**
   * Checks connectivity to the configured Maven repositories. Throws if
   * unreachable.
   */
  async check(): Promise<void> {
    const success = await this.probe()

    if (!success) {
      throw new Error('Unable to connect to the configured Maven repositories. '
        + 'Set the COURSIER_REPOSITORIES and COURSIER_CREDENTIALS environment '
        + 'variables to point Coursier at a reachable mirror if you are being '
        + 'rate-limited by Maven Central.')
    }

    this.logger.info('✓ Connected to the configured Maven repositories')
  }
}
