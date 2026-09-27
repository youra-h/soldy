/**
 * Владение готовым движком: монтирование кончилось — движок свободен.
 *
 * Движок, пришедший снаружи (`engine`), живёт дольше списка: Vue снимает
 * список под `v-if` и монтирует заново, и у новой сборки новый владелец.
 * Конец монтирования движок отпускает (`release` фасада), но расширения
 * владельца остаются рабочими: React собирает заново список, живой под
 * StrictMode и `<Activity>`, на том же фасаде, и тот удерживает движок снова
 * (`retain`). Другой владелец, взяв отпущенный движок, снимает расширения
 * прежнего и его фасад и ставит свои. Раньше движок помнил первого владельца
 * навсегда: новый получал предупреждение, а `value`, `size` и `disabled`
 * элементов оставались у прежнего.
 *
 * Фасад здесь собирается, принимается и отпускается так, как это делает
 * сборка: конструктор с `owner` и `engine`, `retain` на приём монтирования,
 * `release` на его конец.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createEngine, TListBox, TListBoxCollectionFacade } from '../src'
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

type TEngine = TCollectionEngine<TItem, TBaseCollectionExtensions<TItem>>

/** Фасад над движком, монтирование принято — так его собирает адаптер. */
function mountFacade(engine: TEngine, owner: TListBox): TListBoxCollectionFacade {
	const facade = new TListBoxCollectionFacade({}, { owner, engine })

	facade.retain()

	return facade
}

/** Список над движком: новый владелец и его фасад. */
function mountList(engine: TEngine, props: Partial<IListBoxProps> = {}) {
	const owner = new TListBox(props)

	return { owner, facade: mountFacade(engine, owner) }
}

/** Значения выбранных элементов — по фасаду, который держит движок. */
const selected = (facade: TListBoxCollectionFacade) => facade.selected.map((item) => item.value)

/** Сколько раз фасад переизлучил событие движка. */
function relayed(facade: TListBoxCollectionFacade, engine: TEngine): number {
	const emit = vi.spyOn(facade.events, 'emit')
	const [item] = engine.extensions.batch.items

	if (item) engine.extensions.plain.remove(item)

	const count = emit.mock.calls.length

	emit.mockRestore()

	return count
}

