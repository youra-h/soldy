import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: результат замера виден через инстанс —
 * `canPrev`/`canNext` и `data-can-*` отдаёт ядро, оно же сообщает об их
 * смене. Второй путь к тому же факту, через события плагина, разошёлся бы
 * с первым.
 */
export type TScrollerViewportPluginEvents = TPluginEvents
