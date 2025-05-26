import fs from 'fs'
import path from 'path'

interface InjectOptions {
  target: string
  ext?: string
  version: string
  dryRun?: boolean
}

const assetPattern = /<(script|link)([^>]+?)(src|href)=["']([^"']+)["']([^>]*)>/gi

function getTargetFiles(dirPath: string, ext: string): string[] {
	const result: string[] = []

	function walk(current: string) {
		const entries = fs.readdirSync(current, { withFileTypes: true })
		for (const entry of entries) {
			const fullPath = path.join(current, entry.name)
			if (entry.isDirectory()) {
				walk(fullPath)
			} else if (entry.isFile() && fullPath.endsWith(`.${ext}`)) {
				result.push(fullPath)
			}
		}
	}

	walk(dirPath)
	return result
}

export async function injectVersionInAssets({ target, version, ext = 'html', dryRun = false }: InjectOptions): Promise<void> {
	let targetFiles: string[] = []

	if (!fs.existsSync(target)) {
		console.error(`Target does not exist: ${target}`)
		return
	}

	const stat = fs.statSync(target)
	if (stat.isDirectory()) {
		targetFiles = getTargetFiles(target, ext)
	} else if (stat.isFile() && target.endsWith(`.${ext}`)) {
		targetFiles = [target]
	} else {
		console.error(`Target is not a file with extension .${ext}: ${target}`)
		return
	}

	for (const filePath of targetFiles) {
		const originalContent = fs.readFileSync(filePath, 'utf8')
		const modifiedContent = originalContent.replace(assetPattern, (match, tag, before, attr, url, after) => {
			let newUrl = url

			if (url.includes('v=')) {
				newUrl = url.replace(/([?&])v=[^&]*/, `$1v=${version}`)
			} else {
				const hasQuery = url.includes('?')
				const hasTrailingQuestion = url.endsWith('?')
				const separator = hasQuery && !hasTrailingQuestion ? '&' : '?'
				newUrl = `${url.replace(/\?$/, '')}${separator}v=${version}`
			}

			return `<${tag}${before}${attr}="${newUrl}"${after}>`
		})

		if (originalContent !== modifiedContent) {
			if (dryRun) {
				console.log(`(dry-run) Would inject version into: ${filePath}`)
			} else {
				fs.writeFileSync(filePath, modifiedContent, 'utf8')
				console.log(`✔ Version injected: ${filePath}`)
			}
		}
	}
}
