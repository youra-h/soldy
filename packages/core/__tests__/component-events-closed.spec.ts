import { describe, it, expect, vi } from 'vitest'
import { TButton, TCollectionItemComponent, TComponent, TEvented } from '@soldy/core'
import type { IExtension, TComponentEvents, TValuePayload } from '@soldy/core'

type TTextEvents = { 'change:text': (payload: TValuePayload<string>) => void }
type TTypoEvents = { 'change:txt': (payload: TValuePayload<string>) => void }

/**
 * Живой инстанс абстрактного `TCollectionItemComponent`. Дженерики — его
 * констрейнты: такой тип и выводится из конструктора.
 */
class TProbeItem extends TCollectionItemComponent<
	object,
	Record<string, IExtension<object>>,
	TComponentEvents
> {}

/**
 * Сторож закрытой карты событий компонента.
 *
 * `TComponentEvents` была `Record<string, …>`. Индексная сигнатура попадала в
 * карту каждого наследника, `keyof` у неё становился `string`, и опечатка в
 * имени события компилировалась у любого компонента: в `on`, в `emit` и в
 * правиле `relay`. Открытый вид — `TAnyEvents` — остался только констрейнтом
 * интерфейсов (`IComponent`). У классов `TComponent` и
 * `TCollectionItemComponent` констрейнт — закрытая карта: инстанс, тип которого
 * выведен из конструктора, получает констрейнт, а не дефолт.
 *
 * Негативные случаи ловит не vitest, а «Типы — Core»: неиспользованный
 * `@ts-expect-error` — тоже ошибка, поэтому вернувшийся в карту или в
 * констрейнт класса индекс уронит типы, а не пройдёт молча. Рядом с каждым —
 * живой случай с объявленным именем, чтобы запрет не оказался запретом всего
 * подряд.
 */
describe('карта событий компонента закрыта', () => {
	it('on и emit не принимают имя, которого нет в карте', () => {
		const button = new TButton()
		const typo = vi.fn()

		// @ts-expect-error — `change:txt` нет в карте TButton
		button.events.on('change:txt', typo)
		// @ts-expect-error — `change:txt` нет в карте TButton
		button.events.emit('change:txt', { newValue: 'a', oldValue: '' })

		const changed = vi.fn()

		button.events.on('change:text', changed)
		button.text = 'b'

		expect(changed).toHaveBeenCalledWith({ newValue: 'b', oldValue: '' })
	})

	it('правило relay не называет событие, которого нет в карте цели', () => {
		const button = new TButton()
		const typoSource = new TEvented<TTypoEvents>()

		// @ts-expect-error — `change:txt` есть у источника, но не в карте TButton
		button.events.relay(typoSource, ['change:txt'])

		const source = new TEvented<TTextEvents>()
		const changed = vi.fn()

		button.events.relay(source, ['change:text'])
		button.events.on('change:text', changed)
		source.emit('change:text', { newValue: 'c', oldValue: 'b' })

		expect(changed).toHaveBeenCalledWith({ newValue: 'c', oldValue: 'b' })
	})

	it('bundle:create объявлен в корневой карте и доходит по шине инстанса', () => {
		const button = new TButton()
		const bundle = { plugins: [] }
		const seen: unknown[] = []

		// Тип бандла ядро не знает — подписчик получает `unknown` и сужает сам.
		button.events.on('bundle:create', (received: unknown) => seen.push(received))
		button.events.emit('bundle:create', bundle)

		expect(seen).toEqual([bundle])
		expect(seen[0]).toBe(bundle)
	})

	it('инстанс, тип которого выведен из конструктора, тоже закрыт', () => {
		// Так тип инстанса получает дескриптор из `ctor`: на месте дженерика класса
		// стоит констрейнт. Открытый констрейнт вернул бы индекс в эту карту.
		const component: InstanceType<typeof TComponent> = new TComponent()
		const item: InstanceType<typeof TCollectionItemComponent> = new TProbeItem()
		const typo = vi.fn()

		// @ts-expect-error — `change:txt` нет в карте, выведенной из TComponent
		component.events.on('change:txt', typo)
		// @ts-expect-error — `change:txt` нет в карте, выведенной из TCollectionItemComponent
		item.events.on('change:txt', typo)

		const bundle = { plugins: [] }
		const seen: unknown[] = []

		component.events.on('bundle:create', (received: unknown) => seen.push(received))
		item.events.on('bundle:create', (received: unknown) => seen.push(received))
		component.events.emit('bundle:create', bundle)
		item.events.emit('bundle:create', bundle)

		expect(seen).toEqual([bundle, bundle])
	})
})
