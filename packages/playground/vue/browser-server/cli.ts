import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'
import { parseCLI, startVitest } from 'vitest/node'
import { dockerRunArgs, LISTENING, serverEndpoint, serverImage } from './server.ts'
import type { TLock } from './server.ts'

/**
 * The browser run in WebKit through a Playwright server in Docker
 * (`packages/playground/AGENTS.md`, «Браузерный прогон»):
 *
 * ```bash
 * npm run test:layout:webkit -- [<filters and options of vitest run>]
 * ```
 *
 * Starts the server (`server.ts`), runs the WebKit project of
 * `vitest.browser.config.ts` against it and stops the server. Needs a running
 * Docker Desktop; the first run pulls the image. Node runs the file without a
 * build, like `styles-diff/cli.ts`.
 */

const ROOT = resolve(import.meta.dirname, '..')
const CONFIG = resolve(ROOT, 'vitest.browser.config.ts')
const LOCK = resolve(ROOT, '../../../package-lock.json')

/** The WebKit project of the config: `<test.name> (<browser>)`. */
const PROJECT = 'layout (webkit)'

/** How long the server may take to start, ms. */
const START_TIMEOUT = 60_000

const { filter, options } = parseCLI(['vitest', 'run', ...process.argv.slice(2)])

const core = dirname(createRequire(import.meta.url).resolve('playwright-core/package.json'))
const installed: string = JSON.parse(readFileSync(resolve(core, 'package.json'), 'utf8')).version
const lock: TLock = JSON.parse(readFileSync(LOCK, 'utf8'))

/** A port of this machine that nothing listens on right now. */
function freePort(): Promise<number> {
	return new Promise((done, fail) => {
		const probe = createServer()

		probe.once('error', fail)
		probe.listen(0, '127.0.0.1', () => {
			const address = probe.address()

			probe.close(() =>
				typeof address === 'object' && address
					? done(address.port)
					: fail(new Error('no port')),
			)
		})
	})
}

/** Waits until the server in the container accepts connections. */
async function listening(container: string): Promise<void> {
	const deadline = Date.now() + START_TIMEOUT

	while (Date.now() < deadline) {
		const logs = spawnSync('docker', ['logs', container], { encoding: 'utf8' })

		if (logs.status !== 0)
			throw new Error(`the server container is gone: ${logs.stderr.trim()}`)
		if (logs.stdout.includes(LISTENING)) return

		await wait(250)
	}

	throw new Error(`the server didn't start in ${START_TIMEOUT / 1000} s`)
}

const image = serverImage(lock, installed)
const port = await freePort()
const api = await freePort()
const container = execFileSync(
	'docker',
	dockerRunArgs({ image, core, tools: import.meta.dirname, port, api }),
	{
		encoding: 'utf8',
		// The pull of a missing image reports its progress here
		stdio: ['ignore', 'pipe', 'inherit'],
	},
).trim()

const stop = () => spawnSync('docker', ['stop', '--time', '1', container], { stdio: 'ignore' })

process.once('SIGINT', () => {
	stop()
	process.exit(130)
})

try {
	await listening(container)

	process.env.WEBKIT_SERVER = serverEndpoint(port)

	const vitest = await startVitest('test', filter, {
		...options,
		root: ROOT,
		config: CONFIG,
		watch: false,
		project: [PROJECT],
		// The pages are opened at this address, and in the container it leads to
		// the proxy (`proxy.ts`). An IPv4 address, not `localhost`: Node takes
		// `localhost` for `::1` here, and Docker Desktop delivers to `127.0.0.1`
		api: { host: '127.0.0.1', port: api, strictPort: true },
	})

	await vitest.close()
} finally {
	stop()
}
