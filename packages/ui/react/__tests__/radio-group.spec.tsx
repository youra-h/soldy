/**
 * RadioGroup в React: нативные радио и проводка наборов.
 *
 * Сценарии — те же, что у Vue (`radio-group.spec.ts`). Радио —
 * `input[type=radio]` внутри корня-`label`. Группу для браузера собирает общий
 * `name`, который раздаёт плагин группы; отметку сообщает нативный `checked`,
 * выключенность — нативный `disabled`. ARIA-дублей у поля нет, а состояние для
 * темы лежит на корне (`data-selected`, `data-disabled`).
 *
 * Своё у React — момент входа и выбор пользователя. Радио разметки входит в
 * коллекцию при коммите, поэтому отметку и `name` оно получает после него.
 * Выбор приходит `onChange` поля: React выводит его из клика по радио и
 * сверяет с отметкой, записанной в узел, — поэтому выбор здесь — клик, а не
 * событие `change`, как у Vue.
 *
 * Клавиатуру группы (стрелки, пропуск выключенных, одну остановку Tab) jsdom
 * не выполняет — её проверяет `playground/vue/browser/radio-group.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { StrictMode, act, useState, type ReactNode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TRadioGroup, type TRadioGroupValue } from '@soldy-ui/core'
import {
	RadioGroup,
	RadioGroupItem,
	type RadioGroupItemProps,
	type RadioGroupProps,
} from '@soldy-ui/react'
import { mount, track } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Радио на странице по порядку. */
const radios = (): HTMLInputElement[] =>
	[...document.querySelectorAll('.s-radio-group-item__input')].filter(
		(element): element is HTMLInputElement => element instanceof HTMLInputElement,
	)

/** Радио по значению; нет его — тест падает здесь. */
function radioOf(value: string): HTMLInputElement {
	const radio = radios().find((candidate) => candidate.value === value)

	if (!radio) throw new Error(`радио «${value}» нет`)

	return radio
}

/** Корень радио — `label`, на нём состояние для темы. */
function rootOf(value: string): HTMLElement {
	const root = radioOf(value).closest('.s-radio-group-item')

	if (!(root instanceof HTMLElement)) throw new Error(`корня радио «${value}» нет`)

	return root
}

/** Значения отмеченных радио — по нативному `checked`. */
const checked = () =>
	radios()
		.filter((radio) => radio.checked)
		.map((radio) => radio.value)

/** Выбор пользователя: браузер отмечает радио по клику, React отдаёт `onChange`. */
function choose(value: string): void {
	act(() => radioOf(value).click())
}

/** Движок так, как его видит тест: состав радио по значениям. */
type TEngineView = { extensions: { batch: { items: readonly object[] } } }

type THarnessProps = Pick<RadioGroupProps, 'value' | 'onChangeValue'> & {
	/** Выключить радио «b». */
	itemOff?: boolean
	/** Выключить всю группу. */
	groupOff?: boolean
	onEngineCreate?: (engine: TEngineView) => void
}

/**
 * Группа с тремя радио и подписями. `value` — пропом, как значение
 * потребителя; «b» выключается пропом `itemOff`, вся группа — `groupOff`.
 */
function Harness({ itemOff, groupOff, ...group }: THarnessProps): ReactNode {
	return (
		<RadioGroup {...group} disabled={groupOff}>
			<RadioGroup.Item value="a">Первый</RadioGroup.Item>
			<RadioGroup.Item value="b" disabled={itemOff}>
				Второй
			</RadioGroup.Item>
			<RadioGroup.Item value="c">Третий</RadioGroup.Item>
		</RadioGroup>
	)
}

describe('группа для браузера', () => {
	it('корень — role="radiogroup", радио — нативные input[type=radio]', () => {
		mount(<Harness />)

		expect(document.querySelector('.s-radio-group')?.getAttribute('role')).toBe('radiogroup')
		expect(radios().map((radio) => radio.type)).toEqual(['radio', 'radio', 'radio'])
	})

	/** Без общего `name` браузер не соберёт радио в группу. */
	it('у всех радио один непустой name', () => {
		mount(<Harness />)

		const names = new Set(radios().map((radio) => radio.name))

		expect(names.size).toBe(1)
		expect([...names][0]).not.toBe('')
	})

	it('две группы на странице получают разные name', () => {
		mount(
			<div>
				<RadioGroup>
					<RadioGroup.Item value="a" />
				</RadioGroup>
				<RadioGroup>
					<RadioGroup.Item value="a" />
				</RadioGroup>
			</div>,
		)

		const [first, second] = radios()

		expect(first.name).not.toBe(second.name)
	})

	it('name группы уходит радио', () => {
		mount(
			<RadioGroup name="delivery">
				<RadioGroup.Item value="a" />
				<RadioGroup.Item value="b" />
			</RadioGroup>,
		)

		expect(radios().map((radio) => radio.name)).toEqual(['delivery', 'delivery'])
	})
})

