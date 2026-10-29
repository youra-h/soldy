import { resolve } from 'node:path'
import { build as viteBuild } from 'vite'

/**
 * The CSS build of the theme — in memory, with the config of `build:css`: the
 * guards that read the built CSS (`button-tones.spec.ts`, `color-mix.spec.ts`,
 * `entries.spec.ts`) do not depend on `dist` — the step «Тесты» in CI runs
 * before the build. The guards of any theme build it the same way, with a
 * helper of their own (`packages/themes/base/__tests__/themes.ts`).
 */

const ROOT = resolve(import.meta.dirname, '..')

/** Every CSS file of the build: its path in `dist` → its text. */
export async function buildSheets(): Promise<Map<string, string>> {
	const result = await viteBuild({
		root: ROOT,
		configFile: resolve(ROOT, 'vite.config.ts'),
		logLevel: 'silent',
		build: { write: false },
	})
	const sheets = new Map<string, string>()

	for (const output of [result].flat()) {
		if (!('output' in output)) throw new Error('CSS-сборка ушла в режим наблюдения')

		for (const file of output.output) {
			if (file.type !== 'asset' || !file.fileName.endsWith('.css')) continue

			const { source } = file

			sheets.set(
				file.fileName,
				typeof source === 'string' ? source : new TextDecoder().decode(source),
			)
		}
	}

	return sheets
}

/** The whole sheet — `index.css`. */
export async function buildCss(): Promise<string> {
	const sheet = (await buildSheets()).get('index.css')

	if (sheet === undefined) throw new Error('CSS-сборка не отдала index.css')

	return sheet
}
