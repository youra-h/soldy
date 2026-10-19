import type { TNeighbours } from '../../../../base/collection/engine/extension/neighbours'
import type { ISelectExtension } from './select/types'
import type { ISelectTagsExtension } from './tags/types'

/**
 * Соседи по коллекции Select.
 *
 * Расширения Select и плагины поля опираются на соседей, которых нет у
 * других коллекций: текст выбранного и выбор пользователя (`select`), теги
 * в поле (`tags`). Их узнают проверкой контракта, а не приведением типа, как
 * стандартных соседей (`neighbours.ts` движка). Имя `tags` занято и у Tags,
 * с другим контрактом, поэтому охранник тегов Select назван с компонентом.
 *
 * Искать можно в любой коллекции — у чужой охранник отдаёт `undefined`,
 * поэтому тип её элементов не важен, а контракт — Select'а.
 */

function isSelect(ext: object): ext is ISelectExtension {
	return 'chooseItem' in ext && 'clear' in ext && 'text' in ext && 'indicator' in ext
}

function isSelectTags(ext: object): ext is ISelectTagsExtension {
	return 'syncTags' in ext && 'hasTags' in ext && 'overflow' in ext && 'engine' in ext
}

/** Расширение Select, если оно есть в коллекции: текст выбранного и выбор пользователя. */
export function selectOf<TItem extends object>(
	neighbours: TNeighbours<TItem> | null | undefined,
): ISelectExtension | undefined {
	const ext = neighbours?.extensions.select

	return ext && isSelect(ext) ? ext : undefined
}

/** Теги в поле Select, если они есть в коллекции. У Tags расширение `tags` — другое. */
export function selectTagsOf<TItem extends object>(
	neighbours: TNeighbours<TItem> | null | undefined,
): ISelectTagsExtension | undefined {
	const ext = neighbours?.extensions.tags

	return ext && isSelectTags(ext) ? ext : undefined
}
