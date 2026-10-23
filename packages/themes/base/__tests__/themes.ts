import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build as viteBuild } from 'vite'

/**
 * Темы репозитория и их CSS — для сторожей, которые годятся любой теме.
 *
 * Тема — каждый пакет `packages/themes/*`, кроме самой базы: база входит в CSS
 * каждой темы, и сторожа видят её там. Список не хардкодится: новая тема
 * попадает под сторожей сама.
 *
 * CSS темы собирается в памяти её же конфигом (`vite.config.ts` пакета), тем
 * же, что у её `build:css`: сторожа читают то, что уезжает в пакет, — Sass,
 * `@apply` и то, что выпускает Tailwind, там развёрнуты, — и не зависят от
 * `dist`: шаг «Тесты» в CI идёт до сборки. Тему без такого конфига помощник
 * собрать не умеет и падает, а не пропускает её молча.
 *
 * Пустым сторож проходит на любом CSS, поэтому каждый проверяет, что у oren
 * он не пуст: сборка дошла до того, что он сторожит.
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

/** Имя пакета из манифеста; манифест без имени — ошибка, а не пропуск. */
function nameOf(dir: string): string {
	const manifest: unknown = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
	const name =
		typeof manifest === 'object' && manifest !== null && 'name' in manifest
			? manifest.name
			: undefined

	if (typeof name !== 'string') throw new Error(`${dir}/package.json: нет имени пакета`)

	return name
}

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

	const result = await viteBuild({
		root: dir,
		configFile,
		logLevel: 'silent',
		build: { write: false },
	})
	const sheets = [result].flat().flatMap((output) => {
		if (!('output' in output)) throw new Error(`${name}: CSS-сборка ушла в режим наблюдения`)

		return output.output.flatMap((file) =>
			file.type === 'asset' && file.fileName.endsWith('.css') ? [file.source] : [],
		)
	})

	if (sheets.length !== 1) {
		throw new Error(`${name}: CSS-сборка отдала листов ${sheets.length}, ожидается один`)
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
