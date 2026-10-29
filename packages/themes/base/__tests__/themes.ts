import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build as viteBuild } from 'vite'

/**
 * The themes of the repository and their CSS — for the guards that fit any
 * theme.
 *
 * A theme is every package of `packages/themes/*` but the shared layer itself:
 * the shared layer goes into the CSS of every theme, and the guards see it
 * there. The list is not hardcoded: a new theme falls under the guards by
 * itself.
 *
 * The CSS of a theme is built in memory by its own config (`vite.config.ts` of
 * the package), the one of its `build:css`: the guards read what goes into the
 * package — Sass, `@apply` and what Tailwind puts out are expanded there, — and
 * do not depend on `dist`: the step «Тесты» in CI runs before the build. The
 * guards read the whole sheet, the file `style` of the manifest names: it
 * carries every rule of the theme, and the stylesheets of components next to
 * it are cut out of it (oren — `layers.ts` of the package). A theme without
 * such a config the helper cannot build, and it fails instead of skipping the
 * theme silently.
 *
 * An empty guard passes on any CSS, so each one checks that on oren it is not
 * empty: the build reached what it guards.
 */

const BASE = resolve(import.meta.dirname, '..')
const THEMES_DIR = resolve(BASE, '..')

/** Тема, у которой сторожа проверяют, что им есть что сторожить. */
export const OREN = '@soldy-ui/theme-oren'

export type TTheme = {
	/** Имя пакета: `@soldy-ui/theme-oren`. */
	readonly name: string
	/** Каталог пакета. */
	readonly dir: string
}

/** A string field of the manifest; without it — an error, not a skip. */
function fieldOf(dir: string, field: 'name' | 'style'): string {
	const manifest: unknown = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
	const value =
		typeof manifest === 'object' && manifest !== null && field in manifest
			? Reflect.get(manifest, field)
			: undefined

	if (typeof value !== 'string') throw new Error(`${dir}/package.json: нет поля ${field}`)

	return value
}

/** The name of the package from its manifest. */
const nameOf = (dir: string): string => fieldOf(dir, 'name')

export const THEMES: readonly TTheme[] = readdirSync(THEMES_DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => join(THEMES_DIR, entry.name))
	.filter((dir) => dir !== BASE && existsSync(join(dir, 'package.json')))
	.map((dir) => ({ name: nameOf(dir), dir }))

/** CSS темы, собранный её конфигом. */
async function buildCss({ name, dir }: TTheme): Promise<string> {
	const configFile = join(dir, 'vite.config.ts')

	if (!existsSync(configFile)) {
		throw new Error(`${name}: нет vite.config.ts — как собрать CSS темы, помощник не знает`)
	}

	// The whole sheet is the file of the manifest's `style`: of the CSS files of
	// the build it is the one whose name ends that path
	const style = fieldOf(dir, 'style')
	const result = await viteBuild({
		root: dir,
		configFile,
		logLevel: 'silent',
		build: { write: false },
	})
	const sheets = [result].flat().flatMap((output) => {
		if (!('output' in output)) throw new Error(`${name}: CSS-сборка ушла в режим наблюдения`)

		return output.output.flatMap((file) =>
			file.type === 'asset' && style.endsWith(`/${file.fileName}`) ? [file.source] : [],
		)
	})

	if (sheets.length !== 1) {
		throw new Error(`${name}: листов ${style} в CSS-сборке ${sheets.length}, ожидается один`)
	}

	const [sheet] = sheets

	return typeof sheet === 'string' ? sheet : new TextDecoder().decode(sheet)
}

/** Разбор CSS каждой темы: что из него вынул сторож. */
export type TThemeReport<T> = {
	readonly name: string
	readonly report: T
}

/**
 * Собирает каждую тему и разбирает её CSS функцией сторожа. Темы собираются
 * разом: сборка — в памяти и не пишет на диск.
 */
export async function inspectThemes<T>(
	inspect: (css: string, theme: TTheme) => T,
): Promise<TThemeReport<T>[]> {
	return Promise.all(
		THEMES.map(async (theme) => ({
			name: theme.name,
			report: inspect(await buildCss(theme), theme),
		})),
	)
}

/** Разбор темы по имени; темы нет — сторож падает, а не проверяет пустоту. */
export function reportOf<T>(reports: readonly TThemeReport<T>[], name: string): T {
	const found = reports.find((entry) => entry.name === name)

	if (!found) throw new Error(`темы ${name} нет среди packages/themes/*`)

	return found.report
}
