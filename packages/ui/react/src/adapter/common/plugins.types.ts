/**
 * plugins.types.ts — React-типы плагинов, выведенные из их contributions
 * (см. packages/setup/descriptors/plugins).
 *
 * Если у плагина есть contribution (props/events), то эти свойства и события
 * доступны фреймворку. Здесь для каждого такого плагина объявлен тип его
 * событийных колбэков в React-стиле (onXxx).
 *
 * namespace НЕ дублируется: он выводится из дескриптора плагина через
 * TDescriptorNamespace — единственный источник истины лежит в descriptors/plugins.
 */

import type {
	TElementServiceEvents,
	TFrameLayoutPluginEvents,
	TIconLayoutPluginEvents,
	TListItemPluginEvents,
	TSkeletonLayoutPluginEvents,
	TSpinnerLayoutPluginEvents,
} from '@soldy/plugins'
import type {
	ElementPluginDescriptor,
	FrameLayoutPluginDescriptor,
	IconLayoutPluginDescriptor,
	ListItemPluginDescriptor,
	SkeletonLayoutPluginDescriptor,
	SpinnerLayoutPluginDescriptor,
} from '@soldy/setup'
import type { NamespacedEvents, ReactEventProps, TDescriptorNamespace } from './naming.types'

/** Событийные колбэки плагина: namespace выводится из дескриптора. */
type TPluginEventProps<
	TEvents extends Record<string, (...args: any[]) => any>,
	TDescriptor,
> = ReactEventProps<NamespacedEvents<TEvents, TDescriptorNamespace<TDescriptor>>>

/** Element-плагин: onElementReady / onElementRemoved. */
export type TElementEventProps = TPluginEventProps<
	TElementServiceEvents,
	typeof ElementPluginDescriptor
>

/** FrameLayout-плагин: onLayoutChangeStyles / onLayoutChangeAnchor. */
export type TFrameLayoutEventProps = TPluginEventProps<
	TFrameLayoutPluginEvents,
	typeof FrameLayoutPluginDescriptor
>

/** IconLayout-плагин: onLayoutChangeStyles. */
export type TIconLayoutEventProps = TPluginEventProps<
	TIconLayoutPluginEvents,
	typeof IconLayoutPluginDescriptor
>

/** ListItem-плагин: onListItemChangeHighlighted. */
export type TListItemEventProps = TPluginEventProps<
	TListItemPluginEvents,
	typeof ListItemPluginDescriptor
>

/** SkeletonLayout-плагин: onLayoutChangeStyles. */
export type TSkeletonLayoutEventProps = TPluginEventProps<
	TSkeletonLayoutPluginEvents,
	typeof SkeletonLayoutPluginDescriptor
>

/** SpinnerLayout-плагин: onLayoutChangeStyles. */
export type TSpinnerLayoutEventProps = TPluginEventProps<
	TSpinnerLayoutPluginEvents,
	typeof SpinnerLayoutPluginDescriptor
>
