import type { ReactElement } from 'react'
import { renderButton } from '../button/Button'
import type { ButtonProps } from '../button/base.component'
import { useSetupItemRow } from './setup.component'

/**
 * Строка элемента коллекции — деталь разметки ListBox.Item, опции Select,
 * пунктов меню и тега. Пропсы и разметка — Button (`renderButton`), сборка
 * своя — по `ItemRowDescriptor`: её экземпляр (`TItemRow`) роль и остановку
 * Tab себе не пишет, их несёт набор `aria` элемента, который разметка кладёт
 * на строку.
 *
 * Экземпляр создаёт это монтирование и отпускает его снятие: строка живёт,
 * пока нарисована, и окно `Virtual` держит их столько, сколько показывает.
 */
export function ItemRow(props: ButtonProps): ReactElement | null {
	return renderButton(useSetupItemRow(props), props)
}
