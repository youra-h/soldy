import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import {
	Elevate,
	createPartProps,
	createRootProps,
	liveScope,
	renderSlot,
	rootTag,
	toControlAttrs,
	toRootForward,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupSwitch } from './setup.component'
import type { SwitchAttributes, SwitchProps } from './base.component'

/**
 * Switch — переключатель: корень по `tag` и нативный
 * `<input type="checkbox">` внутри, рядом — дорожка с ручкой.
 *
 * Корень по умолчанию — `span`: переключатель кладут в подпись `Label`, а
 * внутри `label` HTML разрешает только строчную разметку. Поэтому и всё
 * внутри — `span`. На корне — `attrs` и `dataset` (`data-disabled`,
 * `data-invalid`): тема красит дорожку и подпись поля формы `Field` по корню,
 * а `aria` — у вложенного `<input>`.
 *
 * `role="switch"` ядро пишет в `aria` поля, состояние скринридеру сообщает
 * нативный `checked` — Solid пишет его свойством узла, а на сервере —
 * атрибутом; переключает значение плагин по `change` поля. Атрибуты
 * потребителя делятся, как у CheckBox: класс и стиль — корню, остальное —
 * полю.
 *
 * Дорожка — декор: `aria-hidden` не пускает содержимое слотов в доступное
 * имя, которое переключателю даёт подпись. В ручке — слот `on` у включённого
 * и `off` у выключенного, scope `{ value, ctrl }` — живой (`liveScope`), как у
 * всех слотов со scope. Запасного содержимого у них нет, и каждый слот
 * читается один раз — когда ручка его показывает.
 *
 * Поле формы `Field` над переключателем отдаёт ему ошибку, `id` и ссылки на
 * части (`TFieldControlExtension`), а своему содержимому переключатель
 * опускает пустую связку. Поэтому содержимое — в слое лифта переключателя
 * (`Elevate`): слоты ручки читаются внутри него.
 */
export function Switch(props: SwitchProps): JSX.Element {
	const binding = setupSwitch(props)
	const state = binding.state
	const ctrl = binding.ctrl
	// Корню — его набор, класс и стиль потребителя; `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: toRootForward(binding.forwardProps()),
	}))
	// Полю — его `aria`, поверх — остальные атрибуты потребителя
	const aria = createPartProps(() => state.aria)
	const control = createPartProps(() => toControlAttrs<SwitchAttributes>(binding.forwardProps()))
	const scope = liveScope(() => ({ value: state.value, ctrl }))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<input
						type="checkbox"
						id={state.id}
						name={state.name}
						disabled={state.disabled}
						required={state.required}
						{...aria()}
						{...control()}
						checked={state.value}
					/>
					<span class="so-switch__track" aria-hidden="true">
						<span class="so-switch__track--thumb">
							<Show when={state.value} fallback={renderSlot(props.off, scope)}>
								{renderSlot(props.on, scope)}
							</Show>
						</span>
					</span>
				</Elevate>
			</Dynamic>
		</Show>
	)
}
