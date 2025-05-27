#!/usr/bin/env node

import path from 'path'
import fs from 'fs'
import { parseCommand, ParsedArgs } from './utils/command'
import { readJSON, writeJSON } from './utils/writer'
import { bumpVersion, applyPrerelease, isValidSemver, removeVersion } from './utils/version'
import { extractVersionToStore, restoreVersionFromStore } from './utils/version'
import { tagVersion } from './utils/git'
import { showUsage } from './help'
import { execSync } from 'child_process'
import { getRootPackage, PackageJson, PackageLockJson } from './utils/common'
import { injectVersionInAssets } from './utils/injector'

async function main(): Promise<void> {
	const cli: ParsedArgs = parseCommand(process.argv)
	if(cli.error) {
		console.error(cli.error.message)
		console.error('\nType `verctl help` to show the usage.')
		process.exit(1)
	}

	if (cli.showAppVersion) {
		const verctlPkgPath = path.join(__dirname, '..', 'package.json')
		const verctlPkg: Record<string, unknown> = readJSON(verctlPkgPath)
		console.log(`verctl v${verctlPkg.version || 'unknown'} — CLI Package Version Control`)
		console.log('Licensed under the MIT License')
		console.log('Author: Moonwurks <moonwurks@gmail.com>')
		process.exit(0)
	}

	if (cli.showHelp) {
		showUsage()
		process.exit(0)
	}

	const root = process.cwd()
	const pkgPath = path.isAbsolute(cli.pgkPathFile) ? cli.pgkPathFile : path.join(root, cli.pgkPathFile)

	if (!fs.existsSync(pkgPath)) {
		console.error(`✖ Target file not found: ${pkgPath}`)
		process.exit(1)
	}
	try {
		const fileContent = fs.readFileSync(pkgPath, { encoding: 'utf-8' })
		JSON.parse(fileContent)
	} catch {
		console.error(`✖ Target file is not a valid UTF-8 encoded JSON file: ${pkgPath}`)
		process.exit(1)
	}

	const lockPath = path.join(root, 'package-lock.json')
	const pkg = readJSON<PackageJson>(pkgPath)

	if (cli.readCurrentVersion) {
		console.log(pkg.version || 'No version field found in package.json')
		process.exit(0)
	}

	if (cli.cmd === 'extract') {
		extractVersionToStore(pkgPath, cli.dryRun)
		process.exit(0)
	}

	if (cli.cmd === 'restore') {
		restoreVersionFromStore(pkgPath, cli.dryRun)
		process.exit(0)
	}

	if (cli.base) {
		pkg.version = cli.base
		console.log(`✔ Base version overridden: ${cli.base}`)
	}

	if (cli.cmd === 'remove') {
		const { updatedPkg, updatedLock } = await removeVersion(pkg, lockPath, cli.dryRun)
		await writeJSON(pkgPath, updatedPkg, cli.dryRun)
		if (updatedLock) {
			await writeJSON(lockPath, updatedLock, cli.dryRun)
		}

		process.exit(0)
	}

	if (cli.cmd === 'html') {
		if (!cli.source) {
			console.error('✖ --source is required for html command')
			process.exit(1)
		}
		try {
			const param = { target: cli.source, version: pkg.version || '0.0.0', ext: cli.injectExt, dryRun:cli.dryRun }
			await injectVersionInAssets(param)
		} catch (err: unknown) {
			console.error(`✖ Failed to inject version into assets: ${(err as Error).message}`)
			process.exit(1)
		}
		process.exit(0)
	}

	const oldVersion = pkg.version
	if (!isValidSemver(oldVersion)) {
		console.error(`✖ Invalid version in package.json: ${oldVersion}`)
		process.exit(1)
	}

	let newVersion: string
	if (cli.cmd === 'major' || cli.cmd === 'minor' || cli.cmd === 'patch') {
		newVersion = bumpVersion(pkg.version || '0.0.0', cli.cmd)
	} else {
		if(!isValidSemver(cli.cmd)) {
			console.error(`✖ Invalid version input: ${cli.cmd}`)
			process.exit(1)
		}
		newVersion = cli.cmd
	}

	newVersion = applyPrerelease(newVersion, cli.prereleaseValue)
	pkg.version = newVersion
	await writeJSON(pkgPath, pkg, cli.dryRun)

	if (fs.existsSync(lockPath)) {
		const lock = readJSON<PackageLockJson>(lockPath)
		if ('version' in lock) lock.version = newVersion
		const rootPackage = getRootPackage(lock)
		if (rootPackage) rootPackage.version = newVersion
		await writeJSON(lockPath, lock, cli.dryRun)
	} else {
		console.log(`${cli.dryRun ? '(dry-run)' : 'ℹ'} package-lock.json not found. Skipped.`)
	}

	if (cli.dryRun) {
		console.log(`(dry-run) package.json version would be updated: ${oldVersion || 'N/A'} → ${newVersion}`)
	} else {
		console.log(`✔ package.json version updated: ${oldVersion || 'N/A'} → ${newVersion}`)
	}

	if (cli.command) {
		if (cli.dryRun) {
			console.log(`(dry-run) Would run pre-tag command: ${cli.command}`)
		} else {
			try {
				console.log(`✔ Running pre-tag command: ${cli.command}`)
				execSync(cli.command, { stdio: 'inherit' })
			} catch {
				console.error(`✖ Command failed: ${cli.command}`)
				process.exit(1)
			}
		}
	}

	if (!cli.gitless && cli.shouldTag) {
		if (cli.dryRun) {
			console.log(`(dry-run) Would create Git commit and tag for version: ${newVersion}`)
		} else {
			tagVersion(newVersion, lockPath, cli.dryRun, cli.all, cli.message ?? undefined)
			process.exit(1)
		}
	}

}

void main()
