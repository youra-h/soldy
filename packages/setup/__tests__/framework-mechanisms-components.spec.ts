import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

/**
 * Сторож правила «механизмы фреймворка — только в адаптерном слое»
 * (см. AGENTS.md). В `packages/ui/<fw>/src/components/**` не должно быть
 * внутренних механизмов реактивности/жизненного цикла фреймворка — они живут
 * только в `src/adapter/**`. Vue стережёт eslint-блок
 * `soldy/vue-components-no-framework`; здесь — Solid, Svelte и Angular,
 * для которых такого блока нет.
 *
 * Сканируется исходный текст файлов `src/components/**` каждого пакета на
 * слова из таблицы AGENTS.md. Ловится имя, а не смысл (как и в
 * `driver-access.spec.ts`) — переименованный импорт под тем же alias всё
 * равно распознаётся по оригинальному имени в списке специфаеров импорта.
 *
 * У Svelte, Solid и Angular тот же сторож держит и сборку: контекст
 * компонента собирает обёртка адаптера — `createSvelteAdapterContext`,
 * `createSolidAdapterContext` (id монтирования и локаль поддерева) и
 * `createAngularAdapterContext` (локаль поддерева), а не
 * `createAdapterContext` напрямую — как eslint-блок у Vue. `$props.id()`
 * механизмом здесь не считается: это id монтирования, который компилятор
 * пускает только в компонент (AGENTS.md, там же). У Solid id монтирования
 * (`createUniqueId`) берёт сама обёртка, а слот разворачивает помощник
 * адаптера поверх `children`, — в компонентах их нет. У Angular локаль
 * обёртка берёт из DI (`inject`) в контексте инъекции, который даёт сборке
 * база компонента, — `inject` в компонентах нет.
 */

const ROOT = resolve(__dirname, '../../..')

type TGuard = {
	readonly framework: string
	readonly dir: string
	readonly extensions: RegExp
	readonly test: (source: string) => string[]
}

/**
 * Снимает `//` и `/* *​/` комментарии перед сканированием — как и
 * `engine-extension-scope.spec.ts`, ловим имя в коде, а не в документации.
 * Грубый прогон по регулярке, а не по AST: для комментария с упоминанием
 * `ngOnInit()`, поясняющего момент вызова адаптера, точность AST не нужна.
 */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, '')
}

/** Имена, импортированные из `{ ... } from '<module>'`, без алиасов (`as`). */
function importedNames(source: string, moduleRe: RegExp): Set<string> {
	const names = new Set<string>()
	const importRe = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g

	let match: RegExpExecArray | null

	while ((match = importRe.exec(source))) {
		const [, specifiers, moduleName] = match

		if (!moduleRe.test(moduleName)) continue

		for (const raw of specifiers.split(',')) {
			const name = raw
				.trim()
				.split(/\s+as\s+/)[0]
				?.trim()
			if (name) names.add(name)
		}
	}

	return names
}

const SOLID_FORBIDDEN = [
	'createSignal',
	'createMemo',
	'createEffect',
	'onMount',
	'onCleanup',
	'useContext',
	'children',
	'createUniqueId',
]

const SVELTE_IMPORT_FORBIDDEN = ['onMount', 'onDestroy', 'getContext', 'setContext']
const SVELTE_RUNE_RE = /\$state\(|\$derived\b|\$effect\(/g

const ANGULAR_CALL_FORBIDDEN = ['signal', 'computed', 'effect', 'inject']
const ANGULAR_HOOK_RE =
	/\bng(OnChanges|OnInit|DoCheck|AfterContentInit|AfterContentChecked|AfterViewInit|AfterViewChecked|OnDestroy)\b/g

const GUARDS: TGuard[] = [
	{
		framework: 'Solid',
		dir: 'packages/ui/solid/src/components',
		extensions: /\.tsx?$/,
		test(source) {
			const names = importedNames(source, /^solid-js/)
			const found = SOLID_FORBIDDEN.filter((name) => names.has(name))

			// Сборка мимо `createSolidAdapterContext` теряет id монтирования
			// (`createUniqueId`) и локаль поддерева — как мимо
			// `createVueAdapterContext` у Vue
			if (importedNames(source, /^@soldy-ui\/setup$/).has('createAdapterContext')) {
				found.push('createAdapterContext (сборка — createSolidAdapterContext)')
			}

			return found
		},
	},
	{
		framework: 'Svelte',
		dir: 'packages/ui/svelte/src/components',
		// `.ts` — и setup-функции компонентов: сборку контекста зовут они
		extensions: /\.(svelte|ts)$/,
		test(source) {
			const names = importedNames(source, /^svelte$/)
			const found = SVELTE_IMPORT_FORBIDDEN.filter((name) => names.has(name))

			if (SVELTE_RUNE_RE.test(source)) found.push('$state/$derived/$effect')

			// Сборка мимо `createSvelteAdapterContext` теряет id монтирования
			// (`$props.id()`) и локаль поддерева — как мимо
			// `createVueAdapterContext` у Vue
			if (importedNames(source, /^@soldy-ui\/setup$/).has('createAdapterContext')) {
				found.push('createAdapterContext (сборка — createSvelteAdapterContext)')
			}

			return found
		},
	},
	{
		framework: 'Angular',
		dir: 'packages/ui/angular/src/components',
		extensions: /\.ts$/,
		test(source) {
			const names = importedNames(source, /^@angular\/core$/)
			const found = ANGULAR_CALL_FORBIDDEN.filter((name) => names.has(name))

			if (ANGULAR_HOOK_RE.test(source)) found.push('ngOn*/ngAfter*/ngDoCheck хуки')

			// Сборка мимо `createAngularAdapterContext` теряет локаль поддерева — как
			// мимо `createVueAdapterContext` у Vue
			if (importedNames(source, /^@soldy-ui\/setup$/).has('createAdapterContext')) {
				found.push('createAdapterContext (сборка — createAngularAdapterContext)')
			}

			return found
		},
	},
]

function collectFiles(dir: string, extensions: RegExp, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)
		const stat = statSync(full)

		if (stat.isDirectory()) {
			collectFiles(full, extensions, files)
		} else if (extensions.test(name)) {
			files.push(full)
		}
	}

	return files
}

function toRelative(file: string): string {
	return relative(ROOT, file).split('\\').join('/')
}

describe('framework mechanisms guard (components)', () => {
	for (const guard of GUARDS) {
		it(`${guard.framework}: запрещает механизмы фреймворка в src/components/**`, () => {
			const dir = join(ROOT, guard.dir)
			const violations = collectFiles(dir, guard.extensions)
				.map((file) => ({
					relPath: toRelative(file),
					source: stripComments(readFileSync(file, 'utf-8')),
				}))
				.map(({ relPath, source }) => ({ relPath, found: guard.test(source) }))
				.filter(({ found }) => found.length > 0)
				.map(({ relPath, found }) => `${relPath}: ${found.join(', ')}`)

			expect(
				violations,
				`Механизм фреймворка в src/components/** (см. AGENTS.md, "Механизмы` +
					` фреймворка — только в адаптерном слое"):\n${violations.join('\n')}`,
			).toEqual([])
		})
	}
})
