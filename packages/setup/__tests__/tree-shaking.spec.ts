/**
 * Сторож tree-shaking: приложение с одной кнопкой не тянет плагины и дескрипторы Select.
 *
 * Каждый файл дескриптора зовёт `defineDescriptor` / `definePlugin` на верхнем
 * уровне модуля, и без `"sideEffects": false` в `package.json` сборщик обязан
 * сохранить все модули бочки: бандл с одним `ButtonDescriptor` весил 466 KiB.
 *
 * Падает, если флаг убрали или если в пакете появился импорт ради побочного
 * эффекта, который снова связал кнопку со всеми дескрипторами. `@soldy/core`
 * флага пока не объявляет, поэтому сверяется состав модулей setup и plugins, а
 * не общий размер.
 */

import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { build } from 'esbuild'

const PACKAGES = resolve(__dirname, '../..')

const ALIAS = {
	'@soldy/setup': resolve(PACKAGES, 'setup/index.ts'),
	'@soldy/core': resolve(PACKAGES, 'core/src/index.ts'),
	'@soldy/plugins': resolve(PACKAGES, 'plugins/src/index.ts'),
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

describe('tree-shaking @soldy/setup', () => {
	it('бандл с одним ButtonDescriptor не содержит дескрипторов и плагинов Select', async () => {
		const modules = await bundledModules(
			"import { ButtonDescriptor } from '@soldy/setup'\nconsole.log(ButtonDescriptor().props.length)\n",
		)

		// Разбор не вхолостую: сама кнопка в бандле есть
		expect(modules).toContain('setup/descriptors/components/button.descriptor.ts')

		const ours = modules.filter(
			(file) => file.startsWith('setup/') || file.startsWith('plugins/'),
		)

		expect(ours.filter((file) => file.includes('select'))).toEqual([])
		expect(modules.filter((file) => file.startsWith('setup/adapter/'))).toEqual([])
	})
})
