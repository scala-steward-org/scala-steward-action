import fs from 'fs'

import fetch from 'node-fetch'
import * as core from '@actions/core'
import {type Logger} from './logger'

export class Check {
  static from(logger: Logger) {
    return new Check(logger)
  }

  constructor(private readonly logger: Logger) {}

  /**
   * Checks connection with Maven Central, throws error if unable to connect.
   */
  async mavenCentral(): Promise<void> {
    const response = await fetch('https://repo1.maven.org/maven2/')

    if (!response.ok) {
      throw new Error('Unable to connect to Maven Central')
    }

    this.logger.info('✓ Connected to Maven Central')
  }
}
