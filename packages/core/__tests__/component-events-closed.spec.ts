import { describe, it, expect, vi } from 'vitest'
import { TButton, TEvented } from '@soldy/core'
import type { TValuePayload } from '@soldy/core'

type TTextEvents = { 'change:text': (payload: TValuePayload<string>) => void }
type TTypoEvents = { 'change:txt': (payload: TValuePayload<string>) => void }

/**
 * Сторож закрытой карты событий компонента.
 *
 * `TComponentEvents` была `Record<string, …>`. Индексная сигнатура попадала в
 * карту каждого наследника, `keyof` у неё становился `string`, и опечатка в
 * имени события компилировалась у любого компонента: в `on`, в `emit` и в
 * правиле `relay`. Открытый вид остался только констрейнтом дженерика —
 * `TAnyEvents`.
 *
 * Негативные случаи ловит не vitest, а «Типы — Core»: неиспользованный
 * `@ts-expect-error` — тоже ошибка, поэтому вернувшийся в карту индекс уронит
 * типы, а не пройдёт молча. Рядом с каждым — живой случай с объявленным
 * именем, чтобы запрет не оказался запретом всего подряд.
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
})
