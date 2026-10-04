import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

/**
 * Сторож правила «режим движения читается в одном месте» (корневой
 * `AGENTS.md`, «Движение: один режим на библиотеку»).
 *
 * Режим — атрибут `data-s-motion` на корне документа, без него — настройка
 * системы `prefers-reduced-motion`. В коде их знает только модуль движения
 * плагинов (`packages/plugins/src/motion/`): он ставит атрибут (`useMotion`)
 * и отвечает плагинам, как им прокручивать. Свой опрос среды у плагина —
 * второй путь к режиму, и приложение, задавшее режим, до такого плагина не
 * дотянулось бы: так лента Scroller слушала одну систему.
 *
 * Плавная прокрутка (`'smooth'`) и анимация из кода (`.animate(`) — тоже
 * движение, и вне модуля их не пишут: плавно ли прокручивать, решает модуль.
 * В ядре `smooth` — значение пропа `scrollBehavior`, и ядро DOM не трогает:
 * литерал там допустим.
 *
 * Сканируется код без комментариев — в объяснениях эти слова законны, — во
 * всём, что уезжает в пакеты: ядро, плагины, оба слоя setup, исходники
 * адаптеров и поведение тем. Как тема исполняет режим в CSS, стережёт
 * `packages/themes/oren/__tests__/motion.spec.ts`.
 */

const ROOT = resolve(__dirname, '../../..')
const PACKAGES = join(ROOT, 'packages')

/** Модуль движения — единственное место, где режим читают и задают. */
const MOTION_MODULE = 'packages/plugins/src/motion/'

const CORE = 'packages/core/src/'

const EXCLUDED_DIR_NAMES = new Set(['node_modules', 'dist', '__tests__', '.svelte-kit'])

const SOURCE_FILE = /\.(ts|tsx|js|vue|svelte)$/

/** Корни сканирования: всё, что уезжает в пакеты кодом. */
function roots(): string[] {
	const inside = (dir: string) =>
		readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory())

	return [
		join(PACKAGES, 'core/src'),
		join(PACKAGES, 'plugins/src'),
		join(PACKAGES, 'setup/protected'),
		join(PACKAGES, 'setup/content'),
		...inside(join(PACKAGES, 'ui')).map((name) => join(PACKAGES, 'ui', name, 'src')),
		...inside(join(PACKAGES, 'themes')).map((name) => join(PACKAGES, 'themes', name, 'setup')),
	]
}

function collect(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (EXCLUDED_DIR_NAMES.has(name)) continue

		const full = join(dir, name)

		if (statSync(full).isDirectory()) collect(full, files)
		else if (SOURCE_FILE.test(name)) files.push(full)
	}

	return files
}

/** Код без комментариев: `/* *​/`, `//` и `<!-- -->` разметки компонентов. */
function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/(^|[^:])\/\/.*$/gm, '$1')
}

type TRule = {
	readonly name: string
	readonly pattern: RegExp
	/** Где слово законно, кроме модуля движения. */
	readonly allowed?: string
}

const RULES: readonly TRule[] = [
	{ name: 'prefers-reduced-motion', pattern: /prefers-reduced-motion/ },
	{ name: 'data-s-motion', pattern: /data-s-motion/ },
	{ name: 'литерал smooth', pattern: /(['"`])smooth\1/, allowed: CORE },
	{ name: 'вызов .animate()', pattern: /\.animate\(/ },
]

const sources = roots()
	.flatMap((dir) => collect(dir))
	.map((file) => ({
		path: relative(ROOT, file).split('\\').join('/'),
		code: stripComments(readFileSync(file, 'utf8')),
	}))

describe('режим движения — в одном модуле', () => {
	it('сканер видит код пакетов и сам модуль движения', () => {
		// Пустой список прошёл бы проверку ниже на любом коде
		expect(sources.length).toBeGreaterThan(100)
		expect(sources.some(({ path }) => path.startsWith(MOTION_MODULE))).toBe(true)
	})

	it('модуль движения и правда задаёт и читает режим', () => {
		const module = sources
			.filter(({ path }) => path.startsWith(MOTION_MODULE))
			.map(({ code }) => code)
			.join('\n')

		// Иначе сторож стерёг бы слова, которых нет нигде, — и пропустил бы
		// модуль, переехавший в другое место
		expect(module).toMatch(/prefers-reduced-motion/)
		expect(module).toMatch(/data-s-motion/)
	})

	it.each(RULES)('$name — только в модуле движения', ({ pattern, allowed }) => {
		const violations = sources
			.filter(({ path }) => !path.startsWith(MOTION_MODULE))
			.filter(({ path }) => allowed === undefined || !path.startsWith(allowed))
			.filter(({ code }) => pattern.test(code))
			.map(({ path }) => path)

		expect(
			violations,
			'Режим движения читают и задают только в packages/plugins/src/motion/ ' +
				'(AGENTS.md, «Движение: один режим на библиотеку»)',
		).toEqual([])
	})
})
