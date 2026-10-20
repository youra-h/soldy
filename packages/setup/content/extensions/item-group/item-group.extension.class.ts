/**
 * TItemGroupExtension — часть группы входит в группировку коллекции: ключ — элементам внутри, подпись — группировке.
 *
 * Группа разметки (`Menu.Group`, `Menu.RadioGroup`, `ListBox.Group`,
 * `Select.Group`) идёт тем же каналом, что метка `_.group` в данных: она
 * опускает по лифту (`ITEM_GROUP_ELEVATOR`) свой ключ вместе с движком своей
 * коллекции, а элемент внутри кладёт ключ себе в отметки, когда входит в
 * коллекцию (`TCollectionItemExtension`). Второго хранилища членства нет —
 * ключ помнит `meta`, как метку из данных.
 *
 * Ключ — от экземпляра группы (`uid`): обращаться к группе разметки по ключу
 * потребителю незачем, и отдельного пропа под него нет. В документ ключ не
 * уходит, поэтому сервер и браузер его не сверяют.
 *
 * Подпись группа регистрирует в группировке (`register`): секции получают её,
 * когда в `groups` подписи нет. Регистрация отдельна от `groups` — сброс
 * пропа группы разметки не стирает — и порядка не задаёт. Сменилась подпись —
 * группа регистрирует новую поверх прежней.
 *
 * Фазы — как у связки поля (`TFieldControlExtension`):
 *
 * - **сборка** — связка элементам: они читают её при своей сборке;
 * - **вход** (`attach` контекста) — регистрация подписи и подписка на её
 *   смену. Группировка — чужое хранилище, а собранную группу фреймворк вправе
 *   выбросить, так и не приняв;
 * - **снятие** (`destroy` контекста) — отписка и снятие регистрации.
 *
 * Коллекции выше нет или группировки у неё нет — группа опускает пустую
 * связку: элементам ключ не нужен, а связка группы выше до них не доходит.
 * Группа, которую владелец рисует по секции из данных, — та же часть: её
 * ключа нет ни у одного элемента — элемент из данных ключ группы не берёт, —
 * и регистрация секций не меняет.
 *
 * Использование:
 *   adapter.use(TItemGroupExtension, { elevator: VueElevatorFactory })
 */

import { groupOf } from '@soldy-ui/core'
import type { TInstanceContext } from '../../../protected/adapter/context'
import { ITEM_CONTEXT_ELEVATOR } from '../../../protected/adapter/elevator/keys'
import { ITEM_GROUP_ELEVATOR } from './keys'
import type { IItemGroupExtensionOptions, TItemGroupPart } from './types'

export class TItemGroupExtension {
	constructor(context: TInstanceContext<TItemGroupPart>, options: IItemGroupExtensionOptions) {
		const link = options.elevator(ITEM_GROUP_ELEVATOR)
		const engine = options.elevator(ITEM_CONTEXT_ELEVATOR).up()
		const grouping = groupOf(engine)

		if (!engine || !grouping) {
			link.down(null)

			return
		}

		const group = context.instance
		const key = `item-group:${group.uid}`
		/** Снятие последней регистрации: новая подпись регистрируется поверх прежней. */
		let release: (() => void) | undefined

		const register = (): void => {
			release = grouping.register({ key, label: group.label })
		}

		link.down({ key, engine })

		context.events.on('attach', () => {
			register()
			group.events.on('change:label', register)
		})

		context.events.on('destroy', () => {
			group.events.off('change:label', register)
			release?.()
			release = undefined
		})
	}
}
