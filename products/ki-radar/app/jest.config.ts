import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Don't try to transform node_modules
  transformIgnorePatterns: ['/node_modules/'],
  // Only test our __tests__ files
  testMatch: ['**/__tests__/**/*.test.ts'],
}

export default config
