import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	Elevate,
	createPartProps,
	createRootProps,
	renderSlot,
	resolveSlot,
	roleIcon,
	rootTag,
} from '../../adapter'
import { Icon } from '../icon'
import { setupField } from './setup.component'
import type { FieldProps } from './base.component'

/** Значок ошибки — компонент на роль: `tag` у Icon — корень, а не роль. */
const ErrorGlyph = roleIcon('error')

/**
 * Field — поле формы: подпись, контрол, подсказка и ошибка, связанные с
 * контролом сами. Корень рисуется по `tag`, по умолчанию `div`. На корне —
 * модификаторы `so-field--position-*` (`top`, `start`, `end`) и
 * `so-field--size-*`. Своих состояний у Field нет: выключенность, только
 * чтение и обязательность тема читает с корня контрола, ошибку контрол рисует
 * по своему `data-invalid` — его пишет связка поля с контролом.
 *
 * Порядок частей один на все стороны — подпись, контрол, подсказка, ошибка:
 * сторону рисует тема. Часть стоит, пока задан её текст: ссылки контрола на
 * части ставит ядро, а слотов оно не видит. Ошибка рисуется при `invalid` и
 * встаёт на место подсказки. Что рисовать, решает ядро (`helperRendered`,
 * `errorRendered`).
 *
 * - подпись — проп `label`, своя разметка — слот `label-content`. Связку с
 *   контролом — `id` и `for` — несёт набор `labelAria`: `for` на поле у
 *   контролов с `<input>`, а группу (RadioGroup) называет ссылка
 *   `aria-labelledby` на `id`;
 * - контрол — `children` (слот `default`): Input, CheckBox, Switch, RadioGroup
 *   или Label с контролом;
 * - подсказка — проп `helper`, своя разметка — слот `helper-content`, её `id`
 *   (набор `helperAria`) — в `aria-describedby` контрола;
 * - ошибка — проп `error`, своя разметка — слот `error-content`, её `id`
 *   (набор `errorAria`) — в `aria-describedby` вместо подсказки. Значок — роль
 *   `error`, декор: смысл несёт текст. Размера у значка нет — его ставит тема.
 *
 * Слот части выбирает между своей разметкой и текстом, поэтому его
 * разворачивает адаптер, один раз (`resolveSlot`).
 *
 * Всё содержимое — в слое лифта поля (`Elevate`), и разворачивается оно там
 * же: узлы слота Solid создаёт там, где его развернули, и контрол, собранный
 * в теле поля, связки этого поля не увидел бы.
 */
export function Field(props: FieldProps): JSX.Element {
	const binding = setupField(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	// Наборы частей: подпись напечатана раньше, чем контрол вошёл в поле, и её
	// `for`, сменившийся за гидратацию, помощник допишет в узел после неё
	const labelAria = createPartProps(() => state.labelAria)
	const helperAria = createPartProps(() => state.helperAria)
	const errorAria = createPartProps(() => state.errorAria)

	/** Части поля — под слоем его лифта: зовёт их `Elevate`, внутри себя. */
	function parts(): JSX.Element {
		const label = resolveSlot(
			() => props['label-content'],
			() => ({}),
		)
		const helper = resolveSlot(
			() => props['helper-content'],
			() => ({}),
		)
		const error = resolveSlot(
			() => props['error-content'],
			() => ({}),
		)

		return (
			<>
				<Show when={state.label}>
					<label class="so-field__label" {...labelAria()}>
						{label() ?? state.label}
					</label>
				</Show>
				<div class="so-field__control">{renderSlot(props.children)}</div>
				<Show when={state.helperRendered}>
					<div class="so-field__helper" {...helperAria()}>
						{helper() ?? state.helper}
					</div>
				</Show>
				<Show when={state.errorRendered}>
					<div class="so-field__error" {...errorAria()}>
						<Icon
							embedded="field.error-icon"
							class="so-field__error-icon"
							tag={ErrorGlyph}
						/>
						<div class="so-field__error-text">{error() ?? state.error}</div>
					</div>
				</Show>
			</>
		)
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>{parts()}</Elevate>
			</Dynamic>
		</Show>
	)
}
