import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { build } from 'vite'
import { libConfig } from '../../vite/lib.config.ts'
import { clientDirective } from '../plugin.ts'
import {
	findClientModules,
	hasClientDirective,
	importsOfModule,
	isReactSpecifier,
	reachesReact,
	reexportsOnly,
} from '../client-directive.ts'
import type { TBuiltModule, TModuleImports } from '../client-directive.ts'

/**
 * The rule of `client-directive.ts` on fixtures, and the plugin on a build of
 * `fixture/`. The built React adapter is checked by `workspace.spec.ts` next to
 * it.
 */

/** A graph of modules for `reachesReact`: a module → what it imports. */
function graph(edges: Readonly<Record<string, Partial<TModuleImports>>>) {
	return (module: string): TModuleImports => ({
		modules: edges[module]?.modules ?? [],
		packages: edges[module]?.packages ?? [],
	})
}

describe('React — сам пакет и его подпути', () => {
	it.each(['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'])(
		'%s — React',
		(name) => {
			expect(isReactSpecifier(name)).toBe(true)
		},
	)

	it.each(['react-is', 'preact', '@soldy-ui/react', '@soldy-ui/setup', './react.js'])(
		'%s — не React',
		(name) => {
			expect(isReactSpecifier(name)).toBe(false)
		},
	)
})

describe('React достижим через импорты', () => {
	const importsOf = graph({
		'button.js': { modules: ['setup.js', 'helpers.js'], packages: ['react/jsx-runtime'] },
		'setup.js': { modules: ['hooks.js'], packages: ['@soldy-ui/setup'] },
		'hooks.js': { packages: ['react'] },
		'helpers.js': { packages: ['@soldy-ui/core'] },
		'a.js': { modules: ['b.js'] },
		'b.js': { modules: ['a.js'] },
	})

	it('свой импорт React', () => {
		expect(reachesReact('hooks.js', importsOf)).toBe(true)
	})

	it('импорт модуля, которому нужен React, — на любой глубине', () => {
		expect(reachesReact('setup.js', importsOf)).toBe(true)
	})

	it('соседи по скоупу — не React, и вглубь пакетов обход не идёт', () => {
		expect(reachesReact('helpers.js', importsOf)).toBe(false)
	})

	it('цикл импортов не зацикливает обход', () => {
		expect(reachesReact('a.js', importsOf)).toBe(false)
	})
})

describe('директива — в прологе модуля', () => {
	it.each([
		['первой строкой', '"use client";\nimport { a } from "./a.js";'],
		['в одинарных кавычках, без точки с запятой', "'use client'\nexport const a = 1"],
		['после комментария', '// the component\n"use client";\nexport const a = 1'],
		['после другой директивы', '"use strict";\n"use client";\nexport const a = 1'],
	])('%s — есть', (_title, text) => {
		expect(hasClientDirective(text)).toBe(true)
	})

	it.each([
		['после импорта', 'import { a } from "./a.js";\n"use client";'],
		['строкой в коде', 'export const directive = "use client";'],
		['другая директива', '"use server";\nexport async function save() {}'],
		['нет вовсе', 'export const a = 1'],
	])('%s — нет', (_title, text) => {
		expect(hasClientDirective(text)).toBe(false)
	})
})

describe('модуль из одних импортов и экспортов сам ничего не исполняет', () => {
	it.each([
		['импорты и список экспорта', 'import { a } from "./a.js";\nexport { a };'],
		['реэкспорт', 'export { a } from "./a.js";\nexport * from "./b.js";'],
		['с директивой', '"use client";\nexport * as ns from "./a.js";'],
	])('%s — только реэкспорт', (_title, text) => {
		expect(reexportsOnly(text)).toBe(true)
	})

	it.each([
		['вызов', 'import { a } from "./a.js";\nconst b = withParts(a, {});\nexport { b };'],
		['объявление', 'export const a = 1'],
		['функция', 'export function a() {}'],
		['экспорт по умолчанию', 'import { a } from "./a.js";\nexport default a;'],
	])('%s — свой код', (_title, text) => {
		expect(reexportsOnly(text)).toBe(false)
	})
})

describe('импорты модуля сборки — по тексту', () => {
	it('относительный путь — модуль сборки от папки модуля, остальное — пакеты', () => {
		const module: TBuiltModule = {
			path: 'dist/components/button/Button.js',
			text: [
				'import { toRootProps } from "../../adapter/common/root.js";',
				'import { useSetupButton } from "./setup.component.js";',
				'import { jsx } from "react/jsx-runtime";',
				'export { Toasts } from "../toasts/Toasts.js";',
				'const lazy = () => import("./lazy.js");',
			].join('\n'),
		}

		expect(importsOfModule(module)).toEqual({
			modules: [
				'dist/adapter/common/root.js',
				'dist/components/button/setup.component.js',
				'dist/components/toasts/Toasts.js',
				'dist/components/button/lazy.js',
			],
			packages: ['react/jsx-runtime'],
		})
	})
})

/** The modules of a build of `fixture/` through `clientDirective`, by file name. */
async function buildFixture(): Promise<Map<string, string>> {
	const config = libConfig({
		name: 'fixture',
		root: resolve(__dirname, 'fixture'),
		entry: 'src/index.ts',
		external: ['react'],
		plugins: [clientDirective()],
	})
	const result = await build({
		...config,
		configFile: false,
		logLevel: 'silent',
		build: { ...config.build, write: false },
	})
	const outputs = (Array.isArray(result) ? result : [result]).flatMap((entry) =>
		'output' in entry ? entry.output : [],
	)
	const modules = new Map<string, string>()

	for (const output of outputs) {
		if (output.type === 'chunk') {
			modules.set(output.fileName, output.code)
		}
	}

	return modules
}

describe('плагин сборки', () => {
	it('открывает директивой модули, которым нужен React, — и только их', async () => {
		const modules = await buildFixture()
		const marked = [...modules].filter(([, code]) => hasClientDirective(code))

		expect(marked.map(([file]) => file).sort()).toEqual(
			['button.js', 'context.js', 'hooks.js', 'item.js', 'list.js'].sort(),
		)
		// The directive opens the module, ahead of its imports, and only once:
		// the bundle keeps the one `context.ts` writes itself
		for (const [file, code] of marked) {
			expect(code.startsWith('"use client";\n'), file).toBe(true)
			expect(code.match(/["']use client["']/g), file).toHaveLength(1)
		}
	})

	it('отметки сборки совпадают с тем, что правило читает из её файлов', async () => {
		const modules = [...(await buildFixture())].map(([path, text]) => ({ path, text }))
		const marked = modules
			.filter(({ text }) => hasClientDirective(text))
			.map(({ path }) => path)

		expect(findClientModules(modules).sort()).toEqual(marked.sort())
	})
})
