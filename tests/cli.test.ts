import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import execa from 'execa'
import path from 'path'
import fs from 'fs-extra'
import fsp from 'fs/promises'
import { flagAliases } from '../src/utils/command'

let cli: string
const customDist = path.resolve(__dirname, 'custom-dist')

beforeAll(async () => {
	if (fs.existsSync(customDist)) fs.rmSync(customDist, { recursive: true })
	fs.mkdirSync(customDist, { recursive: true })

	// Symlink or copy required components
	fs.symlinkSync(path.resolve(__dirname, '../dist'), path.join(customDist, 'dist'), 'dir')
	fs.symlinkSync(path.resolve(__dirname, '../node_modules'), path.join(customDist, 'node_modules'), 'dir')

	// Copy custom package.json
	fs.copyFileSync(
		path.resolve(__dirname, 'mock', 'custom-package.json'),
		path.join(customDist, 'package.json')
	)

	// Copy mock test assets
	fs.copySync(path.resolve(__dirname, 'mock'), path.join(customDist, 'mock'))

	// Copy custom package json for specific tests
	fs.copyFileSync(
		path.resolve(__dirname, 'mock', 'custom-package.json'),
		path.join(customDist, 'custom-package.json')
	)

	cli = path.resolve(customDist, 'dist/main.js')

	// Initialize a fresh Git repository
	const gitDir = customDist
	if (!fs.existsSync(path.join(gitDir, '.git'))) {
		await execa('git', ['init'], { cwd: gitDir })
		await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: gitDir })
		await execa('git', ['config', 'user.name', 'test'], { cwd: gitDir })
		await execa('git', ['add', '.'], { cwd: gitDir })
		await execa('git', ['commit', '-m', 'init'], { cwd: gitDir })
	}
})

afterAll(() => {
	fs.rmSync(customDist, { recursive: true, force: true })
})

