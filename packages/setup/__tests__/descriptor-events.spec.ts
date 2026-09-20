/**
 * События компонента в типах дескриптора — только те, что адаптер пробрасывает.
 *
 * Наружу уходят имена из `events` и триггеров пропсов дескриптора и его
 * `extends` (`exportEvents` поверхности). Тип событий — карта класса ядра,
 * суженная до этих же имён (`TPublishedEvents`), второй записи у него нет.
 * Раньше тип брал карту целиком и обещал колбэки, которых адаптер не вызовет:
 * `change:present` ядро шлёт, но `present` объявлен с триггерами
 * `change:rendered` и `change:visible`, и `onChangePresent` у кнопки не
 * срабатывал никогда.
 *
 * Типовые проверки — `expectTypeOf` и `@ts-expect-error`: файл проверяет шаг CI
 * «Типы — Setup», и неиспользованная директива роняет его так же, как
 * настоящая ошибка.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { TButton } from '@soldy/core'
import type { TButtonEvents } from '@soldy/core'
import {
	ButtonDescriptor,
	ListBoxDescriptor,
	SelectDescriptor,
	TabsCollectionDescriptor,
	defineComponent,
	TSurface,
	underscorePropNaming,
} from '@soldy/setup'
import type * as setup from '@soldy/setup'
import type {
	DescriptorAllEvents,
	DescriptorCallbackEvents,
	DescriptorEvents,
	IAdapterProfile,
	IComponentDescriptor,
	TInstanceEvents,
} from '@soldy/setup'
import { CallbackProfile } from './helpers'

/** Имена событий ядра как есть — так их отдают наружу Vue и Web Components. */
const RawProfile: IAdapterProfile = {
	naming: { prop: underscorePropNaming, event: (name) => name.getName() },
}

/** Что адаптер пробрасывает наружу — `exportEvents` поверхности в именах профиля. */
function published(
	descriptor: IComponentDescriptor,
	profile: IAdapterProfile = RawProfile,
): readonly string[] {
	return TSurface.of(descriptor, profile).exportEvents
}

type TButtonEventName = keyof DescriptorAllEvents<typeof ButtonDescriptor>
type TButtonCallback = keyof DescriptorCallbackEvents<typeof ButtonDescriptor>

describe('события компонента в типах — только опубликованные', () => {
	it('change:text у Button есть и в типах, и в пробросе', () => {
		const text: TButtonEventName = 'change:text'
		const callback: TButtonCallback = 'onChangeText'

		expect(published(ButtonDescriptor())).toContain(text)
		expect(published(ButtonDescriptor(), CallbackProfile)).toContain(callback)
	})

	it('change:present класс шлёт, но его нет ни в типах, ни в пробросе', () => {
		expectTypeOf<TButtonEvents>().toHaveProperty('change:present')

		// @ts-expect-error — `present` объявлен с триггерами `change:rendered` и `change:visible`
		const present: TButtonEventName = 'change:present'
		// @ts-expect-error — колбэка, который адаптер не вызовет, в типах нет
		const callback: TButtonCallback = 'onChangePresent'

		expect(published(ButtonDescriptor())).not.toContain(present)
		expect(published(ButtonDescriptor(), CallbackProfile)).not.toContain(callback)
	})

	it('имена копятся через extends, и у родителя без класса ядра тоже', () => {
		// `bundle:create` объявляет EntityDescriptor, `engine:create` —
		// CollectionDescriptor: карты у них нет, её дал наследник
		const bundle: TButtonEventName = 'bundle:create'
		const engine: keyof DescriptorAllEvents<typeof TabsCollectionDescriptor> = 'engine:create'

		expect(published(ButtonDescriptor())).toContain(bundle)
		expect(published(TabsCollectionDescriptor())).toContain(engine)
	})

	it('триггеры общих списочных пропсов — в событиях ListBox и Select', () => {
		// Приходят спредом `LIST_PROPS`: словарь с аннотацией `Record<string, …>`
		// терял в спреде свои ключи, и тип их не видел
		const listBox: keyof DescriptorAllEvents<typeof ListBoxDescriptor> = 'change:maxRows'
		const select: keyof DescriptorAllEvents<typeof SelectDescriptor> = 'change:maxRows'

		expect(published(ListBoxDescriptor())).toContain(listBox)
		expect(published(SelectDescriptor())).toContain(select)
	})
})

/**
 * Рантайм имён не сверяет: поверхность отдаёт наружу то, что объявлено. Поэтому
 * опечатку останавливает компилятор — раньше она проходила молча.
 */
describe('имя события сверяется с картой класса ядра', () => {
	it('опечатка в триггере — ошибка компиляции дескриптора', () => {
		defineComponent({
			ctor: TButton,
			contribution: {
				props: {
					caption: {
						type: String,
						// @ts-expect-error — в карте событий TButton нет `change:txt`
						triggers: ['change:txt'],
					},
				},
			},
		})
	})

	it('событие, которого класс не шлёт, — ошибка компиляции дескриптора', () => {
		defineComponent({
			ctor: TButton,
			contribution: {
				// @ts-expect-error — `press` шлёт плагин action, а не TButton
				events: ['press'],
			},
		})
	})

	it('без класса ядра имена копятся без сверки, а карту даёт наследник', () => {
		const base = defineComponent({ contribution: { events: ['change:text'] } })
		const child = defineComponent({ ctor: TButton, extends: base })

		expectTypeOf<DescriptorEvents<() => typeof base>>().toEqualTypeOf<object>()
		expectTypeOf<DescriptorEvents<() => typeof child>>().toEqualTypeOf<
			Pick<TButtonEvents, 'change:text'>
		>()
		expect(published(child)).toEqual(['change:text'])
	})

	it('у дескрипторов экспорта сужение ничего не теряет', () => {
		// Имя от родителя без класса ядра сверить при объявлении было не с чем:
		// не окажись его в карте наследника, адаптер его пробрасывал бы, а тип —
		// нет. Ошибка здесь назовёт дескриптор и потерянные имена
		expectTypeOf<TLostEventNames>().toEqualTypeOf<Record<never, never>>()
	})
})

/** Имена, которые дескриптор публикует, а карта его класса не знает: сужение выбросило бы их из типа. */
type TLostEventName<TDescriptor> =
	TDescriptor extends IComponentDescriptor<infer C>
		? C['instance'] extends { readonly events: unknown }
			? Exclude<C['eventName'], keyof TInstanceEvents<C['instance']>>
			: never
		: never

/** Потерянные имена у экспорта `@soldy/setup`, если это фабрика дескриптора. */
type TLostOf<K extends keyof typeof setup> = (typeof setup)[K] extends () => infer D
	? TLostEventName<D>
	: never

/** Дескрипторы экспорта, у которых сужение потеряло имя, и потерянные имена. */
type TLostEventNames = {
	[K in keyof typeof setup as [TLostOf<K>] extends [never] ? never : K]: TLostOf<K>
}
