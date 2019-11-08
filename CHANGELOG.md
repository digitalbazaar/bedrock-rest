# bedrock-rest ChangeLog

## 3.0.0 - 2019-11-08

### Added
- eslint support.

### Changed
- **BREAKING**: `makeResourceHandler` options changed.
  - No longer takes template related options in favor of routing to next
    middleware.
  - Added `json` option to turn on/off JSON processing or route to next
    middleware.
  - Added `html` option to turn off HTML processing or route to next
    middleware.
- Code modernization and improvements.
- Reuse `makeResourceHandler` for `linkedDataHandler` implementation.

### Removed
- `bedrock-views` dependency due to no longer needing view vars feature.

## 2.1.3 - 2019-03-26

### Changed
- Update bedrock-validation peer dependency.

## 2.1.2 - 2018-09-20

### Fixed
- Fix typo in peer dependencies.

## 2.1.1 - 2018-09-20

### Changed
- Update bedrock-validation peer dependency.

## 2.1.0 - 2017-06-27

### Changed
- Update `bedrock-views` dependency from 4.x to 5.x.

## 2.0.2 - 2016-09-28

### Fixed
- If `application/ld+json`, `application/json` are not preferred
  over `text/html` return false from `prefers`.

## 2.0.1 - 2016-03-15

### Changed
- Update bedrock dependencies.

## 2.0.0 - 2016-03-03

### Changed
- Update package dependencies for npm v3 compatibility.

## 1.1.0 - 2015-11-16

### Added
- Add `when` middleware.

## 1.0.1 - 2015-05-07

## 1.0.0 - 2015-04-08

## 0.1.0 (up to early 2015)

- See git history for changes.
