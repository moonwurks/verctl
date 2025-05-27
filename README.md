# verctl

**verctl (Version Controller)**
is a CLI tool for managing version numbers in package.json, generating git tags, and injecting version information into HTML and other static assets for cache busting.

## Features

- Bump `package.json` version (major, minor, patch)
- Set version explicitly (e.g. `verctl 1.2.3`)
- Extract version of `package.json` into a file
- Restore version from the file back to `package.json`
- Inject version into `.html`, `.php`, `.jsp` or other files for cache busting
- Create git commit and tag with customizable messages
- Dry-run mode to simulate changes
- Supports prerelease suffixes and base version override
- Remove version field completely

## Installation

```bash
npm install -g verctl
```

Or clone the repository and run it locally:

```bash
git clone https://github.com/yourname/verctl.git
cd verctl
npm install
npm run start <command>
```

## Usage

```bash
verctl <command|x.y.z> [options]
```

### Commands

- `major`    – Bump major version (e.g. 1.2.3 → 2.0.0)
- `minor`    – Bump minor version (e.g. 1.2.3 → 1.3.0)
- `patch`    – Bump patch version (e.g. 1.2.3 → 1.2.4)
- `x.y.z`    – Set version explicitly
- `remove`   – Remove the `version` field from `package.json`
- `extract`  – Extract version of `package.json` into a file (`.verctl-version.json`)
- `restore`  – Restore version from the hidden file back to `package.json`
- `html`     – Inject version string into HTML assets
- `help`     – Show help
- `version`  – Show verctl version

### Options

- `-h`, `--help` – Display this help message
- `-d`, `--dry` – Show what would change without writing to disk
- `-t`, `--tag` – Git: Create a git commit and tag
- `-a`, `--all` – Git: Add all files when tagging
- `-c`, `--command` – Git: Run a command before commit/tag
- `-m`, `--message` – Git: Custom tag and commit message (`%v` to print version)
- `-g`, `--gitless` – Git: skip git tagging
- `-b`, `--base` – Base version override (default: `0.0.0` if not set)
- `-p`, `--prerelease` – Append a pre-release suffix (e.g. `beta.1`)
- `-f`, `--file <path>` – Custom location / name of `package.json`
- `-s`, `--source <path>` – Source directory or file path for version injection
- `-e`, `--ext <ext>` – File extension to filter for injection (default: `html`)
- `-r`, `--replace` – Regex-based replacement in files (future dev)
- `-v`, `--version` – Show verctl version

## Command Reference

### `CMD major` – bump major version
Use this when you're introducing breaking changes. It bumps the major version in `package.json` (e.g. 1.2.3 → 2.0.0), and resets minor and patch to zero.
```bash
$ verctl major
```


### `CMD minor` – bump minor version
Use this when you're adding new features in a backward-compatible manner. It bumps the minor version in `package.json` (e.g. 2.7.6 → 2.8.0) and resets the patch version to zero.
```bash
$ verctl minor
```


### `CMD patch` – bump patch version
Recommended for bug fixes that don’t affect existing APIs. It bumps the patch version in `package.json` (e.g. 1.2.3 → 1.2.4), leaving major and minor versions unchanged.
```bash
$ verctl patch
```

### `CMD x.y.z` – set version explicitly
Use this to set an exact version manually. This bypasses semantic versioning increments and writes the given value directly into `package.json`.
```bash
$ verctl 2.5.7
```


### `CMD remove` – remove version field from package.json
Useful if you want to remove the `version` field entirely, such as in libraries or templates that shouldn't track version numbers internally.
```bash
$ verctl remove
```

### `CMD extract` – extract version from package.json

Moves the current version from `package.json` into a `.verctl-version.json` file and removes the version field from `package.json`.

Useful for keeping version metadata separate from the manifest file.

```bash
$ verctl extract
```

### `CMD restore` – restore version to package.json

Restores the version from `.verctl-version.json` back into `package.json`. Use this after extracting the version or when preparing a release.

```bash
$ verctl restore
```

### `CMD html` – inject version string into HTML assets
Use this to append the current version to asset references in files like `.html`, `.php`, or `.js` for cache busting during deployment.

By default, it injects into `.html` files:
```bash
$ verctl html -s ./html
```

To change the target file extension:
```bash
$ verctl html -s ./html -e ejs
```

To inject into a single file directly:
```bash
$ verctl html -s ./html/index.html
```

### `ARG --dry` – the dry-run
Use the --dry option to simulate what would happen without modifying any files or committing changes. Helpful for verifying the outcome before execution.
```bash
$ verctl patch --dry
```

### `ARG --tag` – create git tag
Use the `--tag` or `-t` option to automatically create a git commit and tag. This can be combined with `major`, `minor`, `patch`, or an explicit version (e.g. `2.5.7`).
```bash
$ verctl major -t
```

### `ARG --all` – add all files for commit
Use this to stage all modified files before committing the version bump. Useful when you want git to include related changes alongside the version update.
```bash
$ verctl patch -a -t
```

### `ARG --command <cmd>` – run command before tag
Runs a shell command after bumping the version but before creating the git tag. Ideal for generating changelogs, building artifacts, etc.
```bash
$ verctl patch -c "npm run changelog"
```

### `ARG --message <msg>` – custom tag and commit message
Overrides the default Git tag and commit message. You can use placeholders like `%v` to inject the version.
```bash
$ verctl minor -m "Release version %v"
```

### `ARG --gitless` – skip git tagging
Skips Git operations entirely. This is useful in environments where git is not initialized or when versioning is needed without version control integration.
```bash
$ verctl patch --gitless
```

### `ARG --base <version>` – override base version
Overrides the detected current version. Use this when `package.json` is missing a version or you want to start from a specific version baseline.
```bash
$ verctl patch -b 1.0.0
```

### `ARG --prerelease` – add prerelease suffix
Appends a prerelease label to the version string (e.g. `1.2.3-beta.1`). Helpful for publishing development or testing builds.
```bash
$ verctl major -p beta.1
```

### `ARG --file <path>` – path to custom package.json
Specifies a custom file path for the package.json to read from and write to. This is useful when your package.json is located in a non-standard location or if you want to apply versioning to a different manifest file.
```bash
$ verctl patch --file ./libs/custom-lib/custom-package.json
```

### `ARG --source <path>` – path (file/directory) as an inject source
Specifies the path for version injection. Can point to a single file or a folder.
```bash
$ verctl patch -s ./packages/core/package.json
```

### `ARG --ext <ext>` – file extension(s) to search
Defines which file extensions should be targeted during version injection. Defaults to `.html`.
```bash
$ verctl inject -f ./views -e ejs
```

### `ARG --replace` – regex-based replacement (not yet supported)

Performs a regex-based search and replaces matches with the current version string. The format is a single regex pattern, and all matches will be replaced by the computed version.
```bash
$ verctl inject --replace 'v=\\d+\\.\\d+\\.\\d+'
```

## License

[MIT](https://opensource.org/licenses/MIT)
