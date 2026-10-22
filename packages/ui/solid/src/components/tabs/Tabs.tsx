import type { JSX } from 'solid-js'
import {
	Elevate,
	ResolvedSlot,
	createPartProps,
	createRootProps,
	relaySlot,
	renderSlot,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { For, Show } from '../../adapter/runtime/flow'
import { TabsItem } from './item'
import { setupTabs } from './setup.component'
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
 * остальное, кроме `ref`, — списку табов, поверх его `aria`: `aria-label` и
 * `id` потребителя называют список, а не корень без роли. `ref` потребителя —
 * корень.
 *
 * Табы — содержимое (`<Tabs.Item>`), а без него — `shown` коллекции, по
 * `TabsItem` на элемент. Слоты элементов статические и получают элемент через
 * scope. Проброс целиком: у каждого слота таба есть `item-<слот>` (`default` —
 * `item`), и scope у него — scope слота таба плюс сам таб; слот со scope таб
 * получает функцией (`relaySlot`), а не готовыми узлами. Панели
 * (`<Tabs.Content>`) — слот `content`, вне списка: содержимое лежит внутри
 * `[role=tablist]`, и панель там оказалась бы в списке табов. Тема рисует вид
 * набора от его корня дочерними комбинаторами: список и панели — дети корня,
 * табы — дети списка.
 *
 * Список и панели — в слое лифта набора (`Elevate`): таб, смонтированный
 * внутри, при своей сборке войдёт в его коллекцию, а панель найдёт свой таб в
 * его движке. Слоты, по которым разметка решает, что рисовать, — содержимое и
 * края списка, — разворачиваются там же (`ResolvedSlot`): узлы табов Solid
 * создал бы там, где развернули слот, — вне слоя набора.
 */
export function Tabs(props: TabsProps): JSX.Element {
	const binding = setupTabs(props)
	const state = binding.state
	// Корню — `attrs`, `dataset`, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	// Списку табов — его `aria`, поверх — остальное от потребителя
	const aria = createPartProps(() => state.aria)
	const control = createPartProps(() => toControlAttrs<TabsAttributes>(binding.forwardProps()))

	return (
		<Show when={state.rendered}>
			<div {...root()} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<div class="so-tabs__list" {...aria()} {...control()}>
						<ResolvedSlot content={props.leading}>
							{(leading) => <div class="so-tabs__list--leading">{leading()}</div>}
						</ResolvedSlot>
						<ResolvedSlot
							content={props.children}
							fallback={
								<For each={state.shown}>
									{(item) => (
										<TabsItem
											ctrl={item}
											leading={renderSlot(props['item-leading'], { item })}
											trailing={renderSlot(props['item-trailing'], { item })}
											close-icon={renderSlot(props['item-close-icon'], {
												item,
											})}
										>
											{relaySlot(props.item, { item })}
										</TabsItem>
									)}
								</For>
							}
						/>
						<ResolvedSlot content={props.trailing}>
							{(trailing) => <div class="so-tabs__list--trailing">{trailing()}</div>}
						</ResolvedSlot>
					</div>
					{renderSlot(props.content)}
				</Elevate>
			</div>
		</Show>
	)
}
