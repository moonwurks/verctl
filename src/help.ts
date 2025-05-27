export function showUsage(): void {
	console.log(`
Usage:
  verctl <command|x.y.z> [options]

Commands:
  major        Bump major version (2.5.8 → 3.0.0)
  minor        Bump minor version (2.5.8 → 2.6.0)
  patch        Bump patch version (2.5.8 → 2.5.9)
  x.y.z        Set version explicitly (e.g. 1.2.3)
  remove       Completely delete version field from package.json (and lockfile)
  current      Show version from package.json
  html         Append ?v=VERSION to src/href in <script> and <link> tags within files in a target
  extract      Move version from package.json to a hidden .verctl-version.json
  restore      Restore version from .verctl-version.json back to package.json
  help         Show this help message
  version      Show verctl version

Options:
  -h, --help          Display this help message
  -d, --dry           Show what would change without writing to disk
  -t, --tag           Git: Create a Git commit and tag
  -a, --all           Git: Add all files when tagging
  -c, --command       Git: Run a command before commit/tag
  -m, --message       Git: Custom tag and commit message (%v to print version)
  -b, --base          Base version override (default: 0.0.0 if not set)
  -f, --file <path>   Custom location / name of package.json
  -s, --source <path> Source directory or file path for version injection
  -e, --ext <ext>     File extension to filter for injection (default: html)
  -r, --replace       Regex-based replacement in files (future dev)
  -p, --prerelease    Append a pre-release suffix (e.g. beta.1)
  -v, --version       Show verctl version

Examples:
  verctl minor -t
  verctl 2.6.0 --dry
  verctl remove
`)
}
