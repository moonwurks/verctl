import { parse } from 'editorconfig'
import fs from 'fs'

export async function writeJSON(filePath: string, data: unknown, dryRun = false): Promise<void> {
	const original = fs.existsSync(filePath)
		? JSON.parse(fs.readFileSync(filePath, 'utf8'))
		: {}

	let indent = '  ' // default 2 spaces
	try {
		const ec = await parse(filePath)
		indent = ec.indent_style === 'tab' ? '\t' : ' '.repeat(Number(ec.indent_size || 2))
	} catch {
		// fallback to default
	}

	const content = JSON.stringify(data, null, indent)

	if (dryRun) {
		console.log(`(dry-run) Would write to ${filePath}:`)
	} else {
		fs.writeFileSync(filePath, content + '\n')
		console.log(`✔ Wrote ${filePath}`)
	}
}

export function readJSON<T>(path: string): T {
	return JSON.parse(fs.readFileSync(path, 'utf8'))
}
