import type { JSX } from 'solid-js'
import { renderButton } from '../button/Button'
import type { ButtonProps } from '../button/base.component'
import { setupItemRow } from './setup.component'

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
export function ItemRow(props: ButtonProps): JSX.Element {
	return renderButton(setupItemRow(props), props)
}