describe('следующий владелец — после конца монтирования прежнего', () => {
	it('получает движок целиком: value, size и disabled — его', () => {
		const warn = vi.spyOn(console, 'warn')
		const engine = createEngine<TItem>({ items: ITEMS })
		const first = mountList(engine, { value: 'a', size: 'lg' })

		expect(selected(first.facade)).toEqual(['a'])

		first.facade.release()

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

	it('прежний на элементы больше не влияет', () => {
		const engine = createEngine<TItem>({ items: ITEMS })
		const first = mountList(engine, { value: 'a' })

		first.facade.release()

		const second = mountList(engine, { value: 'b' })

		first.owner.value = 'c'
		first.owner.size = 'xl'
		first.owner.disabled = true

		expect(selected(second.facade)).toEqual(['b'])
		expect(second.facade.items.map((item) => item.size)).toEqual(['normal', 'normal', 'normal'])
		expect(second.facade.items.some((item) => item.disabled)).toBe(false)
	})

	it('фасад прежнего снят: событий движка, который живёт дальше, не получает', () => {
		const engine = createEngine<TItem>({ items: ITEMS })
		const first = mountList(engine)

		first.facade.release()
		mountList(engine)

		expect(relayed(first.facade, engine)).toBe(0)
	})

	/**
	 * Фасад, у которого движок забрали, пока он был снят, остался без
	 * расширений и релеев. React покажет скрытый список — и тот молча перестал
	 * бы работать.
	 */
	it('фасад, у которого движок забрали, при новом приёме предупреждает', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const engine = createEngine<TItem>({ items: ITEMS })
		const first = mountList(engine)

		first.facade.release()
		mountList(engine)

		expect(warn).not.toHaveBeenCalled()

		first.facade.retain()

		expect(warn).toHaveBeenCalledOnce()
	})
})

describe('тот же владелец', () => {
	/**
	 * Так React собирает заново список, живой под StrictMode и `<Activity>`:
	 * контексты новые, фасад и владелец — те же.
	 */
	it('отпущенный движок остаётся рабочим, и тот же фасад удерживает его снова', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const engine = createEngine<TItem>({ items: ITEMS })
		const { owner, facade } = mountList(engine, { value: 'a', size: 'lg' })
		const list = engine.extensions.list

		facade.release()
		owner.value = 'b'
		owner.size = 'xl'

		expect(selected(facade)).toEqual(['b'])
		expect(facade.items.map((item) => item.size)).toEqual(['xl', 'xl', 'xl'])

		facade.retain()

		expect(engine.extensions.list).toBe(list)
		expect(relayed(facade, engine)).toBeGreaterThan(0)
		expect(warn).not.toHaveBeenCalled()

		// Удержанный движок другой владелец не возьмёт
		mountList(engine, { value: 'c' })

		expect(warn).toHaveBeenCalledOnce()
		expect(selected(facade)).toEqual(['b'])
	})

	/**
	 * Свой `ctrl` пережил монтирование: Vue снял список под `v-if` и собрал
	 * новый фасад на том же владельце. Расширения остаются его, а прежний фасад
	 * своё отработал.
	 */
	it('новый фасад: расширения те же, прежний фасад снят', () => {
		const warn = vi.spyOn(console, 'warn')
		const engine = createEngine<TItem>({ items: ITEMS })
		const owner = new TListBox({ value: 'a' })
		const first = mountFacade(engine, owner)
		const list = engine.extensions.list

		first.release()

		const second = mountFacade(engine, owner)

		expect(warn).not.toHaveBeenCalled()
		expect(engine.extensions.list).toBe(list)
		expect(relayed(first, engine)).toBe(0)

		owner.value = 'c'

		expect(selected(second)).toEqual(['c'])
	})

	/**
	 * Смена `key` в React при своём `ctrl`: новый фасад собран на рендере, пока
	 * прежний ещё держит движок; прежний отпускает его в очистке эффекта, новый
	 * удерживает при приёме.
	 */
	it('новый фасад собран раньше, чем отпущен прежний: прежний снят при приёме нового', () => {
		const warn = vi.spyOn(console, 'warn')
		const engine = createEngine<TItem>({ items: ITEMS })
		const owner = new TListBox({ value: 'a' })
		const first = mountFacade(engine, owner)
		const second = new TListBoxCollectionFacade({}, { owner, engine })

		first.release()
		second.retain()

		expect(warn).not.toHaveBeenCalled()
		expect(relayed(first, engine)).toBe(0)
		expect(relayed(second, engine)).toBeGreaterThan(0)
	})
})

describe('два владельца сразу', () => {
	it('второй получает одно предупреждение, первый остаётся рабочим', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const engine = createEngine<TItem>({ items: ITEMS })
		const first = mountList(engine, { value: 'a' })

		mountList(engine, { value: 'b' })

		expect(warn).toHaveBeenCalledOnce()
		expect(selected(first.facade)).toEqual(['a'])

		first.owner.value = 'c'

		expect(selected(first.facade)).toEqual(['c'])
	})
})

describe('свой движок', () => {
	it('записи владения нет: отпустить и удержать нечего', () => {
		const warn = vi.spyOn(console, 'warn')
		const owner = new TListBox({ value: 'a' })
		const facade = new TListBoxCollectionFacade({ items: ITEMS }, { owner })

		facade.retain()
		facade.release()
		facade.retain()
		owner.value = 'b'

		expect(warn).not.toHaveBeenCalled()
		expect(selected(facade)).toEqual(['b'])
	})
})
