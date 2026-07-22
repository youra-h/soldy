
// === ./soldy/packages\ui\vue\src\adapter\useAdapter.ts ===

/**
 * Vue-адаптер: связывает дескриптор с Vue-реактивностью.
 *
 * Оборачивает framework-agnostic createAdapter из @soldy/setup,
 * добавляя Vue-специфичную логику: toRaw, реактивные refs, привязку DOM-элемента.
 *
 * Компоненту остаётся только передать дескриптор.
 */

import { toRaw } from 'vue'
import type { IComponentDescriptor } from '@soldy/setup'
import { createAdapter } from '@soldy/setup'
import { useRuntime } from './useRuntime'
import { useElementBinding } from './useElementBinding'

export function useAdapter(
	descriptor: IComponentDescriptor,
	props: Record<string, any>,
	emit?: (event: string, ...args: any[]) => void,
) {
	const { instance, bundle, runtime } = createAdapter(descriptor, {
		ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
		plugins: props.plugins,
		props,
	})

	const { refs } = useRuntime(runtime, props, emit)

	const rootElement = useElementBinding(bundle)

	return { ctrl: instance, plugins: bundle, rootElement, ...refs }
}


// === ./soldy/packages\ui\vue\src\adapter\useElementBinding.ts ===

import { ref, onUnmounted, type Ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { IPluginBundle } from '@soldy/plugins'
import { TElementPlugin } from '@soldy/plugins'

/**
 * Утилита для привязки DOM-элемента к `TElementPlugin` внутри бандла.
 * Позволяет легко синхронизировать элемент, на который указывает `rootElement`, с `TElementPlugin` в бандле.
 * @param bundle - бандл, содержащий `TElementPlugin`, который будет синхронизирован с DOM-элементом, на который указывает `rootElement`.
 * @returns `Ref`, который должен быть привязан к корневому элементу компонента. Этот элемент будет автоматически синхронизирован с `TElementPlugin` в бандле при монтировании и размонтировании компонента.
 */
export function useElementBinding(
	bundle: IPluginBundle,
): Ref<Element | ComponentPublicInstance | null> {
	const rootElement = ref<Element | ComponentPublicInstance | null>(null)
	const elementPlugin = bundle.get(TElementPlugin)!

	function syncElement(el: Element | ComponentPublicInstance | null) {
		elementPlugin.element = (el as ComponentPublicInstance)?.$el ?? (el as Element) ?? null
	}

	watch(rootElement, syncElement, { flush: 'post' })

	onUnmounted(() => {
		elementPlugin.element = null
	})

	return rootElement
}


// === ./soldy/packages\ui\vue\src\adapter\useEmits.ts ===

/**
 * Vue-адаптер: генерирует emits из ComponentModel.
 *
 * - events модели → эмитятся как есть
 * - свойства модели → change:{name} для всех, update:{name} для mutable
 */

import type { IDescriptor } from '@soldy/provider'

export function useEmits(descriptor: IDescriptor): string[] {
	const emits: string[] = [...descriptor.events]

	for (const prop of descriptor.props) {
		if (prop.protected) continue

		emits.push(`update:${prop.name}`)
	}

	const uniqueEmits = new Set(emits)

	return [...uniqueEmits]
}


// === ./soldy/packages\ui\vue\src\adapter\useProps.ts ===

/**
 * Vue-адаптер: генерирует props из ComponentModel.
 *
 * Для каждого свойства модели (кроме event) создаёт Vue prop
 * с типом, выведенным из defaultValues конструктора.
 */

import type { IDescriptor } from '@soldy/provider'
import type { TConstructor } from '@soldy/core'

function inferVueType(value: unknown): any {
	if (typeof value === 'boolean') return Boolean

	if (typeof value === 'string') return String

	if (typeof value === 'number') return Number

	if (Array.isArray(value)) return Array

	return [Object]
}

export function useProps(descriptor: IDescriptor): Record<string, any> {
	const defaults: Record<string, any> = (descriptor.ctor as any).defaultValues ?? {}

	const props: Record<string, any> = {}

	for (const prop of descriptor.props) {
		if (prop.protected) continue

		const value = defaults[prop.name]

		props[prop.name] = {
			type: inferVueType(value),
			default: value,
		}
	}

	// entity-level props
	props.ctrl = { type: Object, default: undefined }
	props.plugins = { type: Object, default: undefined }

	return props
}


// === ./soldy/packages\ui\vue\src\adapter\useRefs.ts ===

import { customRef, onUnmounted, type Ref } from 'vue'
import type { IEventSource } from '@soldy/core'

/**
 * Возвращает реактивный `Ref`, который обновляется при срабатывании указанных событий.
 *
 * Решает проблему: мутации внутри классов происходят на raw-объекте, минуя Vue Proxy.
 * Вместо отслеживания через proxy используется ручной `track`/`trigger` через события.
 *
 * @param events        Источник событий (`TEvented`, `TEventEmitter` или любой `IEventSource`).
 * @param getter        Функция, возвращающая актуальное значение при каждом чтении.
 * @param triggerEvents Список имён событий, при которых `Ref` должен обновиться.
 * @returns Реактивный `Ref<T>`.
 */
export function useRefs<T>(
	events: IEventSource,
	getter: () => T,
	triggers: string[],
): Ref<T> {
	let _trigger: () => void

	const ref = customRef<T>((track, trigger) => {
		_trigger = trigger

		return {
			get() {
				track()
				return getter()
			},
			set() {},
		}
	})

	for (const event of triggers) {
		events.on(event, _trigger!)
	}

	onUnmounted(() => {
		for (const event of triggers) {
			events.off(event, _trigger!)
		}
	})

	return ref
}


// === ./soldy/packages\ui\vue\src\adapter\useRuntime.ts ===

/**
 * Vue-адаптер для @soldy/provider Runtime.
 *
 * Создаёт реактивные Vue-refs из Runtime и подписывается на изменения.
 * Синхронизирует внешние props в Runtime.
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { TRuntime, TEmitPayload } from '@soldy/provider'
import { useRefs } from './useRefs'

export function useRuntime(
	runtime: TRuntime,
	externalProps: Record<string, any>,
	emit?: (event: string, ...args: any[]) => void,
) {
	const refs: Record<string, Ref<any>> = {}

	// 1. Создаём реактивные переменные для всех свойств модели
	useRefs()

	// 3. Синхронизация внешних props → Runtime
	const stopWatches: (() => void)[] = []

	for (const prop of runtime.model.props) {
		if (prop.protected) continue

		stopWatches.push(
			watch(
				() => externalProps[prop.name],
				(newVal) => {
					if (newVal !== undefined) {
						runtime.setValue(prop.name, newVal)
					}
				},
			),
		)
	}

	// 4. Cleanup
	onUnmounted(() => {
		stopWatches.forEach((fn) => fn())
		runtime.dispose()
	})

	return {
		refs,
	}
}


// === ./soldy/packages\ui\vue\src\components\component\base.component.ts ===

import { TComponent } from '@soldy/core'
import type { TEmits, TProps } from '../../types'
import { useEmits, useProps } from '../../adapter'
import { ComponentDescriptor } from '@soldy/setup'

export const emitsComponent: TEmits = useEmits(ComponentDescriptor.model) as unknown as TEmits

export const propsComponent: TProps = useProps(ComponentDescriptor.model) as TProps

export default {
	name: 'BaseComponent',
	emits: emitsComponent,
	props: propsComponent,
}


// === ./soldy/packages\ui\vue\src\components\component-view\base.component.ts ===

import type { TEmits, TProps } from '../../types'
import { BaseComponent } from '../component'
import { useEmits, useProps } from '../../adapter'
import { TComponentView } from '@soldy/core'
import { ComponentViewDescriptor } from '@soldy/setup'

export const emitsComponentView: TEmits = useEmits(ComponentViewDescriptor.model) as unknown as TEmits

export const propsComponentView: TProps = useProps(ComponentViewDescriptor.model) as TProps

console.log(propsComponentView, emitsComponentView)

export default {
	name: 'BaseComponentView',
	extends: BaseComponent,
	emits: emitsComponentView,
	props: propsComponentView,
}


// === ./soldy/packages\ui\vue\src\components\component-view\setup.component.ts ===

import { useAdapter } from '../../adapter'
import { ComponentViewDescriptor } from '@soldy/setup'
import { type IComponentViewProps, type IComponentView } from '@soldy/core'
import type { TBaseComponentProps } from './../../types'
import BaseComponentView from './base.component'

export default {
	name: '_ComponentView',
	extends: BaseComponentView,
	setup(props: TBaseComponentProps<IComponentViewProps, IComponentView>, { emit }: any) {
		return useAdapter(ComponentViewDescriptor, props, emit)
	},
}


// === ./soldy/packages\ui\vue\src\components\component-view\ComponentView.vue ===

<script lang="ts">
import SetupComponentView from './setup.component'

export default { ...SetupComponentView }
</script>

<template>
	<component ref="rootElement" :is="tag" v-if="rendered" v-show="visible" :class="classes">
		<slot />
	</component>
</template>


// === ./soldy/packages\ui\vue\src\components\icon\base.component.ts ===

import { type PropType } from 'vue'
import { type IIconProps, TIcon } from '@soldy/core'
import { ComponentView, emitsComponentView, propsComponentView } from '../component-view'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { IconDescriptor } from '@soldy/setup'

const model = IconDescriptor.model

export const emitsIcon: TEmits = useEmits(model) as unknown as TEmits

export const propsIcon: TProps = useProps(model) as TProps

export default {
	name: 'BaseIcon',
	extends: ComponentView,
	emits: emitsIcon,
	props: propsIcon,
}



// === ./soldy/packages\ui\vue\src\components\icon\setup.component.ts ===

import { useAdapter } from '../../adapter'
import { IconDescriptor } from '@soldy/setup'
import BaseIcon from './base.component'
import type { TBaseComponentProps } from './../../types'
import { type IIconProps, type IIcon } from '@soldy/core'

export default {
	name: '_Icon',
	extends: BaseIcon,
	setup(props: TBaseComponentProps<IIconProps, IIcon>, { emit }: any) {
		return useAdapter(IconDescriptor, props, emit)
	},
}


// === ./soldy/packages\ui\vue\src\components\icon\Icon.vue ===

<script lang="ts">
import SetupIcon from './setup.component'

export default { ...SetupIcon }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		:style="styles"
	>
	</component>
</template>

<style lang="scss">
.s-icon {
	&--size-normal {
		@apply w-[1em] h-[1em];
	}

	&--size-lg {
		@apply w-[1.35em] h-[1.35em];
	}

	&--size-sm {
		@apply w-[.875em] h-[.875em];
	}
}
</style>


