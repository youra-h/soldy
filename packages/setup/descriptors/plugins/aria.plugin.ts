import { definePlugin } from '../base'
import { TAriaPlugin } from '@soldy/plugins'
import type { IAriaPluginOptions, TAriaPluginEvents } from '@soldy/plugins'
import { AriaContribution } from '../../contributions'

/**
 * Доступное имя компонента: `aria_label`, `aria_labelledBy`,
 * `aria_describedBy` и вычисленный из них `aria_attributes`.
 *
 * Подключается адресно, а не всем подряд. Подключён к ControlDescriptor —
 * у интерактивного элемента имя обязано быть всегда, это первое правило
 * доступности, и отдельно вспоминать про него для каждой новой кнопки нельзя.
 * Неинтерактивным (Icon, Spinner, Frame) добавляется поштучно там, где имя
 * осмысленно; Skeleton его не получает — заглушка декоративна.
 *
 * @param options.role Роль, которую элемент принимает, получив имя.
 *                     Нужна только там, где без имени он декоративен (Icon).
 */
export const AriaPluginDescriptor = (options?: IAriaPluginOptions) =>
	definePlugin<'aria', TAriaPluginEvents>({
		ctor: TAriaPlugin,
		namespace: 'aria',
		contribution: AriaContribution(),
		options,
	})
