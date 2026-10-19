import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	Elevate,
	createRootProps,
	resolveSlot,
	roleIcon,
	rootTag,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { setupCheckBox } from './setup.component'
import type { CheckBoxAttributes, CheckBoxProps } from './base.component'

/** Отметки без слота — иконки по ролям, компонент на роль один на модуль (`roleIcon`). */
const CheckMark = roleIcon('check')
const IndeterminateMark = roleIcon('checkIndeterminate')

/**
 * CheckBox — флажок: корень по `tag` и нативный `<input type="checkbox">`
 * внутри, рядом — коробка с отметкой.
 *
 * Корень по умолчанию — `span`: флажок кладут в подпись `Label`, а внутри
 * `label` HTML разрешает только строчную разметку. Поэтому и всё внутри —
 * `span`.
 *
 * Наборы ядра стоят на разных элементах: `attrs` (`dir`) и `dataset`
 * (`data-disabled`, `data-invalid`) — на корне, `aria` — на `<input>`: тема
 * красит коробку и подпись поля формы `Field` по корню. Нативные `disabled` и `required` поля проводит разметка, и
 * ARIA-дублей рядом с ними ядро не пишет. Атрибуты потребителя делятся, как у
 * Vue: класс и стиль — корню, остальное — полю, поверх его `aria`.
 *
 * Отметку и «выбрано частично» скринридеру сообщают нативные `checked` и
 * `indeterminate` поля, `aria-checked` ядро не пишет. Оба Solid пишет
 * свойствами узла, на смену значения ядра; `indeterminate` — явно свойством
 * (`prop:`), атрибута у него нет. На сервере `checked` уходит атрибутом, а
 * «выбрано частично» поле покажет после гидратации. Переключает значение
 * плагин флажка по `change` поля.
 *
 * Коробка — декор: `aria-hidden` не пускает иконки слотов в доступное имя,
 * которое флажку даёт подпись. Отметка — слот `icon` у выбранного и
 * `indeterminate-icon` у частично выбранного (scope `{ value, indeterminate }`),
 * без слота — иконка из пакета по ролям `check` и `checkIndeterminate`. По
 * слоту разметка выбирает, что рисовать, поэтому слоты разворачивает адаптер,
 * один раз (`resolveSlot`). «Выбрано частично» рисуется поверх значения, как у
 * Vue: его снимает клик (`toggle` ядра), а не смена `value`.
 *
 * Отметка без слота — `<svg>` иконки по роли (`roleIcon`), а не компонент
 * `Icon`: она появляется и пропадает с каждой сменой отметки, и `Icon`
 * собирал бы на каждую свой контекст и плагины — в таблице «выбрать все»
 * собирала их тысячами. Размер и цвет отметке даёт тема флажка по
 * `so-check-box__mark`.
 *
 * Поле формы `Field` над флажком отдаёт ему ошибку, `id` и ссылки на части
 * (`TFieldControlExtension`), а своему содержимому флажок опускает пустую
 * связку. Поэтому содержимое — в слое лифта флажка (`Elevate`), и слоты
 * отметки разворачиваются там же: узлы слота Solid создаёт там, где его
 * развернули.
 */
export function CheckBox(props: CheckBoxProps): JSX.Element {
	const binding = setupCheckBox(props)
	const state = binding.state
	// Корню — его набор, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	const scope = () => ({ value: state.value, indeterminate: state.indeterminate ?? false })

	/** Содержимое корня — под слоем лифта флажка: зовёт его `Elevate`, внутри себя. */
	function content(): JSX.Element {
		const icon = resolveSlot(() => props.icon, scope)
		const indeterminateIcon = resolveSlot(() => props['indeterminate-icon'], scope)

		return (
			<>
				<input
					type="checkbox"
					id={state.id}
					name={state.name}
					disabled={state.disabled}
					required={state.required}
					{...state.aria}
					{...toControlAttrs<CheckBoxAttributes>(binding.forwardProps())}
					checked={state.value}
					prop:indeterminate={state.indeterminate}
				/>
				<span class="so-check-box__container" aria-hidden="true">
					<Show
						when={state.indeterminate}
						fallback={
							<Show when={state.value}>
								{icon() ?? <CheckMark class="so-check-box__mark" />}
							</Show>
						}
					>
						{indeterminateIcon() ?? <IndeterminateMark class="so-check-box__mark" />}
					</Show>
				</span>
			</>
		)
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>{content()}</Elevate>
			</Dynamic>
		</Show>
	)
}
