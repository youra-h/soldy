/**
 * Владение готовым движком: владелец уходит — движок переходит к следующему.
 *
 * Движок, пришедший снаружи (`engine`), живёт дольше компонента: React
 * пересобирает список под StrictMode и `<Activity>`, Vue монтирует его заново
 * под `v-if`, и без `ctrl` у каждой сборки новый владелец. Фасад, уходя,
 * отпускает движок (`destroy` → `releaseEngine`): владельческие расширения
 * прежнего владельца снимаются с шин и отвязывают от него элементы, а
 * следующий владелец ставит свои. Раньше движок помнил первого владельца
 * навсегда, и новый получал предупреждение, а `value`, `size` и `disabled`
 * элементов оставались у уничтоженного.
 *
 * Фасад здесь собирается и уходит так, как это делает адаптер: конструктор с
 * `owner` и `engine`, затем `destroy()`.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
	createEngine,
	TListBox,
	TListBoxCollectionFacade,
	TSelect,
	TSelectCollectionFacade,
} from '../src'
import type { IListBoxProps, TBaseCollectionExtensions, TCollectionEngine } from '../src'

afterEach(() => {
	vi.restoreAllMocks()
})

type TItem = { value: string; text: string }

const ITEMS: TItem[] = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B' },
	{ value: 'c', text: 'C' },
]

/** Список над движком: владелец и фасад — так их собирает адаптер. */
function mountList(
	engine: TCollectionEngine<TItem, TBaseCollectionExtensions<TItem>>,
	props: Partial<IListBoxProps> = {},
) {
	const owner = new TListBox(props)
	const facade = new TListBoxCollectionFacade({}, { owner, engine })

	return { owner, facade }
}

/** Значения выбранных элементов — по фасаду, который держит движок. */
const selected = (facade: TListBoxCollectionFacade) => facade.selected.map((item) => item.value)

describe('владельцы по очереди', () => {
	it('второй получает движок целиком: value, size и disabled — его', () => {
		const warn = vi.spyOn(console, 'warn')
		const engine = createEngine<TItem>({ items: ITEMS })
		const first = mountList(engine, { value: 'a', size: 'lg' })

		expect(selected(first.facade)).toEqual(['a'])

		first.facade.destroy()

		const second = mountList(engine, { value: 'b', size: 'sm', disabled: true })

		expect(warn).not.toHaveBeenCalled()
		expect(selected(second.facade)).toEqual(['b'])
		expect(second.facade.items.map((item) => item.size)).toEqual(['sm', 'sm', 'sm'])
		expect(second.facade.items.every((item) => item.disabled)).toBe(true)

		second.owner.value = 'c'
		second.owner.disabled = false

		expect(selected(second.facade)).toEqual(['c'])
		expect(second.facade.items.some((item) => item.disabled)).toBe(false)
	})

	it('первый на элементы больше не влияет', () => {
		const engine = createEngine<TItem>({ items: ITEMS })
		const first = mountList(engine, { value: 'a' })

		first.facade.destroy()

		const second = mountList(engine, { value: 'b' })

		first.owner.value = 'c'
		first.owner.size = 'xl'
		first.owner.disabled = true

		expect(selected(second.facade)).toEqual(['b'])
		expect(second.facade.items.map((item) => item.size)).toEqual(['normal', 'normal', 'normal'])
		expect(second.facade.items.some((item) => item.disabled)).toBe(false)
	})

	/**
	 * Движок ждёт следующего владельца, а элементы в нём остаются. Привязанные
	 * к ушедшему, они читали бы его и дальше, а о смене сообщать было бы уже
	 * некому, — поэтому уход отвязывает их: итог снова свой у элемента.
	 */
	it('уход без преемника отвязывает элементы: итог снова свой', () => {
		const engine = createEngine<TItem>({ items: ITEMS })
		const { owner, facade } = mountList(engine, { size: 'lg', disabled: true })
		const [item] = facade.items
		const sizes: unknown[] = []

		item?.events.on('change:size', (payload) => sizes.push(payload.newValue))

		facade.destroy()
		owner.size = 'xl'

		expect(facade.items.map((one) => one.size)).toEqual(['normal', 'normal', 'normal'])
		expect(facade.items.some((one) => one.disabled)).toBe(false)
		// Класс размера снят по настоящей паре «было/стало»: одно событие
		expect(sizes).toEqual(['normal'])
	})
})

