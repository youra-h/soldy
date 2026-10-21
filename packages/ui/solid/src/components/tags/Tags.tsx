import { For, Show, type JSX } from 'solid-js'
import { Elevate, ResolvedSlot, createRootProps, relaySlot, renderSlot } from '../../adapter'
import { TagsItem } from './item'
import { setupTags } from './setup.component'
import type { TagsProps } from './base.component'

/**
 * Tags — набор тегов: ряд (`div`), в нём теги, как у Vue.
 *
 * На корне — три набора ядра: `attrs`, `aria` и `dataset`. Роль ряда (`list`
 * без выбора, `listbox` с выбором, `aria-orientation`, `aria-multiselectable`)
 * пишет коллекция в `aria`, режим переполнения уезжает в тему через
 * `data-overflow` (`dataset`), и раскладка ряда — перенос, прокрутка — целиком
 * её дело. Атрибуты потребителя ложатся на корень поверх наборов, как у Vue:
 * ряд с ролью и есть набор. `ref` адаптера — последним.
 *
 * Теги — содержимое (`<Tags.Item>`), а без него — показанные теги коллекции
 * (`shown`), по `TagsItem` на тег. `shown`, а не `items`: это то, что осталось
 * после отбора, — скрытый тег размонтируется, но из коллекции не исчезает.
 * `<For>`, а не петля по ключу: теги — экземпляры, и ссылка на них устойчива.
 * Слот `default` получает показанные теги в scope и петлю заменяет: своя
 * разметка раскладывает их, как ей нужно, — в ленту, в ряд с хвостом в
 * панели, — и каждый тег рисуется ровно один раз: вторая отрисовка перетёрла
 * бы его запись в реестре bundles.
 *
 * Слоты тегов статические и получают тег через scope. Проброс целиком: у
 * каждого слота тега есть `item-<слот>` (`default` — `item`), и scope у него —
 * scope слота тега плюс сам тег. Слот со scope тег получает функцией
 * (`relaySlot`): узлы, которые нарисовал набор, scope тега теряли бы. Слоты
 * без своего scope — края и иконку крестика — набор рисует сам, с тегом в
 * scope; пустое, что вернул слот набора, тег видит и рисует своё — текст и
 * иконку крестика, — как у Vue.
 *
 * Всё содержимое — в слое лифта набора (`Elevate`): тег, смонтированный
 * внутри, прочтёт движок и регистратор набора и при своей сборке войдёт в его
 * коллекцию. Содержимое со своей раскладкой разворачивается там же
 * (`ResolvedSlot`, со scope показанных тегов), а не в теле набора: узлы тегов
 * Solid создал бы там, где развернули слот, — вне его слоя.
 */
export function Tags(props: TagsProps): JSX.Element {
	const binding = setupTags(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<div {...root()} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<ResolvedSlot
						content={props.children}
						scope={() => ({ shown: state.shown ?? [] })}
						fallback={
							<For each={state.shown}>
								{(item) => (
									<TagsItem
										ctrl={item}
										leading={renderSlot(props['item-leading'], { item })}
										trailing={renderSlot(props['item-trailing'], { item })}
										close-icon={renderSlot(props['item-close-icon'], {
											item,
										})}
									>
										{relaySlot(props.item, { item })}
									</TagsItem>
								)}
							</For>
						}
					/>
				</Elevate>
			</div>
		</Show>
	)
}
