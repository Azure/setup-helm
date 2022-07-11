module.exports = {
   clearMocks: true,
   moduleFileExtensions: ['js', 'ts'],
   testEnvironment: 'node',
   testMatch: ['**/*.test.ts'],
   transform: {
      '^.+\\.ts$': 'ts-jest'
   },
   verbose: true,
   coverageThreshold: {
      global: {
         branches: 0,
         functions: 14,
         lines: 27,
         statements: 27
      }
   }
}
