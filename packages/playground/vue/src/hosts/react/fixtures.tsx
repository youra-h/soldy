import { Button, CheckBox, Icon, Label, RadioGroup, Switch, roleIcon } from '@soldy-ui/react'
import type { TPreview } from './previews'

/**
 * Разметка сценариев, которой нет у превью: содержимое слотов под проверку —
 * в React.
 *
 * Ключи и разметка — те же, что у хоста Vue (`hosts/vue/fixtures.ts`):
 * сценарии в общем пакете ищут в сцене одно и то же, на каком бы фреймворке её
 * ни нарисовали. Слот по умолчанию в React — `children`, остальные слоты —
 * пропы с теми же именами.
 */

/** Глифы — компонентом на роль, один раз: `tag` у Icon — корень, а не роль. */
const CHECK = roleIcon('check')
const ARROW_RIGHT = roleIcon('arrowRight')

export const FIXTURES: Record<string, TPreview> = {
	// Метки во всех трёх слотах: сценарий ищет их по `data-probe` и сверяет
	// порядок, а в `default` печатает то, что пришло в scope
	'button-slot-labels': (bind) => (
		<Button
			{...bind}
			leading={<span data-probe="leading">L</span>}
			trailing={<span data-probe="trailing">T</span>}
		>
			{({ text }) => <span data-probe="default">{text}</span>}
		</Button>
	),

	// Иконки по краям — подпись длинная, из пропа `text` сценария
	'button-slot-icons': (bind) => (
		<Button {...bind} leading={<Icon tag={CHECK} />} trailing={<Icon tag={ARROW_RIGHT} />} />
	),

	// Подпись вокруг контрола: текст — из пропа `text` сценария, контрол — в
	// слоте по умолчанию
	'label-check-box': (bind) => (
		<Label {...bind}>
			<CheckBox />
		</Label>
	),

	'label-switch': (bind) => (
		<Label {...bind}>
			<Switch />
		</Label>
	),

	// Корень радио — `label`, а `label` в `label` HTML запрещает: внутри
	// подписи радио рисуется с `tag="span"`. Группа вокруг — ради общего `name`
	'label-radio': (bind) => (
		<RadioGroup>
			<Label {...bind}>
				<RadioGroup.Item value="a" tag="span" />
			</Label>
		</RadioGroup>
	),
}
