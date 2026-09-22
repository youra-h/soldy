/**
 * RadioGroup во Vue: нативные радио и проводка наборов.
 *
 * Радио — `input[type=radio]` внутри корня-`label`. Группу для браузера
 * собирает общий `name`, который считает ядро; отметку сообщает нативный
 * `checked`, выключенность — нативный `disabled`. ARIA-дублей у поля нет, а
 * состояние для темы лежит на корне (`data-selected`, `data-disabled`).
 *
 * Клавиатуру группы (стрелки, пропуск выключенных, одну остановку Tab) jsdom
 * не выполняет — её проверяет `playground/vue/browser/radio-group.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { RadioGroup, RadioGroupItem } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Радио на странице по порядку. */
const radios = (): HTMLInputElement[] =>
	[...document.querySelectorAll('.s-radio-group-item__input')].filter(
		(element): element is HTMLInputElement => element instanceof HTMLInputElement,
	)

/** Радио по значению; нет его — тест падает здесь. */
const radioOf = (value: string): HTMLInputElement => {
	const radio = radios().find((candidate) => candidate.value === value)

	if (!radio) throw new Error(`радио «${value}» нет`)

	return radio
}

/** Корень радио — `label`, на нём состояние для темы. */
const rootOf = (value: string): HTMLElement => {
	const root = radioOf(value).closest('.s-radio-group-item')

	if (!(root instanceof HTMLElement)) throw new Error(`корня радио «${value}» нет`)

	return root
}

/** Значения отмеченных радио — по нативному `checked`. */
const checked = () =>
	radios()
		.filter((radio) => radio.checked)
		.map((radio) => radio.value)

/** Выбор пользователя: браузер отмечает радио и шлёт `change`. */
const choose = async (value: string) => {
	const radio = radioOf(value)

	radio.checked = true
	radio.dispatchEvent(new Event('change', { bubbles: true }))

	await nextTick()
}

/**
 * Группа с тремя радио и подписями. `value` — пропом, как `v-model:value`
 * снаружи; «B» выключается пропом `itemOff`, вся группа — `groupOff`.
 */
const Harness = {
	components: { RadioGroup, RadioGroupItem },
	props: {
		value: { type: String, default: undefined },
		itemOff: Boolean,
		groupOff: Boolean,
	},
	emits: ['update:value'],
	template: `
		<RadioGroup
			:value="value"
			:disabled="groupOff"
			@update:value="$emit('update:value', $event)"
		>
			<RadioGroupItem value="a">Первый</RadioGroupItem>
			<RadioGroupItem value="b" :disabled="itemOff">Второй</RadioGroupItem>
			<RadioGroupItem value="c">Третий</RadioGroupItem>
		</RadioGroup>
	`,
}

type THarnessProps = { value?: string; itemOff?: boolean; groupOff?: boolean }

const render = async (props: THarnessProps = {}) => {
	const mounted = mount(Harness, { props, attachTo: document.body })

	wrapper = mounted
	await nextTick()

	return mounted
}

describe('группа для браузера', () => {
	it('корень — role="radiogroup", радио — нативные input[type=radio]', async () => {
		await render()

		expect(document.querySelector('.s-radio-group')?.getAttribute('role')).toBe('radiogroup')
		expect(radios().map((radio) => radio.type)).toEqual(['radio', 'radio', 'radio'])
	})

	/** Без общего `name` браузер не соберёт радио в группу. */
	it('у всех радио один непустой name', async () => {
		await render()

		const names = new Set(radios().map((radio) => radio.name))

		expect(names.size).toBe(1)
		expect([...names][0]).not.toBe('')
	})

	it('две группы на странице получают разные name', async () => {
		wrapper = mount(
			{
				components: { RadioGroup, RadioGroupItem },
				template: `
					<div>
						<RadioGroup><RadioGroupItem value="a" /></RadioGroup>
						<RadioGroup><RadioGroupItem value="a" /></RadioGroup>
					</div>
				`,
			},
			{ attachTo: document.body },
		)
		await nextTick()

		const [first, second] = radios()

		expect(first.name).not.toBe(second.name)
	})

	it('name группы уходит радио', async () => {
		wrapper = mount(
			{
				components: { RadioGroup, RadioGroupItem },
				template: `
					<RadioGroup name="delivery">
						<RadioGroupItem value="a" />
						<RadioGroupItem value="b" />
					</RadioGroup>
				`,
			},
			{ attachTo: document.body },
		)
		await nextTick()

		expect(radios().map((radio) => radio.name)).toEqual(['delivery', 'delivery'])
	})
})

