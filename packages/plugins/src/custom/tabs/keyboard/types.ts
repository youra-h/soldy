import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: результат нажатия виден и так — активацию
 * сообщает коллекция (`change:activation`), фокус — DOM.
 */
export type TTabsKeyboardPluginEvents = TPluginEvents
