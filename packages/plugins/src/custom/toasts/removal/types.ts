import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: удаление видно через коллекцию —
 * `item:removed`.
 */
export type TToastsRemovalPluginEvents = TPluginEvents