describe('владельцы одновременно', () => {
	it('второй ждёт с предупреждением и получает движок, когда первый уходит', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const engine = createEngine<TItem>({ items: ITEMS })
		const first = mountList(engine, { value: 'a' })
		const second = mountList(engine, { value: 'b' })

		expect(warn).toHaveBeenCalledOnce()
		// Первый остаётся рабочим
		expect(selected(first.facade)).toEqual(['a'])

		first.facade.destroy()

		expect(selected(second.facade)).toEqual(['b'])

		second.owner.value = 'c'
		first.owner.value = 'a'

		expect(selected(second.facade)).toEqual(['c'])
	})

	it('ушедший из очереди движок не получает', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {})

		const engine = createEngine<TItem>({ items: ITEMS })
		const first = mountList(engine, { value: 'a' })
		const second = mountList(engine, { value: 'b' })

		second.facade.destroy()
		first.facade.destroy()
		second.owner.value = 'c'

		expect(selected(first.facade)).toEqual(['a'])

		const third = mountList(engine, { value: 'b' })

		expect(selected(third.facade)).toEqual(['b'])
	})

	/**
	 * Свой `ctrl` бывает у двух сборок сразу: новая собрана раньше, чем ушла
	 * старая (смена `key`). Это тот же владелец, а не второй: предупреждения
	 * нет, и уход одной сборки движок у другой не отнимает.
	 */
	it('тот же владелец в двух фасадах держит движок, пока не ушёл последний', () => {
		const warn = vi.spyOn(console, 'warn')
		const engine = createEngine<TItem>({ items: ITEMS })
		const owner = new TListBox({ value: 'a' })
		const first = new TListBoxCollectionFacade({}, { owner, engine })
		const second = new TListBoxCollectionFacade({}, { owner, engine })

		expect(warn).not.toHaveBeenCalled()

		first.destroy()
		owner.value = 'b'

		expect(selected(second)).toEqual(['b'])

		second.destroy()
		owner.value = 'c'

		expect(selected(second)).toEqual(['b'])
	})
})

describe('ушедший фасад', () => {
	it('не получает событий движка, который живёт дальше', () => {
		const engine = createEngine<TItem>({ items: ITEMS })
		const { facade } = mountList(engine)

		facade.destroy()

		const emit = vi.spyOn(facade.events, 'emit')
		const [item] = engine.extensions.batch.items

		if (item) engine.extensions.plain.remove(item)

		expect(emit).not.toHaveBeenCalled()
	})

	/**
	 * React перечитывает состояние уже уничтоженной сборки. Расширения ушедшего
	 * владельца стоят в карте движка, пока их место не займёт следующий, —
	 * фасад читается, даже когда его свойства берутся у них.
	 */
	it('читается после ухода: владельческие расширения на месте, пока нет преемника', () => {
		const engine = createEngine<TItem>({ items: ITEMS })
		const facade = new TSelectCollectionFacade({}, { owner: new TSelect(), engine })

		facade.destroy()

		expect(facade.list_aria.role).toBe('listbox')
		expect(facade.tags).toBeNull()
	})

	/**
	 * Свой движок фасада при своём `ctrl`: фабрика подписала владельческие
	 * расширения на шину владельца, а она переживает монтирование. Уход
	 * фасада их снимает — иначе каждое монтирование оставляло бы на шине
	 * обработчики мёртвого движка.
	 */
	it('свой движок: уход снимает подписки его расширений с шины владельца', () => {
		const owner = new TListBox()
		const on = vi.spyOn(owner.events, 'on')
		const off = vi.spyOn(owner.events, 'off')
		const facade = new TListBoxCollectionFacade({ items: ITEMS }, { owner })

		expect(on).toHaveBeenCalled()

		facade.destroy()

		const left = on.mock.calls.filter(
			([event, handler]) => !off.mock.calls.some(([e, h]) => e === event && h === handler),
		)

		expect(left).toEqual([])
	})
})
