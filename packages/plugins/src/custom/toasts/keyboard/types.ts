import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: результат клавиши виден и так — фокус
 * сообщает DOM, закрытие — тост (`change:open`) и коллекция (`item:close`).
 */
export type TToastsKeyboardPluginEvents = TPluginEvents