describe('сервер', () => {
	/** Имя и отметку раздаёт группа, а радио из данных в её коллекции с самой сборки. */
	it('радио из items — с общим name и отметкой', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(
			<RadioGroup name="delivery" value="b" items={[{ value: 'a' }, { value: 'b' }]} />,
		)

		const fields = [...container.querySelectorAll('input')]

		expect(fields.map((field) => field.getAttribute('name'))).toEqual(['delivery', 'delivery'])
		expect(fields.map((field) => field.hasAttribute('checked'))).toEqual([false, true])
	})

	/**
	 * Радио разметки входят в коллекцию при коммите: сервер рисует их без
	 * отметки и общего `name`, а после гидратации они на месте.
	 */
	it('радио из разметки гидратируются без расхождений, отметка и name — после коммита', () => {
		const element = <Harness value="b" />
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)
		document.body.append(container)

		expect(checked()).toEqual([])
		expect(radios().map((radio) => radio.name)).toEqual(['', '', ''])

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(checked()).toEqual(['b'])
		expect(new Set(radios().map((radio) => radio.name)).size).toBe(1)
		expect(radios()[0].name).not.toBe('')

		choose('c')

		expect(checked()).toEqual(['c'])
		expect(rootOf('c').dataset.selected).toBe('true')
	})
})

describe('value ↔ checked', () => {
	it('значение группы отмечает своё радио', () => {
		mount(<Harness value="b" />)

		expect(checked()).toEqual(['b'])
	})

	it('смена значения снаружи переносит отметку', () => {
		const { render } = mount(<Harness value="a" />)

		render(<Harness value="c" />)

		expect(checked()).toEqual(['c'])
	})

	it('выбор пользователя отдаёт onChangeValue', () => {
		const onChangeValue = vi.fn()

		mount(<Harness value="a" onChangeValue={onChangeValue} />)

		choose('c')

		expect(onChangeValue).toHaveBeenLastCalledWith({ newValue: 'c', oldValue: 'a' })
		expect(checked()).toEqual(['c'])
	})

	it('без значения не отмечено ничего', () => {
		mount(<Harness />)

		expect(checked()).toEqual([])
	})

	/**
	 * Отметку с радио браузер снимает и сам — когда отмечают соседа. React
	 * узнаёт отметку поля только по записи свойства: запись, пропущенная из-за
	 * того, что узел уже совпал, оставила бы у него прежнюю. Тогда следующий
	 * выбор этого радио React не счёл бы изменением, и `onChange` не пришёл бы.
	 * Значение снаружи переносит отметку на радио, стоящее раньше, — его поле
	 * пишется первым и снимает отметку с соседа до того, как тот запишет свою.
	 */
	it('радио, с которого отметку сняло значение снаружи, выбирается снова', () => {
		const onChangeValue = vi.fn()
		const { render } = mount(<Harness value="c" onChangeValue={onChangeValue} />)

		render(<Harness value="a" onChangeValue={onChangeValue} />)
		choose('c')

		expect(onChangeValue).toHaveBeenLastCalledWith({ newValue: 'c', oldValue: 'a' })
		expect(checked()).toEqual(['c'])
		expect(rootOf('c').dataset.selected).toBe('true')
	})

	/**
	 * Настоящее состояние у потребителя. Радио уходят из группы и при её
	 * размонтировании, и по условию по одному — это не выбор «ничего», и
	 * значение потребителя переживает и то и другое.
	 */
	describe('значение потребителя переживает уход радио', () => {
		type TModelProps = { group?: boolean; second?: boolean }

		/** Значения потребителя по рендерам: последнее — текущее. */
		let picked: TRadioGroupValue[] = []

		function Model({ group = true, second = true }: TModelProps): ReactNode {
			const [value, setValue] = useState<TRadioGroupValue>('b')

			picked.push(value)

			return group ? (
				<RadioGroup value={value} onChangeValue={({ newValue }) => setValue(newValue)}>
					<RadioGroup.Item value="a" />
					{second ? <RadioGroup.Item value="b" /> : null}
				</RadioGroup>
			) : null
		}

		afterEach(() => {
			picked = []
		})

		it('выбор пишет значение потребителя', () => {
			mount(<Model />)

			choose('a')

			expect(picked.at(-1)).toBe('a')
		})

		it('размонтирование группы не стирает значение', () => {
			const { render } = mount(<Model />)

			render(<Model group={false} />)

			expect(picked.at(-1)).toBe('b')
		})

		/**
		 * Колбэк потребителя снимается раньше, чем уничтожаются контексты, и
		 * значение, стёртое при уничтожении, до него не дошло бы. Инстанс
		 * снаружи переживает монтирование — по нему видно само значение.
		 */
		it('размонтирование группы не стирает значение её инстанса', () => {
			const group = new TRadioGroup({ value: 'b' })
			const view = (shown: boolean) =>
				shown ? (
					<RadioGroup ctrl={group}>
						<RadioGroup.Item value="a" />
						<RadioGroup.Item value="b" />
					</RadioGroup>
				) : (
					<div />
				)
			const { render } = mount(view(true))

			expect(checked()).toEqual(['b'])

			render(view(false))

			expect(group.value).toBe('b')
		})

		it('отмеченное радио ушло и вернулось — значение и отметка на месте', () => {
			const { render } = mount(<Model />)

			render(<Model second={false} />)

			expect(picked.at(-1)).toBe('b')
			expect(checked()).toEqual([])

			render(<Model />)

			expect(checked()).toEqual(['b'])
		})
	})
})