describe('common functions', () => {
	it('handles --message with %v placeholder for custom commit', async () => {
		const version = '7.7.7'
		const { stdout, stderr } = await execa('node', [cli, version, '--tag', '--message', 'Release %v'], { cwd: customDist, reject: false })
		console.log(stderr)
		expect(stdout).toContain('✔ Git commit and tag created: v7.7.7')
		expect(stdout).toContain('✔ Commit message: Release 7.7.7')
	})

	it('shows help with --help', async () => {
		const { stdout } = await execa('node', [cli, '--help'], { cwd: customDist, reject: false })
		expect(stdout).toContain('Usage:')
		expect(stdout).toContain('Commands:')
	})

	it('shows verctl CLI version with --version', async () => {
		const { stdout } = await execa('node', [cli, '--version'], { cwd: customDist, reject: false })
		expect(stdout).toContain('verctl')
		expect(stdout).toMatch(/v\d+\.\d+\.\d+(-.+)?/)
	})

	it('shows current version from package.json with "current"', async () => {
		const { stdout } = await execa('node', [cli, 'current'], { cwd: customDist, reject: false })
		expect(stdout).toMatch(/^\d+\.\d+\.\d+(-.+)?$/)
	})

	it('reads version from a custom package file with --file', async () => {
		const { stdout } = await execa('node', [cli, 'current', '--file', path.resolve(customDist, 'custom-package.json')], { cwd: customDist, reject: false })
		expect(stdout).toBe('4.5.6')
	})

	it('errors if --file points to a non-JSON file', async () => {
		const invalidPkgPath = path.resolve(customDist, 'mock/test.html')
		const { stderr, exitCode } = await execa('node', [cli, 'current', '--file', invalidPkgPath], { cwd: customDist, reject: false })
		expect(stderr).toContain('Target file is not a valid UTF-8 encoded JSON file')
		expect(exitCode).not.toBe(0)
	})

	it('errors if --file points to a non existing file', async () => {
		const invalidPkgPath = path.resolve(customDist, 'non-existing-file.json')
		const { stderr, exitCode } = await execa('node', [cli, 'current', '--file', invalidPkgPath], { cwd: customDist, reject: false })
		expect(stderr).toContain(`File not found: ${customDist}/non-existing-file.json`)
		expect(exitCode).not.toBe(0)
	})

	it('shows verctl CLI version with command "version"', async () => {
		const { stdout } = await execa('node', [cli, 'version'], { cwd: customDist, reject: false })
		expect(stdout).toContain('verctl')
		expect(stdout).toContain('Author:')
		expect(stdout).toMatch(/v\d+\.\d+\.\d+/)
	})

	it('returns error on unknown command', async () => {
		const { stderr, exitCode } = await execa('node', [cli, 'unknown'], { cwd: customDist, reject: false })
		expect(stderr).toContain('Unknown command: "unknown"')
		expect(exitCode).not.toBe(0)
	})

	it('handles major command', async () => {
		const { stdout } = await execa('node', [cli, 'major'], { cwd: customDist, reject: false })
		expect(stdout).toMatch(/version updated:.*→ \d+\.0\.0/)
	})

	it('handles minor command', async () => {
		const { stdout } = await execa('node', [cli, 'minor'], { cwd: customDist, reject: false })
		expect(stdout).toMatch(/version updated:.*→ \d+\.\d+\.0/)
	})

	it('handles patch command', async () => {
		const { stdout } = await execa('node', [cli, 'patch'], { cwd: customDist, reject: false })
		expect(stdout).toMatch(/version updated:.*→ \d+\.\d+\.\d+/)
	})

	it('handles remove command', async () => {
		const { stdout } = await execa('node', [cli, 'remove'], { cwd: customDist, reject: false })
		expect(stdout).toContain('Removed version from package.json')
	})

	it('handles explicit version set', async () => {
		const { stdout } = await execa('node', [cli, '0.0.0'], { cwd: customDist, reject: false })
		expect(stdout).toContain('version updated:')
		expect(stdout).toContain('→ 0.0.0')
	})

	it('errors on unknown flag', async () => {
		const { stderr, exitCode } = await execa('node', [cli, '--invalid'], { cwd: customDist, reject: false })
		expect(stderr).toContain('Unknown argument: --invalid')
		expect(exitCode).not.toBe(0)
	})

	it('errors on duplicate flag', async () => {
		const { stderr, exitCode } = await execa('node', [cli, 'patch', '--base', '-t', '--base'], { cwd: customDist, reject: false })
		expect(stderr).toContain('Duplicate argument: --base')
		expect(exitCode).not.toBe(0)
	})

	it('errors on duplicate flag with alias', async () => {
		const { stderr, exitCode } = await execa('node', [cli, 'patch', '--tag', '-t'], { cwd: customDist, reject: false })
		expect(stderr).toContain('Duplicate argument: --tag')
		expect(exitCode).not.toBe(0)
	})

	it('errors on invalid command', async () => {
		const { stderr, exitCode } = await execa('node', [cli, 'not-a-command'], { cwd: customDist, reject: false })
		expect(stderr).toContain('Unknown command: "not-a-command"')
		expect(exitCode).not.toBe(0)
	})

	it('handles --tag (creates git tag)', async () => {
		const { stdout } = await execa('node', [cli, 'patch', '--tag'], { cwd: customDist, reject: false })
		expect(stdout).toContain('version updated:')
	})

	it('handles --prerelease with value', async () => {
		const { stdout } = await execa('node', [cli, 'minor', '--prerelease', 'beta.1'], { cwd: customDist, reject: false })
		expect(stdout).toMatch(/→ \d+\.\d+\.0-beta\.1/)
	})

	it('errors on --prerelease without a value', async () => {
		const { stderr, exitCode } = await execa('node', [cli, 'minor', '--prerelease'], { cwd: customDist, reject: false })
		expect(stderr).toContain('Missing value for argument: --prerelease')
		expect(exitCode).not.toBe(0)
	})

	it('handles --all with --tag (adds all files)', async () => {
		const { stdout } = await execa('node', [cli, 'patch', '--tag', '--all'], { cwd: customDist, reject: false })
		expect(stdout).toContain('version updated:')
	})

	it('handles --gitless (skips tag output)', async () => {
		const { stdout } = await execa('node', [cli, 'patch', '--gitless', '--tag'], { cwd: customDist, reject: false })
		expect(stdout).not.toContain('Git commit and tag created')
	})

	it('handles --base version override', async () => {
		const { stdout } = await execa('node', [cli, 'minor', '--base', '1.0.0'], { cwd: customDist, reject: false })
		expect(stdout).toContain('✔ Base version overridden: 1.0.0')
	})

	it('handles --command execution before tag', async () => {
		const { stdout } = await execa('node', [cli, 'patch', '--command', 'echo OK', '--tag'], { cwd: customDist, reject: false })
		expect(stdout).toContain('✔ Running pre-tag command: echo OK')
	})

	it('handles --message for custom commit message', async () => {
		const { stdout } = await execa('node', [cli, 'patch', '--message', 'Release X', '--tag'], { cwd: customDist, reject: false })
		expect(stdout).toContain('version updated:')
	})

	it('handles --dry (no actual file changes)', async () => {
		const { stdout } = await execa('node', [cli, 'patch', '--dry'], { cwd: customDist, reject: false })
		expect(stdout).toContain('(dry-run) Would write')
		expect(stdout).toContain('version would be updated')
	})

	it('errors when trying to tag an already existing Git tag', async () => {
		const version = '9.9.9'
		await execa('node', [cli, version, '-t'], { cwd: customDist, reject: false })
		const { stderr, exitCode } = await execa('node', [cli, version, '--tag'], { cwd: customDist, reject: false })
		expect(stderr).toContain('Tag v9.9.9 already exists')
		expect(exitCode).not.toBe(0)
	})

	it('shows help with "help" command', async () => {
		const { stdout } = await execa('node', [cli, 'help'], { cwd: customDist, reject: false })
		expect(stdout).toContain('Usage:')
		expect(stdout).toContain('Commands:')
	})

	it('dry-run: extract should not change package.json or create version file', async () => {
		const versionStore = path.resolve(customDist, '.verctl-version.json')
		const pkgPath = path.resolve(customDist, 'package.json')

		const originalPkg = await fsp.readFile(pkgPath, 'utf8')

		const { stdout } = await execa('node', [cli, 'extract', '--dry'], { cwd: customDist, reject: false })
		expect(stdout).toContain('(dry-run) Would extract version')
		expect(stdout).toContain('(dry-run) Would remove version')

		const currentPkg = await fsp.readFile(pkgPath, 'utf8')
		expect(currentPkg).toBe(originalPkg)
		expect(fs.existsSync(versionStore)).toBe(false)
	})

	it('extracts version to .verctl-version.json and removes from package.json', async () => {
		const versionStore = path.resolve(customDist, '.verctl-version.json')
		const pkgPath = path.resolve(customDist, 'package.json')

		const { stdout } = await execa('node', [cli, 'extract'], { cwd: customDist, reject: false })
		expect(stdout).toContain('✔ Version')

		const stored = JSON.parse(await fsp.readFile(versionStore, 'utf8'))
		expect(stored.version).toMatch(/^\d+\.\d+\.\d+(-.+)?$/)

		const pkgJson = JSON.parse(await fsp.readFile(pkgPath, 'utf8'))
		expect(pkgJson.version).toBeUndefined()
	})

	it('restores version from .verctl-version.json to package.json', async () => {
		const versionStore = path.resolve(customDist, '.verctl-version.json')
		const pkgPath = path.resolve(customDist, 'package.json')

		const stored = JSON.parse(await fsp.readFile(versionStore, 'utf8'))

		const { stdout } = await execa('node', [cli, 'restore'], { cwd: customDist, reject: false })
		expect(stdout).toContain(`✔ Version ${stored.version} restored to package.json`)

		const pkgJson = JSON.parse(await fsp.readFile(pkgPath, 'utf8'))
		expect(pkgJson.version).toBe(stored.version)
	})

	it('dry-run: restore should not change package.json', async () => {
		const versionStore = path.resolve(customDist, '.verctl-version.json')
		const pkgPath = path.resolve(customDist, 'package.json')

		const stored = JSON.parse(await fsp.readFile(versionStore, 'utf8'))
		const originalPkg = await fsp.readFile(pkgPath, 'utf8')

		const { stdout } = await execa('node', [cli, 'restore', '--dry'], { cwd: customDist, reject: false })
		expect(stdout).toContain(`(dry-run) Would restore version ${stored.version}`)

		const currentPkg = await fsp.readFile(pkgPath, 'utf8')
		expect(currentPkg).toBe(originalPkg)
	})
})

