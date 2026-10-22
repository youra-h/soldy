import type { ReactElement } from 'react'
import { Elevate, hasSlot, relaySlot, renderSlot, toRootProps } from '../../adapter'
import { TagsItem } from './item'
import { useSetupTags } from './setup.component'
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
 * Теги — дети (`<Tags.Item>`), а без детей — показанные теги коллекции
 * (`shown`), по `TagsItem` на тег, ключ — тег. `shown`, а не `items`: это то,
 * что осталось после отбора, — скрытый тег размонтируется, но из коллекции не
 * исчезает. Дети-функция получают показанные теги в scope и петлю заменяют:
 * своя разметка раскладывает их, как ей нужно, — в ленту, в ряд с хвостом в
 * панели, — и каждый тег рисуется ровно один раз: вторая отрисовка перетёрла
 * бы его запись в реестре bundles.
 *
 * Слоты тегов статические и получают тег через scope. Проброс целиком: у
 * каждого слота тега есть `item-<слот>` (`default` — `item`), и scope у него —
 * scope слота тега плюс сам тег. Слот со scope тег получает функцией
 * (`relaySlot`): узел, который нарисовал набор, scope тега терял бы. Слоты без
 * своего scope — края и иконку крестика — набор рисует сам, с тегом в scope;
 * пустое, что вернул слот набора, тег видит и рисует своё — текст и иконку
 * крестика, — как у Vue.
 *
 * Всё содержимое — в слое лифта набора (`Elevate`): тег, смонтированный
 * внутри, прочтёт движок и регистратор набора и при коммите войдёт в его
 * коллекцию — и тег своей раскладки тоже.
 */
export function Tags(props: TagsProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupTags(props)

	const { rendered, shown, attrs, aria, dataset } = state

	if (!rendered) return null

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	return (
		<div {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{hasSlot(props.children)
					? renderSlot(props.children, { shown: shown ?? [] })
					: shown?.map((item) => (
							<TagsItem
								key={item.uid}
								ctrl={item}
								leading={renderSlot(props['item-leading'], { item })}
								trailing={renderSlot(props['item-trailing'], { item })}
								close-icon={renderSlot(props['item-close-icon'], { item })}
							>
								{relaySlot(props.item, { item })}
							</TagsItem>
						))}
			</Elevate>
		</div>
	)
}
