import { resolve } from 'node:path'
import { build as viteBuild } from 'vite'

/**
 * Сборка CSS темы — в памяти, тем же конфигом, что у `build:css`: сторожа,
 * которые читают собранный CSS (`motion.spec.ts`, `button-tones.spec.ts`), не
 * зависят от `dist` — шаг «Тесты» в CI идёт до сборки.
 */

const ROOT = resolve(import.meta.dirname, '..')

export async function buildCss(): Promise<string> {
	const result = await viteBuild({
		root: ROOT,
		configFile: resolve(ROOT, 'vite.config.ts'),
		logLevel: 'silent',
		build: { write: false },
	})

	for (const output of [result].flat()) {
		if (!('output' in output)) throw new Error('CSS-сборка ушла в режим наблюдения')

		for (const file of output.output) {
			if (file.type !== 'asset' || file.fileName !== 'index.css') continue

			return typeof file.source === 'string'
				? file.source
				: new TextDecoder().decode(file.source)
		}
	}

	throw new Error('CSS-сборка не отдала index.css')
}
