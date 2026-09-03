/**
 * plugins.types.ts — React-типы плагинов, выведенные из их contributions
 * (см. packages/setup/descriptors/plugins).
 *
 * Если у плагина есть contribution (props/events), то эти свойства и события
 * доступны фреймворку. Здесь для каждого такого плагина объявлен тип его
 * событийных колбэков в React-стиле (onXxx), выведенный из событийного
 * интерфейса плагина и его namespace.
 *
 * Используются совместно с трансформерами из naming.types.ts:
 *
 *   ReactEventProps<NamespacedEvents<TElementServiceEvents, 'element'>>
 *     → { onElementReady?, onElementRemoved? }
 */

import type {
	TElementServiceEvents,
	TFrameLayoutPluginEvents,
	TIconLayoutPluginEvents,
	TListItemPluginEvents,
	TSkeletonLayoutPluginEvents,
	TSpinnerLayoutPluginEvents,
} from '@soldy/plugins'
import type { NamespacedEvents, ReactEventProps } from './naming.types'

/** Element-плагин (namespace 'element'): onElementReady / onElementRemoved. */
export type TElementEventProps = ReactEventProps<
	NamespacedEvents<TElementServiceEvents, 'element'>
>

/** FrameLayout-плагин (namespace 'layout'): onLayoutChangeStyles / onLayoutChangeAnchor. */
export type TFrameLayoutEventProps = ReactEventProps<
	NamespacedEvents<TFrameLayoutPluginEvents, 'layout'>
>

/** IconLayout-плагин (namespace 'layout'): onLayoutChangeStyles. */
export type TIconLayoutEventProps = ReactEventProps<
	NamespacedEvents<TIconLayoutPluginEvents, 'layout'>
>

/** ListItem-плагин (namespace 'listItem'): onListItemChangeHighlighted. */
export type TListItemEventProps = ReactEventProps<
	NamespacedEvents<TListItemPluginEvents, 'listItem'>
>

/** SkeletonLayout-плагин (namespace 'layout'): onLayoutChangeStyles. */
export type TSkeletonLayoutEventProps = ReactEventProps<
	NamespacedEvents<TSkeletonLayoutPluginEvents, 'layout'>
>

/** SpinnerLayout-плагин (namespace 'layout'): onLayoutChangeStyles. */
export type TSpinnerLayoutEventProps = ReactEventProps<
	NamespacedEvents<TSpinnerLayoutPluginEvents, 'layout'>
>
