import {type Logger} from '../core/logger'
import {type HttpClient, type RequestOptions} from '../core/http'

export type AuthType = 'bearer' | 'basic'

export type HealthCheckAuth = {
  token: string;
  type: AuthType;
}

export class HealthCheck {
  static from(logger: Logger, httpClient: HttpClient, auth?: HealthCheckAuth) {
    return new HealthCheck(logger, httpClient, auth)
  }

  constructor(
    private readonly logger: Logger,
    private readonly httpClient: HttpClient,
    private readonly auth?: HealthCheckAuth,
  ) {}

  async url(url: string): Promise<void> {
    const options: RequestOptions | undefined = this.auth
      ? {headers: {Authorization: `${this.auth.type === 'basic' ? 'Basic' : 'Bearer'} ${this.auth.token}`}}
      : undefined

    const success = await this.httpClient.run(url, options).then(response => response.ok)

    if (!success) {
      throw new Error(`Unable to connect to health check url: ${url}`)
    }

    this.logger.info(`✓ Connected to health check url: ${url}`)
  }
}
