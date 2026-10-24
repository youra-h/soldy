import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { writtenVariables } from './behaviour'

/**
 * Контракт общего слоя тем с темой — `theme-variables.json`
 * (`packages/themes/base/AGENTS.md`, «Контракт: переменные темы»). Его читают
 * свои сторожа базы (`base-css.spec.ts`) и сторож любой темы
 * (`theme-reads.spec.ts`).
 *
 * Разделов два: `base-reads` — что читает база (тема задаёт или вправе
 * переопределить, либо пишет библиотека), `theme-reads` — что тема вправе
 * читать сверх этого, но не задаёт (пишут база и код).
 */

const BASE = resolve(import.meta.dirname, '..')
const PACKAGES = resolve(BASE, '../..')

/** Раздел контракта: имя переменной `--so-*` и что она значит. */
export type TSection = Readonly<Record<string, unknown>>

export type TContract = {
	/** Имена разделов в файле — их ровно два. */
	readonly sections: readonly string[]
	readonly baseReads: TSection
	readonly themeReads: TSection
}

const isRecord = (value: unknown): value is TSection =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

function sectionOf(parsed: TSection, name: string): TSection {
	const section = parsed[name]

	if (!isRecord(section)) throw new Error(`theme-variables.json: нет раздела «${name}»`)

	return section
}

function readContract(): TContract {
	const parsed: unknown = JSON.parse(readFileSync(join(BASE, 'theme-variables.json'), 'utf8'))

	if (!isRecord(parsed)) throw new Error('theme-variables.json: ожидается объект JSON')

	return {
		sections: Object.keys(parsed),
		baseReads: sectionOf(parsed, 'base-reads'),
		themeReads: sectionOf(parsed, 'theme-reads'),
	}
}

export const CONTRACT = readContract()

/** Что читает база и не объявляет сама, и её умолчания для темы. */
export const BASE_READS: readonly string[] = Object.keys(CONTRACT.baseReads)

/** Что тема вправе читать сверх этого: пишут база и код, тема не задаёт. */
export const THEME_READS: readonly string[] = Object.keys(CONTRACT.themeReads)

/**
 * Переменные, которые пишет код: библиотека — ядро, плагины, setup — и
 * плагины раскладки базы, которые ставит тема. Адаптеры только раскладывают
 * то, что им отдали, и своих переменных не пишут.
 */
export const CODE_WRITES: ReadonlySet<string> = new Set(
	[
		writtenVariables(join(PACKAGES, 'core/src'), 'core'),
		writtenVariables(join(PACKAGES, 'plugins/src'), 'plugins'),
		writtenVariables(join(PACKAGES, 'setup/content'), 'setup/content'),
		writtenVariables(join(PACKAGES, 'setup/protected'), 'setup/protected'),
		writtenVariables(join(BASE, 'setup'), 'theme-base/setup'),
	]
		.flat()
		.map(({ name }) => name),
)