describe('v-model:value ↔ checked', () => {
	it('значение группы отмечает своё радио', async () => {
		await render({ value: 'b' })

		expect(checked()).toEqual(['b'])
	})

	it('смена значения снаружи переносит отметку', async () => {
		const mounted = await render({ value: 'a' })

		await mounted.setProps({ value: 'c' })

		expect(checked()).toEqual(['c'])
	})

	it('выбор пользователя (change) отдаёт update:value', async () => {
		const mounted = await render({ value: 'a' })

		await choose('c')

		expect(mounted.emitted('update:value')?.at(-1)).toEqual(['c'])
		expect(checked()).toEqual(['c'])
	})

	it('без значения не отмечено ничего', async () => {
		await render()

		expect(checked()).toEqual([])
	})

	/**
	 * Настоящий `v-model` у потребителя. Радио уходят из группы и при её
	 * размонтировании, и по `v-if` по одному — это не выбор «ничего», и
	 * значение потребителя переживает и то и другое.
	 */
	describe('значение потребителя переживает уход радио', () => {
		const Model = defineComponent({
			components: { RadioGroup, RadioGroupItem },
			data: () => ({ picked: 'b' as string | undefined, group: true, second: true }),
			template: `
				<RadioGroup v-if="group" v-model:value="picked">
					<RadioGroupItem value="a" />
					<RadioGroupItem v-if="second" value="b" />
				</RadioGroup>
			`,
		})

		const renderModel = async () => {
			const mounted = mount(Model, { attachTo: document.body })

			wrapper = mounted
			await nextTick()

			return mounted.vm
		}

		it('выбор пишет v-model', async () => {
			const vm = await renderModel()

			await choose('a')

			expect(vm.picked).toBe('a')
		})

		it('размонтирование группы не стирает значение', async () => {
			const vm = await renderModel()

			vm.group = false
			await nextTick()

			expect(vm.picked).toBe('b')
		})

		it('отмеченное радио ушло и вернулось — значение и отметка на месте', async () => {
			const vm = await renderModel()

			vm.second = false
			await nextTick()

			expect(vm.picked).toBe('b')
			expect(checked()).toEqual([])

			vm.second = true
			await nextTick()

			expect(checked()).toEqual(['b'])
		})
	})
})

describe('выключенное радио', () => {
	it('нативный disabled без aria-disabled', async () => {
		await render({ itemOff: true })

		expect(radioOf('b').disabled).toBe(true)
		expect(radioOf('b').hasAttribute('aria-disabled')).toBe(false)
		expect(radioOf('a').disabled).toBe(false)
	})

	it('выключенная группа выключает все радио', async () => {
		await render({ groupOff: true })

		expect(radios().map((radio) => radio.disabled)).toEqual([true, true, true])
		expect(radios().some((radio) => radio.hasAttribute('aria-disabled'))).toBe(false)
	})

	/** ARIA и роль нативного радио — дубли, их нет. */
	it('у радио нет ни role, ни aria-checked', async () => {
		await render({ value: 'a' })

		for (const radio of radios()) {
			expect(radio.hasAttribute('role')).toBe(false)
			expect(radio.hasAttribute('aria-checked')).toBe(false)
		}
	})
})

