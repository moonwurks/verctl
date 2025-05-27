import * as fs from 'fs'
import { isValidSemver } from './version'

export const flagAliases: Record<string, string> = {
	'-d': '--dry',
	'--dry': '--dry',
	'-h': '--help',
	'--help': '--help',
	'-v': '--version',
	'--version': '--version',
	'-t': '--tag',
	'--tag': '--tag',
	'-p': '--prerelease',
	'--prerelease': '--prerelease',
	'-a': '--all',
	'--all': '--all',
	'-g': '--gitless',
	'--gitless': '--gitless',
	'-b': '--base',
	'--base': '--base',
	'-c': '--command',
	'--command': '--command',
	'-m': '--message',
	'--message': '--message',
	'-e': '--ext',
	'--ext': '--ext',
	'-s': '--source',
	'--source': '--source',
	'-f': '--file',
	'--file': '--file',
	'-r': '--replace',
	'--replace': '--replace',
}

export class ParsedArgs {
	public cmd = ''
	public source = ''
	public injectExt = 'html'
	public pgkPathFile = 'package.json'
	public dryRun = false
	public showHelp = false
	public showAppVersion = false
	public readCurrentVersion = false
	public shouldTag = false
	public all = false
	public gitless = false
	public restoreVersion = false
	public removeAndStore = false
	public prereleaseValue?: string
	public replacePattern?: string
	public base?: string
	public command?: string
	public message?: string
	public error?: { message: string }
}

export function validateFlags(args: string[]): boolean {
	const seen = new Set<string>()

	for (const arg of args) {
		if (arg.startsWith('-')) {
			const normalized = flagAliases[arg]
			if (!normalized) {
				throw new Error(`Unknown argument: ${arg}`)
			}
			if (seen.has(normalized)) {
				throw new Error(`Duplicate argument: ${normalized}`)
			}
			seen.add(normalized)
		}
	}

	return true
}

export function parseCommand(argv: string[]): ParsedArgs {
	const parsedArgs = new ParsedArgs()
	const args: string[] = argv.slice(2)

	try {
		validateFlags(args)
	} catch (e) {
		parsedArgs.error = { message: String(e) }
		return parsedArgs
	}

	const cmd: string = args[0]
	const helpCommands = ['help', '--help', '-h', 'version', '--version', '-v']
	const knownCommands = ['major', 'minor', 'patch', 'remove', 'html', 'current', 'extract', 'restore']
	const isKnownCommand = knownCommands.concat(helpCommands).includes(cmd)
	const isEmptyOrFlag = !cmd || cmd.startsWith('-')
	const isSemver = isValidSemver(cmd)

	if (!isKnownCommand) {
		if (isEmptyOrFlag) {
			parsedArgs.error = {
				message: 'Missing or malformed command.'
			}
			return parsedArgs
		}

		if (!isSemver) {
			parsedArgs.error = {
				message: `Unknown command: "${cmd}".`
			}
			return parsedArgs
		}
	}

	try {
		parsedArgs.cmd = cmd
		parsedArgs.dryRun = args.includes('--dry') || args.includes('-d')
		parsedArgs.showHelp = args.includes('--help') || args.includes('-h') || cmd === 'help'
		parsedArgs.showAppVersion = args.includes('--version') || args.includes('-v') || cmd === 'version'
		parsedArgs.shouldTag = args.includes('--tag') || args.includes('-t')
		const prereleaseIndex = args.findIndex(arg => arg === '--prerelease' || arg === '-p')
		if (prereleaseIndex !== -1) {
			const value = args[prereleaseIndex + 1]
			if (!value || value.startsWith('-')) {
				parsedArgs.error = { message: 'Missing value for argument: --prerelease' }
				return parsedArgs
			}
			parsedArgs.prereleaseValue = value
		}

		parsedArgs.all = args.includes('--all') || args.includes('-a')
		parsedArgs.gitless = args.includes('--gitless') || args.includes('-g')

		const baseIndex = args.findIndex(arg => arg === '--base' || arg === '-b')
		if (baseIndex !== -1) {
			const baseValue = args[baseIndex + 1]
			parsedArgs.base = baseValue && !baseValue.startsWith('-') ? baseValue : '0.0.0'
		}

		const commandIndex = args.findIndex(arg => arg === '--command' || arg === '-c')
		parsedArgs.command = commandIndex !== -1 ? args[commandIndex + 1] ?? undefined : undefined

		const messageIndex = args.findIndex(arg => arg === '--message' || arg === '-m')
		parsedArgs.message = messageIndex !== -1 ? args[messageIndex + 1] ?? undefined : undefined

		const replaceIndex = args.findIndex(arg => arg === '--replace' || arg === '-r')
		parsedArgs.replacePattern = replaceIndex !== -1 ? args[replaceIndex + 1] ?? undefined : undefined

		if (parsedArgs.replacePattern) {
			parsedArgs.error = { message: '--replace is not supported yet.' }
			return parsedArgs
		}

		parsedArgs.readCurrentVersion = cmd === 'current'
		parsedArgs.removeAndStore = cmd === 'extract'
		parsedArgs.restoreVersion = cmd === 'restore'

		const sourceIndex = args.findIndex(arg => arg === '--source' || arg === '-s')
		parsedArgs.source = sourceIndex !== -1 ? args[sourceIndex + 1] ?? '' : ''

		const extIndex = args.findIndex(arg => arg === '--ext' || arg === '-e')
		parsedArgs.injectExt = extIndex !== -1 ? args[extIndex + 1] ?? 'html' : 'html'

		const fileIndex = args.findIndex(arg => arg === '--file' || arg === '-f')
		if (fileIndex !== -1) {
			const filePath = args[fileIndex + 1]
			if (filePath && !filePath.startsWith('-')) {
				if (fs.existsSync(filePath)) {
					parsedArgs.pgkPathFile = filePath
				} else {
					parsedArgs.error = { message: `File not found: ${filePath}` }
					return parsedArgs
				}
			}
		}

		if (cmd === 'html') {
			parsedArgs.cmd = 'html'
			if (!parsedArgs.source) {
				parsedArgs.error = { message: 'Missing required --source (-s) argument for html command.' }
				return parsedArgs
			}
		}

	} catch (e) {
		parsedArgs.error = { message: String(e) }
	}

	return parsedArgs
}
