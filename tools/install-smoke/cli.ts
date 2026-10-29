import { execSync, spawn } from 'node:child_process'
import {
	cpSync,
	createReadStream,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, relative, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'
import { pageProblems } from './browser.ts'
import {
	PROJECTS,
	libraryClosure,
	libraryLines,
	libraryNamesOf,
	lockProblems,
	withRegistry,
	withTarballs,
} from './install-smoke.ts'
import type { TManifest, TProject } from './install-smoke.ts'

/**
 * The install run (docs/agents/build.md, «Прогон установки»): the built
 * packages, packed as npm publishes them, installed into clean projects.
 *
 * ```bash
 * npm run build                                   # the run packs what the build left in dist
 * node tools/install-smoke/cli.ts                 # every project
 * node tools/install-smoke/cli.ts vue next        # these two
 * node tools/install-smoke/cli.ts --registry latest # the published packages instead of tarballs
 * ```
 *
 * A project is copied out of the repository into the run folder (`--dir`,
 * the system temp folder by default): inside the repository Node would find
 * the workspace's `node_modules` above it, and the project would not be clean.
 * Then, in order: the install (no peer conflict, no problem in `npm ls`, every
 * library package once and from the run's source), the type check and the
 * build of the project (with no line of their output naming the library), the
 * server, the page in Chromium (`browser.ts`).
 */

const ROOT = resolve(import.meta.dirname, '../..')
const PROJECTS_DIR = join(import.meta.dirname, 'projects')

/** How long the slowest step of a project may take: the install of Next.js or Angular on a cold cache. */
const STEP_MS = 10 * 60_000

/** How long a server has to answer after its start. */
const SERVER_MS = 60_000

type TRun = { readonly code: number; readonly output: string }

/**
 * Runs a command through the shell, its output both shown and kept. Through
 * the shell, since npm on Windows is `npm.cmd`, which Node does not start
 * without one; the commands are fixed strings with nothing to escape. Outside
 * Windows the command leads a process group of its own, so that a timeout
 * stops everything it started (`stopTree`).
 */
function run(command: string, cwd: string): Promise<TRun> {
	return new Promise((resolvePromise, reject) => {
		const child = spawn(command, {
			cwd,
			shell: true,
			detached: process.platform !== 'win32',
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		const chunks: string[] = []
		const keep = (chunk: Buffer, to: NodeJS.WriteStream): void => {
			chunks.push(chunk.toString())
			to.write(chunk)
		}
		const timer = setTimeout(() => {
			stopTree(child.pid)
			reject(new Error(`${command}: дольше ${STEP_MS / 60_000} мин`))
		}, STEP_MS)

		child.stdout.on('data', (chunk: Buffer) => keep(chunk, process.stdout))
		child.stderr.on('data', (chunk: Buffer) => keep(chunk, process.stderr))
		child.once('error', reject)
		child.once('close', (code) => {
			clearTimeout(timer)
			resolvePromise({ code: code ?? 1, output: chunks.join('') })
		})
	})
}

/** Stops a process with everything it started: npm, the shell, the server under them. */
function stopTree(pid: number | undefined): void {
	if (pid === undefined) {
		return
	}

	try {
		if (process.platform === 'win32') {
			execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
		} else {
			process.kill(-pid, 'SIGTERM')
		}
	} catch {
		// Already gone
	}
}

/** The output of an npm command parsed as JSON; the command is a fixed string. */
function npmJson(command: string, cwd: string): unknown {
	return JSON.parse(
		execSync(`npm ${command}`, {
			cwd,
			encoding: 'utf-8',
			maxBuffer: 64 * 1024 * 1024,
			stdio: ['ignore', 'pipe', 'pipe'],
		}),
	)
}

function isObject(value: unknown): value is TManifest {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readJson(file: string): TManifest {
	const parsed: unknown = JSON.parse(readFileSync(file, 'utf-8'))

	if (!isObject(parsed)) {
		throw new Error(`${file}: ожидается объект JSON`)
	}

	return parsed
}

/** A library package of the workspace: what npm publishes. */
type TLibrary = { readonly dir: string; readonly manifest: TManifest }

/** The library packages of the workspace by name — the workspaces npm would publish (no `private`). */
function readLibrary(): Map<string, TLibrary> {
	const listed = npmJson('query .workspace', ROOT)

	if (!Array.isArray(listed)) {
		throw new Error('npm query .workspace: ожидается массив воркспейсов')
	}

	const library = new Map<string, TLibrary>()

	for (const entry of listed) {
		if (
			!isObject(entry) ||
			typeof entry.name !== 'string' ||
			typeof entry.location !== 'string'
		) {
			throw new Error('npm query .workspace: воркспейс без имени или места')
		}

		const manifest = readJson(join(ROOT, entry.location, 'package.json'))

		if (manifest.private !== true) {
			library.set(entry.name, { dir: entry.location, manifest })
		}
	}

	return library
}

/**
 * Packs the library packages into `dir`, as `npm publish` would, and gives the
 * tarball of each by name. A package without its build is an error here, not a
 * puzzle later: the entry of its manifest is not in the tarball.
 */
function pack(library: ReadonlyMap<string, TLibrary>, dir: string): Map<string, string> {
	mkdirSync(dir, { recursive: true })

	const workspaces = [...library.keys()].map((name) => `--workspace=${name}`).join(' ')
	const packed = npmJson(`pack ${workspaces} --pack-destination "${dir}" --json`, ROOT)

	if (!Array.isArray(packed)) {
		throw new Error('npm pack: ожидается массив тарболлов')
	}

	const tarballs = new Map<string, string>()

	for (const entry of packed) {
		if (
			!isObject(entry) ||
			typeof entry.name !== 'string' ||
			typeof entry.filename !== 'string'
		) {
			throw new Error('npm pack: тарболл без имени пакета или файла')
		}

		const main = library.get(entry.name)?.manifest.main
		const files = Array.isArray(entry.files) ? entry.files : []
		const paths = files.map((file: unknown) => (isObject(file) ? file.path : undefined))

		if (typeof main === 'string' && !paths.includes(main.replace(/^\.\//, ''))) {
			throw new Error(`${entry.name}: в тарболле нет ${main} — сначала npm run build`)
		}

		tarballs.set(entry.name, join(dir, entry.filename))
	}

	return tarballs
}

/** Where the library of a run comes from: the packed build, or the registry under a spec. */
type TSource =
	| { readonly kind: 'tarballs'; readonly tarballs: ReadonlyMap<string, string> }
	| { readonly kind: 'registry'; readonly spec: string }

/** A spec of a tarball for a project's manifest: relative, with `/` on every system. */
function tarballSpec(project: string, tarball: string): string {
	return `file:${relative(project, tarball).split(sep).join('/')}`
}

/**
 * Copies the project out of the repository into `dir`, the library in its
 * manifest pointed at the run's source. Gives the closure: the library
 * packages it installs.
 */
function assemble(
	project: TProject,
	dir: string,
	library: ReadonlyMap<string, TLibrary>,
	source: TSource,
): string[] {
	rmSync(dir, { recursive: true, force: true })
	cpSync(join(PROJECTS_DIR, project.name), dir, { recursive: true })

	const file = join(dir, 'package.json')
	const manifest = readJson(file)
	const manifests = new Map([...library].map(([name, { manifest }]) => [name, manifest]))
	const closure = libraryClosure(libraryNamesOf(manifest), manifests)
	const assembled =
		source.kind === 'registry'
			? withRegistry(manifest, source.spec)
			: withTarballs(
					manifest,
					new Map(
						closure.map((name) => {
							const tarball = source.tarballs.get(name)

							if (tarball === undefined) {
								throw new Error(`${name}: тарболла нет`)
							}

							return [name, tarballSpec(dir, tarball)]
						}),
					),
				)

	writeFileSync(file, `${JSON.stringify(assembled, null, 2)}\n`)

	return closure
}

/** The last lines of an output, without colors: what the summary repeats of a failed command. */
function tail(output: string, count = 20): string {
	return output
		.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'), '')
		.split(/\r?\n/)
		.filter((line) => line.trim() !== '')
		.slice(-count)
		.map((line) => `  ${line}`)
		.join('\n')
}

/** Runs an npm script of the project; a failure or a line naming the library fails the step. */
async function script(name: string, cwd: string): Promise<void> {
	const { code, output } = await run(`npm run ${name}`, cwd)

	if (code !== 0) {
		throw new Error(`npm run ${name}: код ${code}\n${tail(output)}`)
	}

	const lines = libraryLines(output)

	if (lines.length > 0) {
		throw new Error(`npm run ${name} говорит о библиотеке:\n${lines.join('\n')}`)
	}
}

/** The install: npm resolves the tree, and the tree is checked. */
async function install(cwd: string, closure: readonly string[], source: TSource): Promise<void> {
	const { code, output } = await run('npm install --no-audit --no-fund', cwd)

	if (code !== 0) {
		throw new Error(`npm install: код ${code}\n${tail(output)}`)
	}

	const lines = libraryLines(output)

	if (lines.length > 0) {
		throw new Error(`npm install говорит о библиотеке:\n${lines.join('\n')}`)
	}

	// `npm ls` names what the install left wrong: a peer out of range, a
	// missing package. It exits with an error then, so the output is read anyway.
	// An extraneous package is not the install's: a framework's tool writes
	// into `node_modules` itself (SvelteKit links `$app` there for its tsconfig)
	let listed: unknown

	try {
		listed = npmJson('ls --all --json', cwd)
	} catch (error) {
		const stdout = isObject(error) && typeof error.stdout === 'string' ? error.stdout : '{}'

		listed = JSON.parse(stdout)
	}

	const problems = (isObject(listed) && Array.isArray(listed.problems) ? listed.problems : [])
		.map(String)
		.filter((problem) => !problem.startsWith('extraneous:'))

	if (problems.length > 0) {
		throw new Error(`npm ls:\n${problems.join('\n')}`)
	}

	const specs = new Map(
		source.kind === 'tarballs'
			? [...source.tarballs].map(([name, tarball]) => [name, tarballSpec(cwd, tarball)])
			: [],
	)
	const tree = lockProblems(
		readJson(join(cwd, 'package-lock.json')),
		closure,
		(name, resolved) =>
			source.kind === 'tarballs'
				? resolved === specs.get(name)
				: resolved?.startsWith('https://') === true,
	)

	if (tree.length > 0) {
		throw new Error(`библиотека в дереве:\n${tree.join('\n')}`)
	}
}

const TYPES: Readonly<Record<string, string>> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.txt': 'text/plain; charset=utf-8',
}

/** A free port of the machine: the system gives one to a listener on port 0. */
function freePort(): Promise<number> {
	return new Promise((resolvePromise, reject) => {
		const probe = createServer()

		probe.once('error', reject)
		probe.listen(0, '127.0.0.1', () => {
			const address = probe.address()

			probe.close(() =>
				typeof address === 'object' && address !== null
					? resolvePromise(address.port)
					: reject(new Error('порт не выдан')),
			)
		})
	})
}

/** A running server of a project: its address and how to stop it. */
type TServing = { readonly url: string; stop(): Promise<void> }

/** Serves a built static site: a file by its path, the root — `index.html`, the rest — 404. */
async function serveStatic(root: string): Promise<TServing> {
	const port = await freePort()
	const server: Server = createServer((request, response) => {
		const path = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname)
		const file = join(root, path === '/' ? 'index.html' : path)

		if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
			response.writeHead(404).end()
			return
		}

		response.writeHead(200, {
			'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
		})
		createReadStream(file).pipe(response)
	})

	await new Promise<void>((resolvePromise) => server.listen(port, '127.0.0.1', resolvePromise))

	return {
		url: `http://127.0.0.1:${port}/`,
		stop: () => new Promise((resolvePromise) => server.close(() => resolvePromise())),
	}
}

/**
 * Starts the project's own server — `npm start`, the port in `PORT` — and waits
 * until it answers. Its output goes to the log: an error of the server render
 * is printed there.
 *
 * The address is `localhost`, not `127.0.0.1`: a server of Angular answers only
 * the hosts it trusts, and of its own accord it trusts `localhost` alone.
 */
async function serveStart(cwd: string): Promise<TServing> {
	const port = await freePort()
	const child = spawn('npm start', {
		cwd,
		env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
		shell: true,
		detached: process.platform !== 'win32',
		stdio: ['ignore', 'inherit', 'inherit'],
	})
	const url = `http://localhost:${port}/`
	const until = Date.now() + SERVER_MS
	let exited = false

	child.once('exit', () => {
		exited = true
	})

	const stop = async (): Promise<void> => {
		stopTree(child.pid)
	}

	while (Date.now() < until && !exited) {
		try {
			await fetch(url)
			return { url, stop }
		} catch {
			await new Promise((resolvePromise) => setTimeout(resolvePromise, 300))
		}
	}

	await stop()
	throw new Error(
		exited ? 'сервер завершился, не ответив' : `сервер молчит ${SERVER_MS / 1000} с`,
	)
}

/** Runs a step; a failure is kept, not thrown, so that the next steps still report theirs. */
async function attempt(failures: string[], step: () => Promise<void>): Promise<boolean> {
	try {
		await step()
		return true
	} catch (error) {
		failures.push(error instanceof Error ? error.message : String(error))
		return false
	}
}

/** Serves the built project and judges its page in Chromium. */
async function browse(project: TProject, cwd: string): Promise<void> {
	const serving =
		project.serve.kind === 'static'
			? await serveStatic(join(cwd, project.serve.dir))
			: await serveStart(cwd)

	try {
		const problems = await pageProblems(serving.url, project.serve.kind === 'server')

		if (problems.length > 0) {
			throw new Error(`страница в Chromium:\n${problems.join('\n')}`)
		}
	} finally {
		await serving.stop()
	}
}

/**
 * One project from the copy to the browser; gives what failed, an empty list
 * — nothing. A failed type check does not stop the build and the page: the
 * bundler does not depend on it, and a defect of the types would otherwise hide
 * the defects of the page. A failed install or build does stop them — there is
 * nothing to run.
 */
async function check(
	project: TProject,
	dir: string,
	library: ReadonlyMap<string, TLibrary>,
	source: TSource,
): Promise<string[]> {
	const cwd = join(dir, project.name)
	const closure = assemble(project, cwd, library, source)
	const failures: string[] = []

	console.log(`\n== ${project.title}: ${closure.join(', ')}`)

	if (!(await attempt(failures, () => install(cwd, closure, source)))) {
		return failures
	}

	await attempt(failures, () => script('typecheck', cwd))

	if (await attempt(failures, () => script('build', cwd))) {
		await attempt(failures, () => browse(project, cwd))
	}

	return failures
}

const USAGE =
	'node tools/install-smoke/cli.ts [<проект>…] [--registry <версия или тег>] [--dir <папка>]'

async function main(): Promise<number> {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			registry: { type: 'string' },
			dir: { type: 'string', default: join(tmpdir(), 'soldy-install-smoke') },
		},
	})
	const unknown = positionals.filter((name) => !PROJECTS.some((project) => project.name === name))

	if (unknown.length > 0) {
		console.error(`нет проектов: ${unknown.join(', ')}\n${USAGE}`)
		return 2
	}

	const projects =
		positionals.length === 0
			? PROJECTS
			: PROJECTS.filter((project) => positionals.includes(project.name))
	const dir = resolve(values.dir)
	const library = readLibrary()
	const source: TSource =
		values.registry === undefined
			? { kind: 'tarballs', tarballs: pack(library, join(dir, 'tarballs')) }
			: { kind: 'registry', spec: values.registry }
	const failed: string[] = []

	for (const project of projects) {
		const started = Date.now()
		const failures = await check(project, dir, library, source)
		const took = `${Math.round((Date.now() - started) / 1000)} с`

		if (failures.length === 0) {
			console.log(`\n✓ ${project.title} (${took})`)
		} else {
			console.error(
				`\n✗ ${project.title} (${took}):\n${failures.map((failure) => `- ${failure}`).join('\n')}`,
			)
			failed.push(project.title)
		}
	}

	if (failed.length > 0) {
		console.error(`\nне прошли: ${failed.join(', ')}`)
		return 1
	}

	console.log(`\nпрошли все: ${projects.map(({ title }) => title).join(', ')}`)
	return 0
}

process.exitCode = await main()
