import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: нажатие видно по фокусу части, а правка из
 * контекстного меню — в частях ядра.
 */
export type TDateInputPointerPluginEvents = TPluginEvents
