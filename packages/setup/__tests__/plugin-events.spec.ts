/**
 * События плагинов в типах дескриптора совпадают с тем, что адаптер
 * пробрасывает в рантайме.
 *
 * Пробрасываются события contribution плагина (`collectEventBindings`), а
 * типы (`TPluginEventsFrom` в составе `DescriptorAllEvents`) строятся из карты,
 * отданной в `definePlugin<'ns', TEvents>`. Это два объявления одного набора, и
 * они расходились молча: `action:install` был в типах, но не приходил ни разу.
 * Базовые события наружу отбирает `PLUGIN_EVENTS`, собственные — карта в
 * `definePlugin`.
 *
 * Обе стороны проверяются здесь на одних и тех же именах. Типовые проверки
 * стоят под `@ts-expect-error`: файл проверяет шаг CI «Типы — Setup», и
 * неиспользованная директива роняет его так же, как настоящая ошибка.
 */

import { describe, it, expect } from 'vitest'
import { ControlDescriptor, SelectDescriptor } from '@soldy/setup'
import type { DescriptorAllEvents, IComponentDescriptor } from '@soldy/setup'

/**
 * Имена событий в типах дескриптора: свои и плагинные. Из этой же карты React,
 * Solid и Svelte выводят колбэк-пропы.
 */
type TEventName<TDescriptorFn> = keyof DescriptorAllEvents<TDescriptorFn>

type TControlEventName = TEventName<typeof ControlDescriptor>
type TSelectEventName = TEventName<typeof SelectDescriptor>

/** Имена событий дескриптора в рантайме — `<ns>:<имя>`, как ключи его типов. */
function eventNames(descriptor: Pick<IComponentDescriptor, 'getEvents'>): string[] {
	return descriptor.getEvents().map((name) => name.getName())
}

describe('TActionPlugin у ControlDescriptor', () => {
	it('create и press есть и в типах, и в рантайме', () => {
		const published: TControlEventName[] = ['action:create', 'action:press']

		expect(eventNames(ControlDescriptor())).toEqual(expect.arrayContaining(published))
	})

	it('install и destroy нет ни в типах, ни в рантайме: это механика bundle', () => {
		// @ts-expect-error — `install` наружу не публикуется, его нет в PLUGIN_EVENTS
		const install: TControlEventName = 'action:install'
		// @ts-expect-error — `destroy` наружу не публикуется, его нет в PLUGIN_EVENTS
		const destroy: TControlEventName = 'action:destroy'

		const names = eventNames(ControlDescriptor())

		expect(names).not.toContain(install)
		expect(names).not.toContain(destroy)
	})
})

describe('TSelectKeyboardPlugin у SelectDescriptor', () => {
	it('change:highlight есть и в типах, и в рантайме', () => {
		const highlight: TSelectEventName = 'keyboard:change:highlight'

		expect(eventNames(SelectDescriptor())).toContain(highlight)
	})

	it('escape нет ни в типах, ни в рантайме: его слушает TEditablePlugin внутри bundle', () => {
		// @ts-expect-error — contribution клавиатуры Select отдаёт наружу только подсветку
		const escape: TSelectEventName = 'keyboard:escape'

		expect(eventNames(SelectDescriptor())).not.toContain(escape)
	})
})
