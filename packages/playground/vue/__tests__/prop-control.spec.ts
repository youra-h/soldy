/**
 * Числовое поле строки стенда: набранное в нём остаётся как набрано, а в
 * модель уходит только законченное число.
 *
 * Раньше поле переводило каждое нажатие в `Number(text)` и рисовало текст из
 * модели: `-`, `.` и `0,` давали в поле `NaN`, набирать дальше было не во что,
 * и дробь в строках `step` и `value` можно было только вставить. Правило
 * разбора проверяет `playground/shared/__tests__/props.spec.ts`, здесь — что
 * поле его держит: текст не переписывается ни посреди записи, ни после неё.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { TPropControl } from '@soldy-ui/playground-shared'
import PropControl from '../src/components/PropControl.vue'

/** Поле Input слушает ввод с `element:ready`, а оно приходит кадром. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

const control: TPropControl = { scope: 'component', name: 'step', kind: 'number', description: '' }

let wrapper: VueWrapper | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

/** Поле строки с `v-model`, как у `PropRow`: значение возвращается пропом. */
async function render(modelValue: unknown) {
	const mounted = mount(PropControl, {
		props: {
			control,
			modelValue,
			'onUpdate:modelValue': (value: unknown) => mounted.setProps({ modelValue: value }),
		},
		attachTo: document.body,
	})

	wrapper = mounted

	await nextTick()
	await nextFrame()

	return mounted
}

function field(mounted: VueWrapper): HTMLInputElement {
	const node = mounted.find('input').element

	if (!(node instanceof HTMLInputElement)) throw new Error('поля нет')

	return node
}

/** Набор по знаку, как с клавиатуры: каждый знак — свой `input`. После знака — текст поля. */
async function type(mounted: VueWrapper, text: string): Promise<string[]> {
	const input = field(mounted)
	const shown: string[] = []

	input.value = ''

	for (const char of text) {
		input.value += char
		input.dispatchEvent(new Event('input', { bubbles: true }))
		await nextTick()
		shown.push(input.value)
	}

	return shown
}

/** Что ушло в модель — по порядку. */
const emitted = (mounted: VueWrapper) =>
	(mounted.emitted('update:modelValue') ?? []).map(([value]) => value)

describe('числовое поле', () => {
	it.each([
		['0.5', 0.5],
		['.5', 0.5],
		['0,5', 0.5],
		['-1', -1],
		['1e1', 10],
	])('«%s» — текст поля после каждого знака как набран, в модели — %s', async (text, number) => {
		const mounted = await render(1)

		const shown = await type(mounted, text)

		expect(shown).toEqual([...text].map((_, index) => text.slice(0, index + 1)))
		expect(emitted(mounted).at(-1)).toBe(number)
		expect(emitted(mounted).filter((value) => Number.isNaN(value))).toEqual([])
	})

	it('незаконченная запись модель не трогает', async () => {
		const mounted = await render(1)

		await type(mounted, '-')

		expect(emitted(mounted)).toEqual([])
		expect(mounted.props('modelValue')).toBe(1)
	})

	it('стёртое поле — «не задано»', async () => {
		const mounted = await render(1)
		const input = field(mounted)

		input.value = ''
		input.dispatchEvent(new Event('input', { bubbles: true }))
		await nextTick()

		expect(emitted(mounted)).toEqual([undefined])
		expect(input.value).toBe('')
	})

	it('значение, сменённое не этим полем, поле показывает', async () => {
		const mounted = await render(1)

		await type(mounted, '0,')
		await mounted.setProps({ modelValue: 2 })

		expect(field(mounted).value).toBe('2')
	})
})
