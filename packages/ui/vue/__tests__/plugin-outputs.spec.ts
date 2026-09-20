/**
 * Выходы плагинов доходят до разметки с типом геттера плагина, а не `unknown`.
 *
 * Выход — защищённый проп плагина: его вычисляет плагин, а разметка только
 * читает. `dismiss_ownerAttribute` у Select описывал рукописный тип, который
 * с плагином никто не сверял, а `layout_styles` шаблоны Frame, Icon, Spinner и
 * Skeleton читали вовсе без типа — это проходило лишь потому, что vue-tsc не
 * проверяет атрибуты `<component :is>`.
 *
 * Теперь тип выхода — `Pick` геттера класса плагина четвёртым аргументом
 * `definePlugin`. Дескриптор собирает выходы в `DescriptorPluginOutputs`, а
 * контекст несёт их дальше. Компонент Vue передаёт дженерики `useAdapter`
 * явно, поэтому выходы добавляет сам. React, Solid и Svelte берут их из типа
 * контекста.
 *
 * Типы проверяет не vitest, а шаг CI «Типы — Vue»: `expectTypeOf` в рантайме
 * ничего не делает, а при неверном типе файл не скомпилируется.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { SelectDescriptor, toInstanceState } from '@soldy/setup'
import type { IAdapterContext, IComponentContract, TAdapterState } from '@soldy/setup'
import { TDismissPlugin } from '@soldy/plugins'
import type {
	TEditablePlugin,
	TFrameLayoutPlugin,
	TIconLayoutPlugin,
	TSelectKeyboardPlugin,
	TSkeletonLayoutPlugin,
	TSpinnerLayoutPlugin,
} from '@soldy/plugins'
import { VueProfile, createVueAdapterContext } from '../src/adapter'
import type SetupSelect from '../src/components/select/setup.component'
import type SetupFrame from '../src/components/frame/setup.component'
import type SetupIcon from '../src/components/icon/setup.component'
import type SetupSpinner from '../src/components/spinner/setup.component'
import type SetupSkeleton from '../src/components/skeleton/setup.component'

/** Что видит шаблон: результат `setup()` компонента. */
type TTemplate<TSetup extends { setup: (...args: never[]) => unknown }> = ReturnType<
	TSetup['setup']
>

/**
 * Состояние так, как его типизирует `useAdapter` React, Solid и Svelte:
 * инстанс и выходы выводятся из контракта в типе контекста, дженерики не
 * передаются.
 */
function stateOf<C extends IComponentContract>(adapter: IAdapterContext<C>): TAdapterState<C> {
	return toInstanceState<C>(adapter.connect(VueProfile).state.getSnapshot())
}

describe('выходы плагинов в шаблоне Vue', () => {
	it('dismiss_ownerAttribute у Select — тип геттера TDismissPlugin', () => {
		expectTypeOf<TTemplate<typeof SetupSelect>['dismiss_ownerAttribute']>().toEqualTypeOf<
			TDismissPlugin['ownerAttribute'] | undefined
		>()
	})

	it('layout_styles у Frame, Icon, Spinner и Skeleton — тип геттера своего layout-плагина', () => {
		expectTypeOf<TTemplate<typeof SetupFrame>['layout_styles']>().toEqualTypeOf<
			TFrameLayoutPlugin['styles'] | undefined
		>()
		expectTypeOf<TTemplate<typeof SetupIcon>['layout_styles']>().toEqualTypeOf<
			TIconLayoutPlugin['styles'] | undefined
		>()
		expectTypeOf<TTemplate<typeof SetupSpinner>['layout_styles']>().toEqualTypeOf<
			TSpinnerLayoutPlugin['styles'] | undefined
		>()
		expectTypeOf<TTemplate<typeof SetupSkeleton>['layout_styles']>().toEqualTypeOf<
			TSkeletonLayoutPlugin['styles'] | undefined
		>()
	})
})

describe('контекст несёт выходы плагинов дескриптора', () => {
	it('createVueAdapterContext(SelectDescriptor()) — без явных дженериков', () => {
		const adapter = createVueAdapterContext(SelectDescriptor(), {})
		const state = stateOf(adapter)

		expectTypeOf(state.dismiss_ownerAttribute).toEqualTypeOf<
			TDismissPlugin['ownerAttribute'] | undefined
		>()
		expectTypeOf(state.keyboard_highlightedUid).toEqualTypeOf<
			TSelectKeyboardPlugin['highlightedUid'] | undefined
		>()
		expectTypeOf(state.editable_query).toEqualTypeOf<TEditablePlugin['query'] | undefined>()

		// Под типом — значение геттера плагина из набора этого контекста
		const dismiss = adapter.bundle?.get(TDismissPlugin)

		expect(dismiss?.ownerAttribute).toEqual({ 'data-owner': String(adapter.instance.uid) })
		expect(state.dismiss_ownerAttribute).toEqual(dismiss?.ownerAttribute)

		adapter.destroy()
	})
})