describe('выключенное радио', () => {
	it('нативный disabled без aria-disabled', () => {
		mount(<Harness itemOff />)

		expect(radioOf('b').disabled).toBe(true)
		expect(radioOf('b').hasAttribute('aria-disabled')).toBe(false)
		expect(radioOf('a').disabled).toBe(false)
	})

	it('выключенная группа выключает все радио', () => {
		mount(<Harness groupOff />)

		expect(radios().map((radio) => radio.disabled)).toEqual([true, true, true])
		expect(radios().some((radio) => radio.hasAttribute('aria-disabled'))).toBe(false)
	})

	/** ARIA и роль нативного радио — дубли, их нет. */
	it('у радио нет ни role, ни aria-checked', () => {
		mount(<Harness value="a" />)

		for (const radio of radios()) {
			expect(radio.hasAttribute('role')).toBe(false)
			expect(radio.hasAttribute('aria-checked')).toBe(false)
		}
	})
})

describe('состояние для темы — на корне радио', () => {
	it('корень — label с data-selected и data-disabled', () => {
		mount(<Harness value="a" itemOff />)

		expect(rootOf('a').tagName).toBe('LABEL')
		expect(rootOf('a').dataset.selected).toBe('true')
		expect(rootOf('b').dataset.selected).toBe('false')
		expect(rootOf('b').dataset.disabled).toBe('true')
		expect(rootOf('a').dataset.disabled).toBe('false')
	})

	it('отметка переезжает вместе с выбором', () => {
		mount(<Harness value="a" />)

		choose('c')

		expect(rootOf('a').dataset.selected).toBe('false')
		expect(rootOf('c').dataset.selected).toBe('true')
	})

	it('вид группы — модификатор корня каждого радио', () => {
		mount(
			<RadioGroup view="halo" size="lg">
				<RadioGroup.Item value="a" />
			</RadioGroup>,
		)

		expect(rootOf('a').classList).toContain('s-radio-group-item--view-halo')
		expect(rootOf('a').classList).toContain('s-radio-group-item--size-lg')
	})

	/**
	 * Группа радио не раскладывает: они стоят где угодно, и номер в коллекции
	 * увёл бы радио по чужому флекс-ряду. У Vue привязки `order` у радио нет.
	 */
	it('места в коллекции на корне нет — радио стоит, где его поставили', () => {
		mount(<Harness />)

		expect(radios().map((radio) => rootOf(radio.value).style.order)).toEqual(['', '', ''])
	})

	/**
	 * Размер, вид и имя раздаёт группа, и в разметке радио их не задать: ни
	 * входом, ни атрибутом поля — `name` и `size` у `<input>` тоже есть.
	 */
	it('name, size и view — не входы радио', () => {
		expectTypeOf<RadioGroupItemProps>().not.toHaveProperty('name')
		expectTypeOf<RadioGroupItemProps>().not.toHaveProperty('size')
		expectTypeOf<RadioGroupItemProps>().not.toHaveProperty('view')
		expectTypeOf<RadioGroupItemProps>().toHaveProperty('value')
	})
})