describe('verctl CLI inject', () => {
	const version = '1.2.3'

	it('injects version to html', async () => {
		await execa('node', [cli, version], { cwd: customDist, reject: false })
		const htmlPath = path.resolve(customDist, 'mock')
		await execa('node', [cli, 'html', '-s', htmlPath], { cwd: customDist, reject: false })

		const mainContents = await fsp.readFile(path.join(htmlPath, 'test.html'), 'utf8')
		expect(mainContents).toMatch(/\.js.*[?&]v=1\.2\.3/)
		expect(mainContents).toMatch(/\.css\?v=1\.2\.3/)

		const nestedContents = await fsp.readFile(path.join(htmlPath, 'dir1', 'test.html'), 'utf8')
		expect(nestedContents).toMatch(/\.js.*[?&]v=1\.2\.3/)
		expect(nestedContents).toMatch(/\.css\?v=1\.2\.3/)
	})

	it('injects version into CJS assets with --ext', async () => {
		await execa('node', [cli, version], { cwd: customDist, reject: false })
		const htmlPath = path.resolve(customDist, 'mock')
		await execa('node', [cli, 'html', '-s', htmlPath, '--ext', 'ejs'], { cwd: customDist, reject: false })

		const cjsContents = await fsp.readFile(path.join(htmlPath, 'dir1', 'test.ejs'), 'utf8')
		expect(cjsContents).toMatch(/\.js.*[?&]v=1\.2\.3/)
		expect(cjsContents).toMatch(/\.css\?v=1\.2\.3/)
	})
})

describe('validateFlags', () => {
	for (const [shortFlag, longFlag] of Object.entries(flagAliases)) {
		if (shortFlag.startsWith('--')) continue
		it(`throws on duplicate aliases for ${shortFlag} and ${longFlag}`, async () => {
			const { stderr, exitCode } = await execa('node', [cli, 'patch', shortFlag, longFlag], { cwd: customDist, reject: false })
			expect(stderr).toContain(`Duplicate argument: ${longFlag}`)
			expect(exitCode).not.toBe(0)
		})
	}
})
