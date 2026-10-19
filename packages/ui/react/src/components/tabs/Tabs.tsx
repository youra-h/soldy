import type { ReactElement } from 'react'
import {
	Elevate,
	hasSlot,
	relaySlot,
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../adapter'
import { TabsItem } from './item'
import { useSetupTabs } from './setup.component'
import type { TabsAttributes, TabsProps } from './base.component'

/**
 * Tabs — набор табов: список (`so-tabs__list`) и панели рядом с ним.
 *
 * Набор `aria` владельца — это список табов: `role="tablist"` и
 * `aria-orientation` пишет ядро, имя из `aria_label` — `TAriaPlugin`. Корень
 * его не получает: рядом со списком там лежат панели. На корне — `attrs` и
 * `dataset`, как у Vue: выключенный набор тема гасит корнем, вместе с
 * панелями (`data-disabled`).
 *
 * Атрибуты потребителя делятся, как у поля и у Vue: класс и стиль — корню,
 * остальное — списку табов, поверх его `aria`: `aria-label` и `id`
 * потребителя называют список, а не корень без роли. `ref` потребителя —
 * корень.
 *
 * Табы — дети (`<Tabs.Item>`), а без детей — `shown` коллекции, по `TabsItem`
 * на элемент. Слоты элементов статические и получают элемент через scope.
 * Проброс целиком: у каждого слота таба есть `item-<слот>` (`default` —
 * `item`), и scope у него — scope слота таба плюс сам таб; слот со scope таб
 * получает функцией (`relaySlot`), а не готовым узлом. Панели
 * (`<Tabs.Content>`) — слот `content`, вне списка: дети лежат внутри
 * `[role=tablist]`, и панель там оказалась бы в списке табов.
 *
 * Список и панели — в слое лифта набора (`Elevate`): таб, смонтированный
 * внутри, при коммите войдёт в его коллекцию, а панель найдёт свой таб в его
 * движке.
 */
export function Tabs(props: TabsProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupTabs(props)

	const { rendered, shown, attrs, aria, dataset } = state

	if (!rendered) return null

	return (
		<div {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			<Elevate layer={layer}>
				<div
					className="so-tabs__list"
					{...toAriaProps(aria)}
					{...toControlAttrs<TabsAttributes>(forwardProps)}
				>
					{hasSlot(props.leading) ? (
						<div className="so-tabs__list--leading">{renderSlot(props.leading)}</div>
					) : null}
					{hasSlot(props.children)
						? renderSlot(props.children)
						: shown?.map((item) => (
								<TabsItem
									key={item.uid}
									ctrl={item}
									leading={renderSlot(props['item-leading'], { item })}
									trailing={renderSlot(props['item-trailing'], { item })}
									close-icon={renderSlot(props['item-close-icon'], { item })}
								>
									{relaySlot(props.item, { item })}
								</TabsItem>
							))}
					{hasSlot(props.trailing) ? (
						<div className="so-tabs__list--trailing">{renderSlot(props.trailing)}</div>
					) : null}
				</div>
				{renderSlot(props.content)}
			</Elevate>
		</div>
	)
}
