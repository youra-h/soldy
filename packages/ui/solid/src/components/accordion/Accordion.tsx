import { For, Show, type JSX } from 'solid-js'
import { Elevate, ResolvedSlot, createRootProps, relaySlot, renderSlot } from '../../adapter'
import { AccordionItem } from './item'
import { setupAccordion } from './setup.component'
import type { AccordionProps } from './base.component'

/**
 * Accordion — набор раскрывающихся секций. На корне — `attrs`, как у Vue.
 *
 * Секции — содержимое (`<Accordion.Item>`), а без него — `shown` коллекции,
 * по `AccordionItem` на элемент. Слоты элементов статические и получают
 * элемент через scope: `item` — заголовок, `item-leading` и `item-trailing` —
 * по его краям, `item-leading-icon` и `item-trailing-icon` — стрелки,
 * `item-content` — содержимое панели. Отдельного `Accordion.Content` нет:
 * панель лежит внутри секции и отдельно от неё не существует.
 *
 * Проброс целиком: у каждого слота секции есть `item-<слот>`, и scope у него —
 * scope слота секции плюс сама секция. Заголовок со своим scope секция
 * получает функцией (`relaySlot`), а не готовыми узлами, — иначе `text` и
 * `selected` до слота аккордеона не дошли бы.
 *
 * Всё содержимое — в слое лифта аккордеона (`Elevate`): секция,
 * смонтированная внутри, прочтёт движок и регистратор этого аккордеона и при
 * своей сборке войдёт в его коллекцию. Содержимое разворачивается там же
 * (`ResolvedSlot`), а не в теле аккордеона: узлы секций Solid создал бы там,
 * где развернули слот, — вне его слоя.
 */
export function Accordion(props: AccordionProps): JSX.Element {
	const binding = setupAccordion(props)
	const state = binding.state
	// Корню — `attrs`, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<div {...root()} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<ResolvedSlot
						content={props.children}
						fallback={
							<For each={state.shown}>
								{(item) => (
									<AccordionItem
										ctrl={item}
										leading-icon={renderSlot(props['item-leading-icon'], {
											item,
										})}
										leading={renderSlot(props['item-leading'], { item })}
										header={relaySlot(props.item, { item })}
										trailing={renderSlot(props['item-trailing'], { item })}
										trailing-icon={renderSlot(props['item-trailing-icon'], {
											item,
										})}
									>
										{renderSlot(props['item-content'], { item })}
									</AccordionItem>
								)}
							</For>
						}
					/>
				</Elevate>
			</div>
		</Show>
	)
}
