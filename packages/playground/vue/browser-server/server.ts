/**
 * A Playwright server in Docker for a browser that doesn't start on this
 * machine — WebKit on Windows (`vitest.browser.config.ts`, `webkit`). The
 * runner is `cli.ts`; here is what it is built from.
 *
 * The server and the browsers must be of the Playwright version the run is
 * driven by, otherwise their protocols don't match. So the server isn't
 * installed into the container: it is this machine's `playwright-core`,
 * mounted read only (the package is plain JavaScript), and the image is the
 * one Playwright publishes for that version, with its browsers. The version
 * itself is the one package-lock pins, as in CI: another one installed means
 * `npm install` was skipped, and the run stops.
 *
 * The browser in the container opens the run's pages at `127.0.0.1` of the
 * Vitest port, and the container's own loopback leads to this machine through
 * `proxy.ts`.
 */

/** The port of the Playwright server inside the container. */
const SERVER_PORT = 3000

/** Where the container sees `playwright-core` of this machine. */
const MOUNTED_CORE = '/playwright-core'

/** Where the container sees this folder. */
const MOUNTED_TOOLS = '/browser-server'

/** The part of package-lock the version is read from. */
export type TLock = {
	packages: Record<string, { version?: string } | undefined>
}

/**
 * The image of the Playwright server: Ubuntu 24.04 (`noble`) with the
 * browsers of exactly the installed `playwright-core`, which must be the one
 * package-lock pins.
 */
export function serverImage(lock: TLock, installed: string): string {
	const locked = lock.packages['node_modules/playwright-core']?.version

	if (locked !== installed) {
		throw new Error(
			`playwright-core ${installed} is installed, but package-lock pins ${locked}: run npm install`,
		)
	}

	return `mcr.microsoft.com/playwright:v${installed}-noble`
}

/** What the server is started with. */
export type TServerOptions = {
	/** The image, `serverImage` */
	image: string
	/** The folder of the installed `playwright-core` */
	core: string
	/** This folder: the container runs `proxy.ts` from it */
	tools: string
	/** The port of this machine the Playwright server answers on, loopback only */
	port: number
	/** The port of the Vitest server — on this machine and in the container alike */
	api: number
}

/**
 * Arguments of `docker run` that start the server in the background (`-d`);
 * the container is removed once it stops (`--rm`). The server runs as the
 * image's own user, not root, and `--init` passes it the stop signal.
 */
export function dockerRunArgs({ image, core, tools, port, api }: TServerOptions): string[] {
	return [
		'run',
		'-d',
		'--rm',
		'--init',
		'--publish',
		`127.0.0.1:${port}:${SERVER_PORT}`,
		'--mount',
		`type=bind,source=${core},target=${MOUNTED_CORE},readonly`,
		'--mount',
		`type=bind,source=${tools},target=${MOUNTED_TOOLS},readonly`,
		'--user',
		'pwuser',
		'--workdir',
		'/home/pwuser',
		image,
		'sh',
		'-c',
		[
			`node ${MOUNTED_TOOLS}/proxy.ts ${api} &`,
			`exec node ${MOUNTED_CORE}/cli.js run-server --port ${SERVER_PORT} --host 0.0.0.0`,
		].join(' '),
	]
}

/** The address the run connects to (`WEBKIT_SERVER`). */
export function serverEndpoint(port: number): string {
	return `ws://127.0.0.1:${port}/`
}

/** The line the server prints once it accepts connections. */
export const LISTENING = 'Listening on '
