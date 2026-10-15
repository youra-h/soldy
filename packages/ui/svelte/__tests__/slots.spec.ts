/**
 * Слоты Svelte — snippet-пропы.
 *
 * Сниппеты слотов разметкой объявляются только в .svelte-файле — тестовой
 * обёртке Slots.test.svelte. Произвольное содержимое из кода теста даёт
 * `createRawSnippet`.
 */

import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import {
	createRawSnippet,
	mount,
	unmount,
	flushSync,
	type ComponentProps,
	type Snippet,
} from 'svelte'
import {
	ButtonDescriptor,
	type CheckBoxDescriptor,
	type DialogDescriptor,
	type InputDescriptor,
	type TabsDescriptor,
} from '@soldy-ui/setup'
import {
	Button,
	type CheckBoxProps,
	type FrameProps,
	type InputProps,
	type LabelProps,
	type SwitchProps,
	type UseDomProps,
} from '@soldy-ui/svelte'
import Harness from './Slots.test.svelte'
import { mount as mountComponent } from './mount'

const mounted: ReturnType<typeof mount>[] = []

function render(props: ComponentProps<typeof Harness> = {}): HTMLElement {
	const target = document.createElement('div')

	document.body.appendChild(target)
	mounted.push(mount(Harness, { target, props }))
	flushSync()

	return target
}

afterEach(() => {
	for (const app of mounted.splice(0).reverse()) void unmount(app)
	document.body.innerHTML = ''
})

const root = (target: HTMLElement) => target.firstElementChild as HTMLElement

describe('соответствие контракту', () => {
	it('обёртка передаёт ровно слоты дескриптора', () => {
		// children — это `default` контракта в терминах Svelte
		expect(
			ButtonDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		).toEqual(['default', 'leading', 'trailing'])
	})
})

describe('поведение слотов Button', () => {
	it('leading ставится перед текстом, trailing — после', () => {
		const el = root(render({ text: 'Mid', withLeading: true, withTrailing: true }))

		// Пробелы между узлами Svelte сохраняет — важен порядок, а не они
		expect(el.textContent?.replace(/\s+/g, '')).toBe('LMidT')
	})

	it('содержимое children переопределяет text', () => {
		const el = root(render({ text: 'ignored', withChildren: true }))

		expect(el.querySelector('.so-button__text')?.textContent?.trim()).toBe('Custom')
	})

	it('слот children получает scope с text', () => {
		const el = root(render({ text: 'Scoped', withScoped: true }))

		expect(el.querySelector('.so-button__text')?.textContent?.trim()).toBe('Scoped!')
	})

	it('без слота показывается text из props', () => {
		const el = root(render({ text: 'Fallback' }))

		expect(el.querySelector('.so-button__text')?.textContent?.trim()).toBe('Fallback')
	})
})

describe('слот не ограничивает содержимое', () => {
	/**
	 * `scope` в объявлении слота — данные, которые компонент передаёт ВНУТРЬ,
	 * а не тип содержимого. Положить можно что угодно.
	 */
	it('в children можно положить целую таблицу', () => {
		const el = mountComponent(Button, {
			text: 'ignored',
			children: createRawSnippet(() => ({
				render: () => '<table><tbody><tr><td>ячейка</td></tr></tbody></table>',
			})),
		}).root()

		expect(el.querySelector('.so-button__text table td')?.textContent).toBe('ячейка')
		expect(el.tagName.toLowerCase()).toBe('button')
	})

	it('scope доступен и при произвольной разметке', () => {
		const el = mountComponent(Button, {
			text: 'Заголовок',
			children: createRawSnippet((scope: () => { text: string }) => ({
				render: () => `<ul><li>${scope().text}</li></ul>`,
			})),
		}).root()

		expect(el.querySelector('.so-button__text li')?.textContent).toBe('Заголовок')
	})
})

