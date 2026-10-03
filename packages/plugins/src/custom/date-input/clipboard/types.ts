import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: что скопировали, видно в буфере обмена, а
 * вставку и вырезание — в частях ядра.
 */
export type TDateInputClipboardPluginEvents = TPluginEvents