describe('состояние для темы — на корне радио', () => {
	it('корень — label с data-selected и data-disabled', async () => {
		await render({ value: 'a', itemOff: true })

		expect(rootOf('a').tagName).toBe('LABEL')
		expect(rootOf('a').dataset.selected).toBe('true')
		expect(rootOf('b').dataset.selected).toBe('false')
		expect(rootOf('b').dataset.disabled).toBe('true')
		expect(rootOf('a').dataset.disabled).toBe('false')
	})

	it('отметка переезжает вместе с выбором', async () => {
		await render({ value: 'a' })

		await choose('c')

		expect(rootOf('a').dataset.selected).toBe('false')
		expect(rootOf('c').dataset.selected).toBe('true')
	})

	it('вид группы — модификатор корня каждого радио', async () => {
		wrapper = mount(
			{
				components: { RadioGroup, RadioGroupItem },
				template: `
					<RadioGroup view="halo" size="lg">
						<RadioGroupItem value="a" />
					</RadioGroup>
				`,
			},
			{ attachTo: document.body },
		)
		await nextTick()

		expect(rootOf('a').classList).toContain('s-radio-group-item--view-halo')
		expect(rootOf('a').classList).toContain('s-radio-group-item--size-lg')
	})
})

describe('подпись', () => {
	/** Подпись внутри `label` — клик по ней выбирает радио, текст становится именем. */
	it('текст слота лежит внутри корня-label', async () => {
		await render()

		const text = rootOf('a').querySelector('.s-radio-group-item__text')

		expect(text?.textContent).toBe('Первый')
	})

	/**
	 * Пустую обёртку тема прячет по `:empty`. Пробельный текст вокруг слота
	 * сделал бы её непустой, и рядом с одиноким кольцом остался бы зазор.
	 */
	it('без подписи обёртка пуста — ни текста, ни элементов', async () => {
		wrapper = mount(
			{
				components: { RadioGroup, RadioGroupItem },
				template: `<RadioGroup><RadioGroupItem value="a" aria_label="Первый" /></RadioGroup>`,
			},
			{ attachTo: document.body },
		)
		await nextTick()

		const text = rootOf('a').querySelector('.s-radio-group-item__text')

		expect(text?.textContent).toBe('')
		expect(text?.children).toHaveLength(0)
		// Имя радио без подписи — на самом поле
		expect(radioOf('a').getAttribute('aria-label')).toBe('Первый')
	})

	/** Подпись в соседнем элементе ссылается на поле через `for`. */
	it('сквозной id уходит на поле, а не на корень', async () => {
		wrapper = mount(
			{
				components: { RadioGroup, RadioGroupItem },
				template: `<RadioGroup><RadioGroupItem id="pick-a" value="a" /></RadioGroup>`,
			},
			{ attachTo: document.body },
		)
		await nextTick()

		expect(radioOf('a').id).toBe('pick-a')
		expect(rootOf('a').id).toBe('')
	})

	it('радио из пропа items подписывает слот item со scope', async () => {
		wrapper = mount(RadioGroup, {
			props: {
				value: 'b',
				items: [{ value: 'a' }, { value: 'b' }],
			},
			slots: {
				item: `<template #item="{ item }">Вариант {{ item.value }}</template>`,
			},
			attachTo: document.body,
		})
		await nextTick()

		expect(
			[...document.querySelectorAll('.s-radio-group-item__text')].map(
				(text) => text.textContent,
			),
		).toEqual(['Вариант a', 'Вариант b'])
		expect(checked()).toEqual(['b'])
	})
})

describe('группа имени', () => {
	it('aria_label группы — на корне с ролью radiogroup', async () => {
		wrapper = mount(
			{
				components: { RadioGroup, RadioGroupItem },
				template: `<RadioGroup aria_label="Доставка"><RadioGroupItem value="a" /></RadioGroup>`,
			},
			{ attachTo: document.body },
		)
		await nextTick()

		const root = document.querySelector('[role="radiogroup"]')

		expect(root?.getAttribute('aria-label')).toBe('Доставка')
	})
})
