import {type Logger} from '../core/logger'
import {type HttpClient} from '../core/http'

export class HealthCheck {
  static from(logger: Logger, httpClient: HttpClient) {
    return new HealthCheck(logger, httpClient)
  }

  constructor(private readonly logger: Logger, private readonly httpClient: HttpClient) {}

  /**
   * Checks connection with health check url, throws error if unable to connect.
   */
  async url(url: string): Promise<void> {
    const success = await this.httpClient.run(url).then(response => response.ok)

    if (!success) {
      throw new Error(`Unable to connect to health check url: ${url}`)
    }

    this.logger.info(`✓ Connected to health check url: ${url}`)
  }
}
