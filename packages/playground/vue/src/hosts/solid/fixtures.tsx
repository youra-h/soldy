import { Button, Icon, roleIcon } from '@soldy-ui/solid'
import type { TPreview } from './previews'

/**
 * Разметка сценариев, которой нет у превью: содержимое слотов под проверку —
 * в Solid.
 *
 * Ключи и разметка — те же, что у хостов Vue, React и Svelte: сценарии в общем
 * пакете ищут в сцене одно и то же, на каком бы фреймворке её ни нарисовали.
 * Слот по умолчанию в Solid — `children`, остальные слоты — пропы с теми же
 * именами. Пропсы — вызовом сигнала (`{...bind()}`), как у превью. Подписи
 * нет: Label в Solid ещё не перенесён, и её сценарии стенд не показывает.
 */

/** Глифы — компонентом на роль, один раз: `tag` у Icon — корень, а не роль. */
const CHECK = roleIcon('check')
const ARROW_RIGHT = roleIcon('arrowRight')

export const FIXTURES: Record<string, TPreview> = {
	// Метки во всех трёх слотах: сценарий ищет их по `data-probe` и сверяет
	// порядок, а в `default` печатает то, что пришло в scope
	'button-slot-labels': (bind) => (
		<Button
			{...bind()}
			leading={<span data-probe="leading">L</span>}
			trailing={<span data-probe="trailing">T</span>}
		>
			{(scope: { text: string }) => <span data-probe="default">{scope.text}</span>}
		</Button>
	),

	// Иконки по краям — подпись длинная, из пропа `text` сценария
	'button-slot-icons': (bind) => (
		<Button {...bind()} leading={<Icon tag={CHECK} />} trailing={<Icon tag={ARROW_RIGHT} />} />
	),
}
