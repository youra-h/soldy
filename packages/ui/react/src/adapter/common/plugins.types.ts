/**
 * plugins.types.ts — React-типы плагинов, выведенные из их дескрипторов
 * (см. packages/setup/descriptors/plugins).
 *
 * Если у плагина есть contribution (props/events), то эти свойства и события
 * доступны фреймворку. Здесь для каждого такого плагина объявлен тип его
 * событийных колбэков в React-стиле (onXxx).
 *
 * namespace и события НЕ дублируются: оба выводятся из дескриптора плагина
 * (PluginDescriptorNamespace / PluginDescriptorEvents из @soldy/setup).
 */

import type {
	ElementPluginDescriptor,
	FrameLayoutPluginDescriptor,
	IconLayoutPluginDescriptor,
	ListItemPluginDescriptor,
	SkeletonLayoutPluginDescriptor,
	SpinnerLayoutPluginDescriptor,
} from '@soldy/setup'
import type { PluginDescriptorEvents, PluginDescriptorNamespace, NamespacedEvents } from '@soldy/setup'
import type { ReactEventProps } from './naming.types'

/** Событийные колбэки плагина: namespace и события выводятся из дескриптора. */
type TPluginEventProps<TDescriptor> = ReactEventProps<
	NamespacedEvents<PluginDescriptorEvents<TDescriptor>, PluginDescriptorNamespace<TDescriptor>>
>

/** Element-плагин: onElementReady / onElementRemoved. */
export type TElementEventProps = TPluginEventProps<typeof ElementPluginDescriptor>

/** FrameLayout-плагин: onLayoutChangeStyles / onLayoutChangeAnchor. */
export type TFrameLayoutEventProps = TPluginEventProps<typeof FrameLayoutPluginDescriptor>

/** IconLayout-плагин: onLayoutChangeStyles. */
export type TIconLayoutEventProps = TPluginEventProps<typeof IconLayoutPluginDescriptor>

/** ListItem-плагин: onListItemChangeHighlighted. */
export type TListItemEventProps = TPluginEventProps<typeof ListItemPluginDescriptor>

/** SkeletonLayout-плагин: onLayoutChangeStyles. */
export type TSkeletonLayoutEventProps = TPluginEventProps<typeof SkeletonLayoutPluginDescriptor>

/** SpinnerLayout-плагин: onLayoutChangeStyles. */
export type TSpinnerLayoutEventProps = TPluginEventProps<typeof SpinnerLayoutPluginDescriptor>
