// @vitest-environment jsdom

/**
 * Сторож: обмен слушает шину каждого участника одним слушателем — и только им.
 *
 * Раньше обмен подписывался на шины `on`: маршрут на каждое событие
 * поверхности и подписка на каждый триггер каждого свойства, слушают их или
 * нет. У строки таблицы с чекбоксом выходило около восьмидесяти маршрутов, и
 * каждый держал обработчик, отписку и набор на шине. Теперь у обмена один
 * слушатель всех событий (`listen`) на шину участника: его ставит первый из
 * `state.subscribe` и `events.listen`, снимает последний ушедший, а что делать
 * с событием, говорит таблица маршрутов типа.
 *
 * Участники — инстанс и плагины дескриптора в наборе. Шпионы ставятся после
 * сборки и до `connect`: подписки самой сборки и плагинов в сверку не
 * попадают, видно только то, что делает обмен. Слушателя получает участник,
 * у которого есть что отдать: событие или свойство с триггером.
 *
 * Идёт по всем дескрипторам экспорта, у которых есть класс: новый компонент
 * попадёт под проверку сам.
 */

import { describe, it, expect } from 'vitest'
import { ButtonDescriptor } from '../content/descriptors'
import { createAdapterContext } from '../protected/adapter'
import type { IAdapterContext } from '../protected/adapter'
import type { IComponentDescriptor, TName, TPropSpec } from '../protected/define'
import { CommonProfile, PLUGIN_PROPS } from '../protected/naming'
import { exportedDescriptors, leftovers, spyBus, subscribed } from './helpers'

/** Есть ли обмену что делать с событиями владельца: событие или свойство с триггером. */
const hasRoutes = (props: readonly TPropSpec[], events: readonly TName[]): boolean =>
	events.length > 0 ||
	props.some((prop) => prop.name.name !== PLUGIN_PROPS && prop.triggers.length > 0)

/** Участники монтирования, которым положен слушатель: инстанс и плагины дескриптора в наборе. */
function listenedParticipants(
	descriptor: IComponentDescriptor,
	context: IAdapterContext,
): Array<[string, object]> {
	const participants: Array<[string, object]> = hasRoutes(descriptor.props, descriptor.events)
		? [['инстанс', context.instance]]
		: []

	for (const definition of descriptor.plugins) {
		const plugin = context.bundle?.get(definition.ctor)

		if (plugin && hasRoutes(definition.props, definition.events)) {
			participants.push([definition.ctor.name, plugin])
		}
	}

	return participants
}

describe('сторож: у шины участника — один слушатель обмена и ни одной подписки on', () => {
	const descriptors = exportedDescriptors().filter(([, descriptor]) => descriptor.ctor !== Object)

	it('дескрипторы найдены в экспорте', () => {
		expect(descriptors.map(([name]) => name)).toEqual(
			expect.arrayContaining([
				'ButtonDescriptor',
				'CheckBoxDescriptor',
				'TableRowDescriptor',
				'TableCollectionRowDescriptor',
			]),
		)
	})

	it('шпионы видят слушателя: у кнопки — инстанс и плагин нажатия', () => {
		const descriptor = ButtonDescriptor()
		const context = createAdapterContext(descriptor, {})
		const spies = listenedParticipants(descriptor, context).flatMap(([name, owner]) =>
			spyBus(name, owner),
		)
		const off = context.connect(CommonProfile).events.listen(() => {})

		expect(leftovers(spies)).toEqual(
			expect.arrayContaining(['инстанс: listen', 'TActionPlugin: listen']),
		)

		off()
		context.destroy()
	})

	it.each(descriptors)('%s', (_name, descriptor) => {
		const context = createAdapterContext(descriptor, {})
		const participants = listenedParticipants(descriptor, context)
		const spies = participants.flatMap(([name, owner]) => spyBus(name, owner))
		const exchange = context.connect(CommonProfile)
		const offs = [exchange.state.subscribe(() => {}), exchange.events.listen(() => {})]

		expect(subscribed(spies)).toEqual([])
		expect(leftovers(spies).sort()).toEqual(
			participants.map(([name]) => `${name}: listen`).sort(),
		)

		for (const off of offs) off()

		expect(leftovers(spies)).toEqual([])

		context.destroy()
	})
})
