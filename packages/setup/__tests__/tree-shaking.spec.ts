/**
 * Tree-shaking guard: an application with one button does not pull the plugins
 * and descriptors of Select.
 *
 * Every descriptor file calls `defineDescriptor` / `definePlugin` at the top
 * level of its module, and without `"sideEffects": false` in `package.json`
 * the bundler has to keep every module of the barrel: a bundle with one
 * `ButtonDescriptor` weighed 466 KiB.
 *
 * Fails if the flag is removed or if the package gets an import for a side
 * effect that ties the button to all descriptors again. The modules of setup
 * and plugins are compared, not the total size. The flag of every library
 * package and the bundle of one button from each adapter are checked by
 * `tools/side-effects`.
 *
 * The second guard here is about the build: the consumer gets `dist`, not the
 * sources, and a package glued into one file loses all of the above. A glued
 * `@soldy-ui/setup` gave the button 420 KiB instead of 224 KiB — together with
 * the descriptors of Select, Tabs and Accordion.
 */

import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import { libConfig } from '../../../tools/vite/lib.config'

const PACKAGES = resolve(__dirname, '../..')

const ALIAS = {
	'@soldy-ui/setup': resolve(PACKAGES, 'setup/index.ts'),
	'@soldy-ui/core': resolve(PACKAGES, 'core/src/index.ts'),
	'@soldy-ui/plugins': resolve(PACKAGES, 'plugins/src/index.ts'),
}

/** Модули, попавшие в бандл с ненулевым весом, — путями от `packages/`. */
async function bundledModules(source: string): Promise<string[]> {
	const result = await build({
		stdin: { contents: source, resolveDir: __dirname, loader: 'ts' },
		// Пути в метафайле — от `packages/`, где бы ни запускали тест
		absWorkingDir: PACKAGES,
		bundle: true,
		format: 'esm',
		write: false,
		metafile: true,
		logLevel: 'silent',
		alias: ALIAS,
	})

	const [output] = Object.values(result.metafile.outputs)

	return Object.entries(output.inputs)
		.filter(([, input]) => input.bytesInOutput > 0)
		.map(([file]) =>
			file
				.split('\\')
				.join('/')
				.replace(/^.*packages\//, ''),
		)
}

describe('tree-shaking @soldy-ui/setup', () => {
	it('бандл с одним ButtonDescriptor не содержит дескрипторов и плагинов Select', async () => {
		const modules = await bundledModules(
			"import { ButtonDescriptor } from '@soldy-ui/setup'\nconsole.log(ButtonDescriptor().props.length)\n",
		)

		// Разбор не вхолостую: сама кнопка в бандле есть
		expect(modules).toContain('setup/content/descriptors/components/button.descriptor.ts')

		const ours = modules.filter(
			(file) => file.startsWith('setup/') || file.startsWith('plugins/'),
		)

		expect(ours.filter((file) => file.includes('select'))).toEqual([])
		expect(modules.filter((file) => file.startsWith('setup/protected/adapter/'))).toEqual([])
	})

	/**
	 * Окно (`Virtual`) нужно немногим спискам, и его код — стратегия, плагин
	 * замера, проводка обёртки — уезжает в сборку приложения только вместе с
	 * обёрткой. Коллекция подхватывает окно расширением, которое импортирует
	 * лишь ключ лифта и типы.
	 */
	it.each(['ListBox', 'Select'])(
		'бандл %s без Virtual не содержит модулей окна',
		async (name) => {
			// Компонент так, как его собирает адаптер: свой дескриптор и дескриптор
			// коллекции, проводка коллекции и подхват окна
			const component =
				`import { ${name}Descriptor, ${name}CollectionDescriptor, TCollectionExtension, TVirtualCollectionExtension } from '@soldy-ui/setup'\n` +
				`console.log(${name}Descriptor().props.length, ${name}CollectionDescriptor().props.length, TCollectionExtension, TVirtualCollectionExtension)\n`
			const withVirtual =
				"import { VirtualDescriptor, TVirtualExtension } from '@soldy-ui/setup'\n" +
				'console.log(VirtualDescriptor().props.length, TVirtualExtension)\n'

			const window = (modules: string[]): string[] =>
				modules.filter(
					(file) =>
						file.startsWith('plugins/src/custom/virtual/') ||
						file === 'setup/content/extensions/virtual/virtual.extension.class.ts' ||
						file === 'setup/content/descriptors/components/virtual.descriptor.ts',
				)

			const modules = await bundledModules(component)

			// Разбор не вхолостую: подхват окна в бандле есть, а у обёртки — весь её код
			expect(modules).toContain(
				'setup/content/extensions/virtual/virtual-collection.extension.class.ts',
			)
			expect(window(await bundledModules(withVirtual))).toHaveLength(3)

			expect(window(modules)).toEqual([])
		},
	)

	// Сборка обязана сохранить ту же гранулярность: отбор выше идёт по модулям,
	// и у склеенного в один файл пакета отбрасывать нечего
	it('сборка пакета кладёт в dist модуль на модуль, а не один файл', () => {
		const { build: config } = libConfig({
			name: '@soldy-ui/setup',
			root: resolve(PACKAGES, 'setup'),
			entry: 'index.ts',
		})
		const output = config?.rollupOptions?.output

		expect(Array.isArray(output)).toBe(false)
		expect(output).toMatchObject({ preserveModules: true })
	})
})
