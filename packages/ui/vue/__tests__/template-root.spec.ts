/**
 * Корень компонента — один узел и в разработке.
 *
 * В разработке Vue оставляет комментарии шаблона, в сборке для продакшена
 * вырезает. Комментарий рядом с корнем делает корнем рендера фрагмент
 * «комментарий + элемент» — компилятор помечает его `DEV_ROOT_FRAGMENT`, — а в
 * продакшене корень снова один элемент. Разработка и продакшен расходятся:
 * `$el` компонента — текстовый якорь фрагмента, `wrapper.element` в
 * `@vue/test-utils` — родитель, а не корень. Поэтому комментарий о корне
 * пишется внутри него, первым узлом.
 *
 * Сторож спрашивает компилятор, а не ищет комментарии сам: шаблон каждого
 * компонента компилируется с `comments: true`, и флага нет у корня рендера — ни
 * у него самого, ни у ветки `v-if` на корне. Ветку `v-if` глубже корня
 * комментарий перед ней тоже делает фрагментом, но корень компонента от этого
 * не меняется, и она не проверяется. Исключений нет: корень Frame —
 * `teleport`, DragAndDrop — слот, это один узел, а не фрагмент.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { compileTemplate, parse, type SFCTemplateCompileResults } from 'vue/compiler-sfc'

/** `PatchFlags.DEV_ROOT_FRAGMENT` из `@vue/shared`: во фрагменте, кроме комментариев, один узел. */
const DEV_ROOT_FRAGMENT = 2048

const COMPONENTS = resolve(import.meta.dirname, '../src/components')

type TCodegenNode = NonNullable<NonNullable<SFCTemplateCompileResults['ast']>['codegenNode']>

/** Флаг у корня рендера: у самого узла или у ветки `v-if` на корне. */
function flaggedRoot(node: TCodegenNode | undefined): boolean {
	if (!node) return false
	// Вызов рендера узла (`createElementBlock` и соседи) — флаг несёт он.
	// Отрицательные флаги (`CACHED`, `BAIL`) — не маска: так читает и рантайм Vue.
	if ('patchFlag' in node) {
		const flags = node.patchFlag ?? 0

		return flags > 0 && (flags & DEV_ROOT_FRAGMENT) !== 0
	}
	// `v-if` на корне: корнем рендера становится одна из веток.
	if ('branches' in node) return flaggedRoot(node.codegenNode)
	if ('consequent' in node) return flaggedRoot(node.consequent) || flaggedRoot(node.alternate)

	return false
}

/** Корень рендера шаблона с комментариями — фрагмент только из-за них. */
function devRootFragment(source: string, filename: string): boolean {
	const { ast, errors } = compileTemplate({
		source,
		filename,
		id: filename,
		compilerOptions: { comments: true },
	})

	expect(errors).toEqual([])

	return flaggedRoot(ast?.codegenNode)
}

/** Шаблоны компонентов — путь от `src/components`, через `/`. */
const templates = readdirSync(COMPONENTS, { recursive: true, encoding: 'utf8' })
	.filter((file) => file.endsWith('.vue'))
	.map((file) => file.split(sep).join('/'))
	.sort()

describe('корень шаблона компонента — один узел и с комментариями', () => {
	it.each(templates)('%s', (file) => {
		const { descriptor } = parse(readFileSync(join(COMPONENTS, file), 'utf8'), {
			filename: file,
		})

		if (!descriptor.template) throw new Error(`${file}: нет <template>`)

		expect(devRootFragment(descriptor.template.content, file)).toBe(false)
	})
})

describe('проверка срабатывает', () => {
	it('комментарий над корнем — корень рендера фрагмент', () => {
		expect(devRootFragment('<!-- корень --><div><span /></div>', 'above.vue')).toBe(true)
	})

	it('комментарий перед веткой v-else на корне — фрагмент в этой ветке', () => {
		expect(
			devRootFragment('<div v-if="on" /><!-- иначе --><span v-else />', 'branch.vue'),
		).toBe(true)
	})

	it('комментарий внутри корня — корень остаётся элементом', () => {
		expect(devRootFragment('<div><!-- корень --><span /></div>', 'inside.vue')).toBe(false)
	})
})
