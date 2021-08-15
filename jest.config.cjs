module.exports = {
  testMatch: ['**/?(*.)+(test).+(ts)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  resolver: 'jest-ts-webcompat-resolver',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};
