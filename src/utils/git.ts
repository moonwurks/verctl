import { execSync } from 'child_process'
import fs from 'fs'

export function resolveFilesToAdd(lockPath?: string, useAll = false, dryRun = false): string {
	if (useAll) return '.'

	const files = ['package.json']
	if (lockPath && fs.existsSync(lockPath)) {
		try {
			const output = execSync(`git check-ignore ${lockPath}`, { stdio: ['ignore', 'pipe', 'ignore'] })
				.toString()
				.trim()
			if (output === lockPath) {
				if (dryRun) {
					console.warn(`(dry-run) Skipping ignored file: ${lockPath}`)
				} else {
					console.warn(`⚠ Skipping ignored file: ${lockPath}`)
				}
				return files.join(' ')
			}
		} catch {
			// Not ignored
			files.push(lockPath)
		}
	}
	return files.join(' ')
}

export function formatCommitMessage(version: string, customMsg?: string): string {
	return customMsg ? customMsg.replace(/%v/g, version) : `Bump version to ${version}`
}

export function tagVersion(version: string, lockPath?: string, dryRun = false, useAll = false, customMsg?: string): boolean {
	const filesToAdd = resolveFilesToAdd(lockPath, useAll, dryRun)
	const message = formatCommitMessage(version, customMsg)

	if (dryRun) {
		console.log(`(dry-run) Would run: git add ${filesToAdd}`)
		console.log(`(dry-run) Would run: git commit -m "${message}"`)
		console.log(`(dry-run) Would run: git tag -a v${version} -m "${message}"`)
		return true
	}

	try {
		const existingTags = execSync('git tag', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n')
		if (existingTags.includes(`v${version}`)) {
			console.warn(`⚠ Tag v${version} already exists. Skipping tag creation.`)
			return false
		}

		execSync(`git add ${filesToAdd}`)
		execSync(`git commit -m "${message}"`)
		execSync(`git tag -a "v${version}" -m "${message}"`)
		console.log(`✔ Git commit and tag created: v${version}`)
		console.log(`✔ Commit message: ${message}`)
		return true
	} catch (e) {
		console.error('✖ Failed to create Git commit or tag.')
		console.error(e)
		return false
	}
}

export function commitVersion(version: string, lockPath?: string, dryRun = false, useAll = false, customMsg?: string): boolean {
	const filesToAdd = resolveFilesToAdd(lockPath, useAll, dryRun)
	const message = formatCommitMessage(version, customMsg)

	if (dryRun) {
		console.log(`(dry-run) Would run: git add ${filesToAdd}`)
		console.log(`(dry-run) Would run: git commit -m "${message}"`)
		return true
	}

	try {
		execSync(`git add ${filesToAdd}`)
		execSync(`git commit -m "${message}"`)
		console.log(`✔ Git commit created for version ${version}`)
		return true
	} catch (e) {
		console.error('✖ Failed to create Git commit.')
		console.error(e)
		return false
	}
}
