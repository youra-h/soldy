/**
 * useSetupTableRow — setup-слой строки таблицы (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у элементов Vue: собственный
 * (`TableRowDescriptor` — запись, «выключена», наборы) и фасада
 * (`TableCollectionRowDescriptor` — выбор, ячейки, имя строки, выбор строк).
 * Расширение элемента берёт через лифт движок и регистратор строк таблицы и
 * отдаёт фасаду контекст строки.
 *
 * В коллекцию строка входит, когда `useAdapterContext` принимает контексты при
 * коммите, а не на рендере. Пересобранная таблица без движка снаружи — это
 * новый движок с новыми строками: таблица рисует их с новыми ключами.
 *
 * `context` отдаётся разметке явно: чекбокс выбора строки — экземпляр,
 * который держит таблица, и разметка берёт его у item-адаптера таблицы
 * (`context.adapters.table`) — и только в ячейке выбора, поэтому у таблицы
 * без выбора чекбоксов строк нет вовсе.
 */

import {
	TCollectionItemExtension,
	TableCollectionRowDescriptor,
	TableRowDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { TableRowProps } from './base.component'

export function useSetupTableRow(props: TableRowProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(TableRowDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			TableCollectionRowDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, elevator })

		return [adapter, item] as const
	})

	const owner = useAdapter(adapter, props)
	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: facade.forwardProps,
		state: { ...facade.state, ...owner.state },
		context: item.instance.context,
	}
}