describe('слоты не уходят в атрибуты корня', () => {
	it('leading и trailing не становятся атрибутами', () => {
		const el = root(render({ text: 'Mid', withLeading: true, withTrailing: true }))

		expect(el.hasAttribute('leading')).toBe(false)
		expect(el.hasAttribute('trailing')).toBe(false)
	})
})

describe('слот важнее одноимённого атрибута HTML', () => {
	/**
	 * В Svelte слот — проп компонента, и его имя встречается с атрибутами
	 * `HTMLAttributes`. `title` там — строка: пересечение свело бы слот
	 * заголовка окна к строке, и сниппет в него было бы не передать.
	 * `UseDomProps` вычитает из атрибутов имена слотов, как и пропсов.
	 *
	 * Тип проверяет не vitest, а шаг CI «Типы — Svelte».
	 */
	it('title по DialogDescriptor и content по TabsDescriptor — сниппеты, а не строки атрибута', () => {
		expectTypeOf<UseDomProps<typeof DialogDescriptor>['title']>().toEqualTypeOf<
			Snippet | undefined
		>()
		expectTypeOf<UseDomProps<typeof TabsDescriptor>['content']>().toEqualTypeOf<
			Snippet | undefined
		>()
	})
})

describe('содержимое — только слот default', () => {
	/**
	 * `children` в Svelte — это слот `default`, и ничего больше. Компонент, чья
	 * разметка содержимого не рисует, слота не объявляет, и `children` в его
	 * пропсах нет — ни из слотов, ни из атрибутов DOM: `UseDomProps` вычитает
	 * его всегда. Подпись контрола — `Label` вложением.
	 *
	 * Тип проверяет не vitest, а шаг CI «Типы — Svelte».
	 */
	it('у CheckBox и Input children нет, у Frame — есть: его разметка содержимое рисует', () => {
		expectTypeOf<UseDomProps<typeof CheckBoxDescriptor>>().not.toHaveProperty('children')
		expectTypeOf<UseDomProps<typeof InputDescriptor>>().not.toHaveProperty('children')
		expectTypeOf<FrameProps>().toHaveProperty('children')
		expectTypeOf<FrameProps['children']>().toEqualTypeOf<Snippet | undefined>()
	})

	/**
	 * То же у самих полей: их атрибуты — атрибуты `<input>` (`TFieldAttributes`),
	 * и `children` нет и там. Подпись поля — `Label`, а её `children` — сам
	 * контрол.
	 */
	it('у CheckBox, Switch и Input children нет, у Label — есть: в нём контрол', () => {
		expectTypeOf<CheckBoxProps>().not.toHaveProperty('children')
		expectTypeOf<SwitchProps>().not.toHaveProperty('children')
		expectTypeOf<InputProps>().not.toHaveProperty('children')
		expectTypeOf<LabelProps>().toHaveProperty('children')
		expectTypeOf<LabelProps['children']>().toEqualTypeOf<Snippet | undefined>()
	})
})

describe('атрибуты поля — атрибуты его <input>', () => {
	/**
	 * Текст, отметку и «выбрано частично» поле берёт из ядра, и атрибутов для
	 * них и их умолчаний у него нет: это был бы второй путь к тому же
	 * состоянию. Обычные атрибуты `<input>` есть — они ложатся на поле.
	 *
	 * Тип проверяет не vitest, а шаг CI «Типы — Svelte».
	 */
	it('checked, indeterminate и умолчания — не атрибуты; autocomplete и minlength — атрибуты', () => {
		expectTypeOf<CheckBoxProps>().not.toHaveProperty('checked')
		expectTypeOf<SwitchProps>().not.toHaveProperty('indeterminate')
		expectTypeOf<InputProps>().not.toHaveProperty('defaultValue')
		expectTypeOf<CheckBoxProps>().not.toHaveProperty('defaultChecked')
		expectTypeOf<InputProps>().toHaveProperty('autocomplete')
		expectTypeOf<InputProps>().toHaveProperty('minlength')
	})
})
