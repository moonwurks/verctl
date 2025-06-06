import fs from 'fs'
import { readJSON } from './writer'
import { getRootPackage, PackageJson, PackageLockJson } from './common'
import path from 'path'

export type VersionParts = [number, number, number]

export function isValidSemver(version: string | undefined): boolean {
	return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(version || '')
}

export function parseVersion(version: string): VersionParts {
	const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
	if (!match) {
		throw new Error(`Invalid version: ${version}`)
	}
	return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
}

export function bumpVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
	const base = version.split('-')[0]
	const [major, minor, patch] = parseVersion(base)

	switch (type) {
	case 'major':
		return `${major + 1}.0.0`
	case 'minor':
		return `${major}.${minor + 1}.0`
	case 'patch':
		return `${major}.${minor}.${patch + 1}`
	}
}

export function applyPrerelease(version: string, suffix?: string | null): string {
	return suffix ? `${version}-${suffix}` : version
}

export async function removeVersion(
	pkg: PackageJson,
	lockPath: string,
	dryRun: boolean
): Promise<{ updatedPkg: PackageJson; updatedLock?: PackageLockJson }> {
	let updatedLock: PackageLockJson | undefined

	if ('version' in pkg) {
		if (dryRun) {
			console.log('(dry-run) Would remove version from package.json')
		} else {
			delete pkg.version
			console.log('✔ Removed version from package.json')
		}
	} else {
		console.log('ℹ No version field in package.json')
	}

	if (fs.existsSync(lockPath)) {
		const lock = readJSON<PackageLockJson>(lockPath)
		if (dryRun) {
			console.log('(dry-run) Would remove version from package-lock.json')
		} else {
			if ('version' in lock) {
				delete lock.version
			}
			const rootPackage = getRootPackage(lock)
			if (rootPackage?.version) {
				delete rootPackage.version
			}
			console.log('✔ Removed version from package-lock.json')
			updatedLock = lock
		}
	} else {
		console.log(`${dryRun ? '(dry-run)' : 'ℹ'} package-lock.json not found. Skipped.`)
	}

	return {
		updatedPkg: pkg,
		updatedLock
	}
}

const VERSION_STORE_FILE = '.verctl-version.json'

export function extractVersionToStore(
	pkgPath: string,
	dryRun = false
): { extracted?: string; updatedPkg?: PackageJson; storePath: string; error?: string } {
	if (!fs.existsSync(pkgPath)) {
		return { error: `package.json not found at: ${pkgPath}`, storePath: '' }
	}

	const pkgRaw = fs.readFileSync(pkgPath, 'utf-8')
	const pkgJson: PackageJson = JSON.parse(pkgRaw)

	if (!pkgJson.version) {
		return { error: 'No version found in package.json to extract.', storePath: '' }
	}

	const version = pkgJson.version
	const versionFilePath = path.join(path.dirname(pkgPath), VERSION_STORE_FILE)

	if (dryRun) {
		console.log(`(dry-run) Would extract version ${version} and write to ${versionFilePath}`)
		console.log('(dry-run) Would remove version from package.json')
		return { extracted: version, updatedPkg: pkgJson, storePath: versionFilePath }
	}

	fs.writeFileSync(versionFilePath, JSON.stringify({ version }, null, 2))
	delete pkgJson.version
	fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2))
	console.log(`✔ Version ${version} extracted and stored in ${versionFilePath}`)

	return { extracted: version, updatedPkg: pkgJson, storePath: versionFilePath }
}

export function restoreVersionFromStore(
	pkgPath: string,
	dryRun = false
): { restored?: string; updatedPkg?: PackageJson; storePath: string; error?: string } {
	const versionFilePath = path.join(path.dirname(pkgPath), VERSION_STORE_FILE)

	if (!fs.existsSync(versionFilePath)) {
		return { error: `${VERSION_STORE_FILE} not found at: ${versionFilePath}`, storePath: versionFilePath }
	}

	const storeRaw = fs.readFileSync(versionFilePath, 'utf-8')
	const storeJson = JSON.parse(storeRaw)

	if (!storeJson.version) {
		return { error: `No version found in ${VERSION_STORE_FILE}.`, storePath: versionFilePath }
	}

	const version = storeJson.version

	const pkgRaw = fs.readFileSync(pkgPath, 'utf-8')
	const pkgJson: PackageJson = JSON.parse(pkgRaw)

	// Reconstruct object to place "version" after "name" if "name" exists, or on top
	const finalPkg: PackageJson = {}

	if ('name' in pkgJson) {
		finalPkg.name = pkgJson.name
		finalPkg.version = version
		for (const [key, value] of Object.entries(pkgJson)) {
			if (key !== 'name' && key !== 'version') {
				finalPkg[key] = value
			}
		}
	} else {
		finalPkg.version = version
		for (const [key, value] of Object.entries(pkgJson)) {
			if (key !== 'version') {
				finalPkg[key] = value
			}
		}
	}

	if (dryRun) {
		console.log(`(dry-run) Would restore version ${version} into package.json`)
	} else {
		fs.writeFileSync(pkgPath, JSON.stringify(finalPkg, null, 2))
		console.log(`✔ Version ${version} restored to package.json`)
	}

	return {
		restored: version,
		updatedPkg: finalPkg,
		storePath: versionFilePath
	}
}