describe('подпись', () => {
	/** Подпись внутри `label` — клик по ней выбирает радио, текст становится именем. */
	it('текст слота лежит внутри корня-label', () => {
		mount(<Harness />)

		const text = rootOf('a').querySelector('.s-radio-group-item__text')

		expect(text?.textContent).toBe('Первый')
	})

	it('клик по подписи выбирает радио', () => {
		const onChangeValue = vi.fn()

		mount(<Harness onChangeValue={onChangeValue} />)

		const text = rootOf('c').querySelector('.s-radio-group-item__text')

		if (!(text instanceof HTMLElement)) throw new Error('подписи радио «c» нет')

		act(() => text.click())

		expect(onChangeValue).toHaveBeenLastCalledWith({ newValue: 'c', oldValue: undefined })
		expect(checked()).toEqual(['c'])
	})

	/**
	 * Пустую обёртку тема прячет по `:empty`. Пробельный текст или узел вокруг
	 * слота сделали бы её непустой, и рядом с одиноким кольцом остался бы зазор.
	 */
	it('без подписи обёртка пуста — ни текста, ни узла', () => {
		mount(
			<RadioGroup>
				<RadioGroup.Item value="a" aria_label="Первый" />
			</RadioGroup>,
		)

		const text = rootOf('a').querySelector('.s-radio-group-item__text')

		expect(text?.childNodes).toHaveLength(0)
		// Имя радио без подписи — на самом поле
		expect(radioOf('a').getAttribute('aria-label')).toBe('Первый')
	})

	/** Подпись в соседнем элементе ссылается на поле через `for`. */
	it('сквозной id уходит на поле, а не на корень', () => {
		mount(
			<RadioGroup>
				<RadioGroup.Item id="pick-a" value="a" />
			</RadioGroup>,
		)

		expect(radioOf('a').id).toBe('pick-a')
		expect(rootOf('a').id).toBe('')
	})

	/** `onChange` потребителя приходит после выбора, а не вместо него. */
	it('onChange потребителя — на поле, после выбора', () => {
		const order: string[] = []

		mount(
			<RadioGroup onChangeValue={() => order.push('группа')}>
				<RadioGroup.Item value="a" onChange={() => order.push('потребитель')} />
			</RadioGroup>,
		)

		choose('a')

		expect(order).toEqual(['группа', 'потребитель'])
	})

	it('радио из пропа items подписывает слот item со scope', () => {
		mount(
			<RadioGroup
				value="b"
				items={[{ value: 'a' }, { value: 'b' }]}
				item={({ item }) => `Вариант ${item.value}`}
			/>,
		)

		expect(
			[...document.querySelectorAll('.s-radio-group-item__text')].map(
				(text) => text.textContent,
			),
		).toEqual(['Вариант a', 'Вариант b'])
		expect(checked()).toEqual(['b'])
	})

	it('плоский RadioGroupItem — то же, что RadioGroup.Item', () => {
		mount(
			<RadioGroup value="a">
				<RadioGroupItem value="a">Первый</RadioGroupItem>
			</RadioGroup>,
		)

		expect(RadioGroup.Item).toBe(RadioGroupItem)
		expect(checked()).toEqual(['a'])
	})
})

describe('группа имени', () => {
	it('aria_label группы — на корне с ролью radiogroup', () => {
		mount(
			<RadioGroup aria_label="Доставка">
				<RadioGroup.Item value="a" />
			</RadioGroup>,
		)

		const root = document.querySelector('[role="radiogroup"]')

		expect(root?.getAttribute('aria-label')).toBe('Доставка')
	})
})

describe('пересборка группы', () => {
	/** Микрозадачи: `engine:create` движок объявляет на них. */
	async function flush(): Promise<void> {
		await act(async () => {})
	}

	/**
	 * Пересобранная группа — это новый движок, и радио пересобираются вслед за
	 * ней. В живом движке остаются ровно радио разметки, по одному разу.
	 */
	it('StrictMode: в живом движке каждое радио один раз; клик выбирает', async () => {
		const engines: TEngineView[] = []

		mount(
			<StrictMode>
				<Harness value="a" onEngineCreate={(engine) => engines.push(engine)} />
			</StrictMode>,
		)
		await flush()

		const live = engines.at(-1)

		if (!live) throw new Error('группа не объявила движок')

		expect(live.extensions.batch.items.map((item) => Reflect.get(item, 'value'))).toEqual([
			'a',
			'b',
			'c',
		])
		expect(checked()).toEqual(['a'])

		choose('b')

		expect(checked()).toEqual(['b'])
		expect(rootOf('b').dataset.selected).toBe('true')
		expect(rootOf('a').dataset.selected).toBe('false')
	})
})
