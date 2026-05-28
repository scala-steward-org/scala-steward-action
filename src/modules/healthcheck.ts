import {type Logger} from '../core/logger'
import {type HttpClient} from '../core/http'

/**
 * Returns `true` if the configured Maven repositories are reachable.
 */
export type ConnectivityProbe = () => Promise<boolean>

export class HealthCheck {
  static from(logger: Logger, httpClient: HttpClient) {
    return new HealthCheck(logger, httpClient)
  }

  constructor(private readonly logger: Logger, private readonly httpClient: HttpClient) {}

  /**
   * Checks connection with Maven Central, throws error if unable to connect.
   */
  async mavenCentral(): Promise<void> {
    const success = await this.httpClient.run('https://repo1.maven.org/maven2/').then(response => response.ok)

    if (!success) {
      throw new Error('Unable to connect to Maven Central')
    }

    this.logger.info('✓ Connected to Maven Central')
  }
}
