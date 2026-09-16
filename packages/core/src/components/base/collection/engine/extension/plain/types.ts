import type { TCollectionStorageDriverEvents } from '../../types'

/**
 * События расширения базовых операций — карта драйвера целиком.
 *
 * `plain` не эмитит ничего сам, он `relayAll`-ом отдаёт наружу события
 * хранилища. Поэтому карта не перечисляет имена, а ссылается на источник:
 * новое событие драйвера появляется здесь само. Перечисление разошлось бы —
 * до перехода на `relayAll` карта обещала `items:query:before` и
 * `items:query:invalidated`, а проброс их не передавал, и подписка на них
 * не срабатывала никогда.
 */
export type TPlainEvents<TItem extends object = any> = TCollectionStorageDriverEvents<TItem>
