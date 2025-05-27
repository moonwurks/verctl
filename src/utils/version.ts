import fs from "fs"
import { readJSON } from "./writer"
import { getRootPackage, PackageJson, PackageLockJson } from "./common"

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

export function extractVersionToStore(pkgPath: string): void {
	if (!fs.existsSync(pkgPath)) {
		console.error(`✖ package.json not found at: ${pkgPath}`)
		process.exit(1)
	}

	const pkgRaw = fs.readFileSync(pkgPath, 'utf-8')
	const pkgJson = JSON.parse(pkgRaw)

	if (!pkgJson.version) {
		console.error('✖ No version found in package.json to extract.')
		process.exit(1)
	}

	const version = pkgJson.version
	fs.writeFileSync(VERSION_STORE_FILE, JSON.stringify({ version }, null, 2))
	delete pkgJson.version
	fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2))

	console.log(`✔ Version ${version} extracted and stored in ${VERSION_STORE_FILE}`)
}

export function restoreVersionFromStore(pkgPath: string): void {
	if (!fs.existsSync(VERSION_STORE_FILE)) {
		console.error(`✖ ${VERSION_STORE_FILE} not found.`)
		process.exit(1)
	}

	const storeRaw = fs.readFileSync(VERSION_STORE_FILE, 'utf-8')
	const storeJson = JSON.parse(storeRaw)

	if (!storeJson.version) {
		console.error(`✖ No version found in ${VERSION_STORE_FILE}.`)
		process.exit(1)
	}

	const version = storeJson.version

	const pkgRaw = fs.readFileSync(pkgPath, 'utf-8')
	const pkgJson = JSON.parse(pkgRaw)
	pkgJson.version = version

	fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2))
	console.log(`✔ Version ${version} restored to package.json`)
}
