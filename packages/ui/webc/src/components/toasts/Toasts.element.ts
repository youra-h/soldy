/**
 * `<so-toasts>` — менеджер всплывающих уведомлений вокруг приложения: тосты
 * приходят из кода, а регион с ними стоит у края окна, поверх слоёв.
 *
 * Элемент — автономный, а не встроенный, как провайдер локали
 * `<so-locale-provider>` и окно `<so-virtual>`: менеджер оборачивает
 * приложение, а у Vue своего узла не рисует вовсе — расширять ему нечего.
 * Поэтому пишется он своим тегом, без `is`, и коробки у него нет
 * (`displayContents`): приложение в нём раскладывается его родителем, как без
 * обёртки.
 *
 * Корень компонента — регион, узел шаблона внутри элемента (описание корня
 * `wrapped`), и в цель `target` (по умолчанию `body`) база уводит его, а не
 * элемент: приложение остаётся на месте. Регион — внешний узел компонента:
 * атрибуты разметки элемента, класс и стиль тоже, база при построении
 * переносит на него, как `$attrs` региона у Vue, а `rendered` и `visible`
 * прячут только его. Снятый со страницы менеджер уводит регион из цели.
 *
 * Тост показывает код: `toastsOf(node).show('Сохранено')` — API ближайшего
 * менеджера выше узла, — или движок, отданный свойством `engine`
 * (`engine.extensions.toasts.show`). Контекстов два — свой и фасада коллекции
 * (`setupToasts`), и пропсы фасада (`engine`, `items`) — атрибуты-входы и
 * свойства того же элемента.
 *
 * Модуль регистрирует и тост. Тост — внутренняя часть: класс его элемента из
 * пакета не выходит.
 *
 * Разметка вынесена в toasts.template.ts, жизненный цикл и перенос — в
 * ElementBase.
 */

import { ToastsCollectionDescriptor, ToastsDescriptor } from '@soldy-ui/setup'
import type { IToasts, TToastsCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { defineAutonomousElement } from '../../adapter/runtime/defineElement'
import { TToastsItemElement } from './item'
import { setupToasts } from './setup.component'
import { toastsTemplate } from './toasts.template'

export const TToastsElement = ElementBase(HTMLElement, {
	descriptor: ToastsDescriptor(),
	facade: ToastsCollectionDescriptor(),
	template: toastsTemplate,
	root: { wrapped: true, teleport: { target: 'target' } },
	setup: setupToasts,
})

defineAutonomousElement('so-toasts', TToastsElement)
defineElement('so-toasts-item', TToastsItemElement, 'li')

/**
 * `<so-toasts>` из JS: элемент HTML, своё элемента soldy (`ctrl`, `state` —
 * вместе со свойствами фасада) и свойства пропов дескриптора вместе с пропсами
 * его плагинов и фасада (`placement`, `layout`, `max`, `engine`) — без
 * `HOST_PROPS` (`TElementProps`).
 */
export type TToastsElementProps = HTMLElement &
	IElementBase<IToasts, TToastsCollectionFacade> &
	TElementProps<typeof ToastsDescriptor, HTMLElement>
