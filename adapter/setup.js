
// === ./soldy/packages\setup\adapter\createAdapter.ts ===

/**
 * Framework-agnostic адаптер: создаёт instance, bundle, runtime из дескриптора.
 *
 * Не зависит от конкретного фреймворка — используется как фундамент для
 * Vue-адаптера (useAdapter), React-адаптера, и т.д.
 */

import type { IComponentDescriptor } from '../descriptors/types'
import { TInstancePlugin } from '@soldy/plugins'

export function createAdapter(
	descriptor: IComponentDescriptor,
	options: { ctrl?: any; plugins?: any; props?: any },
) {
	// Если instance не передан — создаём его через конструктор из дескриптора.
	const instance = options.ctrl ?? new (descriptor.ctor as any)({ props: options.props })

	// Если bundle не передан — создаём его через дескриптор.
	const bundle = options.plugins ?? descriptor.createBundle()

	const instancePlugin = bundle.get(TInstancePlugin)

	if (instancePlugin) {
		instancePlugin.instance = instance
	}

	const runtime = descriptor.createRuntime({ instance, bundle })

	return { instance, bundle, runtime }
}


// === ./soldy/packages\setup\contributions\components\entity.ts ===

import type { IContribution } from '@soldy/accessor'

export const EntityContribution: IContribution = {
	props: [
		{ name: 'ctrl', protected: true },
		{ name: 'plugins', protected: true },
	],
}


// === ./soldy/packages\setup\contributions\components\component.ts ===

import type { IContribution } from '@soldy/accessor'

export const ComponentContribution: IContribution = {
	props: [
		{ name: 'rendered', triggers: ['change:rendered'] },
		{ name: 'visible', triggers: ['change:visible'] },
		{ name: 'present', protected: true, triggers: ['change:rendered', 'change:visible'] },
	],
	events: ['created', 'show', 'hide', 'show:before', 'show:after', 'hide:before', 'hide:after'],
}


// === ./soldy/packages\setup\contributions\components\component-view.ts ===

import type { IContribution } from '@soldy/accessor'

export const ComponentViewContribution: IContribution = {
	props: [
		{ name: 'tag', triggers: ['change:tag'] },
		{ name: 'classes', protected: true, triggers: ['change:classes'] },
	],
	events: ['ready'],
}


// === ./soldy/packages\setup\contributions\components\icon.ts ===

import type { IContribution } from '@soldy/accessor'

export const IconContribution: IContribution = {
	props: [
		{ name: 'size', triggers: ['change:size'] },
		{ name: 'width', triggers: ['change:width'] },
		{ name: 'height', triggers: ['change:height'] },
	],
}


// === ./soldy/packages\setup\contributions\plugins\element.ts ===

import type { IContribution } from '@soldy/accessor'

export const ElementContribution: IContribution = {
	events: ['ready', 'removed'],
}


// === ./soldy/packages\setup\descriptors\types.ts ===

/**
 * Типы для ComponentDescriptor — единого источника истины о компоненте.
 *
 * Дескриптор консолидирует: Contribution + Provider + Constructor + Plugins.
 * Заменяет ручную сборку compileComponent([...]) и ручную регистрацию провайдеров.
 */


/** Определение плагина в составе дескриптора.
 * contribution и accessor опциональны — если плагин не выставляет пропы наружу,
 * он просто добавляется в bundle без попадания в модель. */
export interface IPluginDefinition {
}

/** Опции для defineComponent(). */
export interface IComponentDescriptorOptions {
}

/**
 * Дескриптор компонента — единственный источник истины.
 * Содержит всё необходимое для создания модели, бандла, провайдера и рантайма.
 */
export interface IComponentDescriptor {
}


// === ./soldy/packages\setup\descriptors\define-component.ts ===

/**
 * defineComponent / definePlugin — фабрики дескрипторов компонентов.
 *
 * Перенесено из @soldy/accessor: использует TPluginBundle из @soldy/plugins.
 * В @soldy/accessor остаются только интерфейсы (IComponentDescriptor и др.).
 */

import type {
	IPluginDefinition,
	IComponentDefinition,
	IPluginDefinitionOptions,
	IComponentDefinitionOptions,
} from './types'

// --- definePlugin ---

export function definePlugin(options: IPluginDefinitionOptions): IPluginDefinition {}

// --- defineComponent ---

export function defineComponent(options: IComponentDefinitionOptions): IComponentDefinition {}


// === ./soldy/packages\setup\descriptors\components\entity.descriptor.ts ===

import { defineComponent } from '../define-component'
import { EntityContribution } from '../../contributions'

export const EntityDescriptor = defineComponent({
	contribution: EntityContribution,
})


// === ./soldy/packages\setup\descriptors\components\component.descriptor.ts ===

import { defineComponent } from '../define-component'
import { TAccessorProvider } from '../../providers/components'
import { TComponent } from '@soldy/core'
import { ComponentContribution } from '../../contributions'

export const ComponentDescriptor = defineComponent({
	ctor: TComponent,

	extends: EntityContribution,

	contribution: ComponentContribution,

	accessor: TAccessorProvider,
})


// === ./soldy/packages\setup\descriptors\components\component-view.descriptor.ts ===

import { defineComponent, definePlugin } from '../define-component'
import { TAccessorProvider } from '../../providers/components'
import { TComponentView } from '@soldy/core'
import { TElementPlugin, TInstancePlugin } from '@soldy/plugins'
import { ComponentViewContribution } from '../../contributions/components'
import { ElementContribution } from '../../contributions/plugins'
import { TElementPluginAccessorProvider } from '../../providers/plugins/element'
import { ComponentDescriptor } from './component.descriptor'

export const ComponentViewDescriptor = defineComponent({
	ctor: TComponentView,

	extends: ComponentDescriptor,

	contribution: ComponentViewContribution,

	plugins: [
		definePlugin({
			ctor: TElementPlugin,
			contribution: ElementContribution,
			accessor: TElementPluginAccessorProvider,
		}),
		definePlugin({
			ctor: TInstancePlugin,
		}),
	],

	accessor: TAccessorProvider,
})


// === ./soldy/packages\setup\descriptors\components\icon.descriptor.ts ===

/**
 * Дескриптор Icon (TIcon).
 *
 * Наследует ComponentViewDescriptor (rendered, visible, present, tag, classes, element, instance)
 * и добавляет size, width, height + плагин IconStyle (styles).
 */

import { defineComponent, definePlugin } from '../define-component'
import { TAccessorProvider } from '../../providers/components'
import { TIcon } from '@soldy/core'
import { TIconStylePlugin } from '@soldy/plugins'
import { IconContribution } from '../../contributions/components/icon'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const IconDescriptor = defineComponent({
	ctor: TIcon,

	extends: ComponentViewDescriptor,

	contribution: IconContribution,

	plugins: [
		definePlugin({
			ctor: TIconStylePlugin,
		}),
	],

	accessor: TAccessorProvider,
})


