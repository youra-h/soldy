import { IconDescriptor } from '@soldy-ui/setup'
import type { IIcon } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupIcon — setup-слой Icon: собирает компонент (`createAngularAdapterContext`)
 * и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: размер (`width`, `height`) плагин раскладки отдаёт
 * выходом `layout_styles`, имя — плагин доступного имени, а на корень их
 * раскладывает база компонента.
 */
export function setupIcon(ctrl: IIcon | undefined, props: object): TBinding<IIcon> {
	const adapter = createAngularAdapterContext(IconDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
