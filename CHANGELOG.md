# Change Log

## [4.4.0] - 2025-10-29

### Added

- Add fallback URL support via optional `downloadBaseURLFallback` input for improved download reliability

## [4.3.1] - 2025-08-12

### Changed

- #167 [Pinning Action Dependencies for Security and Reliability](https://github.com/Azure/setup-helm/pull/167)
- #181 [Fix types, and update node version.](https://github.com/Azure/setup-helm/pull/181)
- #191 [chore(tests): Mock arch to make tests pass on arm host](https://github.com/Azure/setup-helm/pull/191)
- #192 [chore: remove unnecessary prebuild script](https://github.com/Azure/setup-helm/pull/192)
- #203 [Update helm version retrieval to use JSON output for latest version](https://github.com/Azure/setup-helm/pull/203)
- #207 [ci(workflows): update helm version to v3.18.4 and add matrix for tests](https://github.com/Azure/setup-helm/pull/207)

### Added

- #197 [Add pre-commit hook](https://github.com/Azure/setup-helm/pull/197)

## [4.3.0] - 2025-02-15

- #152 feat: log when restoring from cache
- #157 Dependencies Update
- #137 Add dependabot

## [4.2.0] - 2024-04-15

- #124 Fix OS detection and download OS-native archive extension

## [4.1.0] - 2024-03-01

- #130 switches to use Helm published file to read latest version instead of using GitHub releases

## [4.0.0] - 2024-02-12

- #121 update to node20 as node16 is deprecated
