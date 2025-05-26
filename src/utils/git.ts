import { execSync } from 'child_process'
import fs from 'fs'

export function tagVersion(version: string, lockPath?: string, dryRun = false, useAll = false, customMsg?: string): boolean {
	let filesToAdd: string
	if (useAll) {
		filesToAdd = '.'
	} else {
		const files = ['package.json']
		if (lockPath && fs.existsSync(lockPath)) {
			let isIgnored = false
			try {
				const output = execSync(`git check-ignore ${lockPath}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
				if (output === lockPath) {
					isIgnored = true
					console.warn(`${dryRun ? '(dry-run)' : '⚠'} Skipping ignored file: ${lockPath}`)
				}
			} catch {
				// not ignored, continue
			}
			if (!isIgnored) files.push(lockPath)
		}
		filesToAdd = files.join(' ')
	}
	const message = (customMsg ? customMsg.replace(/%v/g, version) : `Bump version to ${version}`)

	if (dryRun) {
		console.log(`(dry-run) Would run: git add ${filesToAdd}`)
		console.log(`(dry-run) Would run: git commit -m "${message}"`)
		console.log(`(dry-run) Would run: git tag -a v${version} -m "${message}"`)
		return true
	}

	try {
		const existingTags = execSync('git tag', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n')
		if (existingTags.includes(`v${version}`)) {
			console.warn(`${dryRun ? '(dry-run)' : '⚠'} Tag v${version} already exists. Skipping tag creation.`)
		} else {
			execSync(`git add ${filesToAdd}`)
			execSync(`git commit -m "${message}"`)
			execSync(`git tag -a "v${version}" -m "${message}"`)
			console.log(`✔ Git commit and tag created: v${version}`)
			if(customMsg) {
				console.log(`✔ Commit message: ${message}`)
			}
			return true
		}
	} catch(e) {
		console.error(`✖ Failed to create Git commit or tag.`)
		console.error(e)
		return false
	}

	return true
}
