import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: режим виден в наборах частей
 * (`contenteditable`), а правка с экранной клавиатуры — в частях ядра.
 */
export type TDateInputTouchPluginEvents = TPluginEvents
