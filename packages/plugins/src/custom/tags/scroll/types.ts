import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: результат доводки — положение самого ряда, и о
 * прокрутке сообщает он (`scroll`).
 */
export type TTagsScrollPluginEvents = TPluginEvents
