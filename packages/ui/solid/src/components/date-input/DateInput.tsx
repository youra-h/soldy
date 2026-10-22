import type { Accessor, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { TDateInputPart, TDateInputSegment } from '@soldy-ui/core'
import {
	Elevate,
	KeyedFor,
	createPartProps,
	createRootProps,
	resolveSlot,
	roleIcon,
	rootTag,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { Button } from '../button'
import { Icon } from '../icon'
import { setupDateInput } from './setup.component'
import type { DateInputProps } from './base.component'

/** Глиф кнопки очистки — компонент на роль: `tag` у Icon — корень, а не роль. */
const CloseGlyph = roleIcon('close')

/** Часть поля; у разделителя её нет. */
function partOf(segment: TDateInputSegment): TDateInputPart | undefined {
	return segment.type === 'literal' ? undefined : segment
}

/**
 * DateInput — поле даты из частей по формату локали: день, месяц и год, а у
 * поля даты и времени — ещё час, минута, с точностью до секунды секунда и, у
 * 12-часового цикла, период суток, в порядке и с разделителями
 * `Intl.DateTimeFormat#formatToParts`. Корень — коробка поля семьи Input:
 * рисуется по `tag` (по умолчанию `div`), на нём `id` поля и наборы `attrs`
 * (`dir` поля), `aria` (`role="group"`, имя — `aria_label` или
 * `aria_labelledBy`) и `dataset` (`data-disabled`, `data-invalid`), поверх —
 * атрибуты потребителя целиком, как у Vue: поля ввода, между которым их
 * делить, у даты нет. `ref` адаптера последним.
 *
 * Порядок узлов — как у Vue: слот `leading`, ряд частей, обёртка у конца поля,
 * скрытое поле формы.
 *
 * Ряд частей — флекс, а не строка текста: каждая часть и каждый разделитель —
 * своя коробка, иначе Chrome переносит начало протяжки мышью от левого края
 * части в соседний текст. Направление и язык ряда — набор `segmentsAttrs`.
 * Части и разделители — выход ядра `segments`, новый на каждую смену, поэтому
 * петля идёт по ключу записи (`KeyedFor`): ключ части — её тип, разделителя —
 * место в формате. При наборе и при смене локали часть меняет текст и место, а
 * её узел остаётся тем же — с фокусом на нём.
 *
 * Часть — `span` с наборами `attrs` (на сенсорном устройстве —
 * `contenteditable` и `inputmode`), `aria` (`role="spinbutton"`, имя,
 * `aria-value*`, остановка Tab, `id`) и `dataset` (`data-type`,
 * `data-placeholder`). Разделитель — литерал формата под `aria-hidden` (его
 * `aria`). Текст части и разделителя — свойство `textContent` узла, а не
 * ребёнок разметки: ребёнка Solid обновляет записью в данные его первого
 * текстового узла, а на касание часть редактируемая, и браузер (композиция,
 * клавиатура, которая правит и после погашенного Backspace) оставляет её
 * пустой или из нескольких узлов — запись упала бы на отсутствующий узел или
 * ушла мимо. `textContent` заменяет содержимое целиком, как текст элемента у
 * Vue, а сервер Solid печатает его содержимым узла. Текст ядра части после
 * правки браузера возвращает сенсорный плагин.
 *
 * Обёртка у конца поля — по кнопке очистки, своей кнопке в слоте `clear` или
 * слоту `trailing`. Кнопка очистки — та же, что у Input: первой, перед
 * `trailing`, по `clearable`, выключена вместе с полем, `readonly` её не гасит.
 * Имя ядро собирает с именем поля (`clearAria`), очищает команда поля `clear`
 * — все части, и скрытые форматом тоже. Очищает кнопка по `onActionClick` —
 * нативному клику её `TActionPlugin` — и гасит всплытие у самого события, как
 * `@click.stop` у Vue. Своя кнопка — слот `clear` с командой в scope.
 *
 * Обработчиков в разметке больше нет: клавиши, буфер обмена, выделение,
 * контекстное меню и касание ловят плагины на корне.
 *
 * Значение для формы — скрытое поле последним: `name`, `value` — дата строкой,
 * пока значение не собрано — пусто. Выключенное поле в форму не уходит.
 *
 * Поле формы `Field` над полем отдаёт ему ошибку и ссылки на части
 * (`TFieldControlExtension`), а своему содержимому поле опускает пустую
 * связку. Поэтому содержимое — в слое лифта поля (`Elevate`), и слоты
 * разворачиваются там же (`resolveSlot`): узлы слота Solid создаёт там, где
 * его развернули.
 */
export function DateInput(props: DateInputProps): JSX.Element {
	const binding = setupDateInput(props)
	const state = binding.state
	const ctrl = binding.ctrl
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	// Ряду частей — его набор: направление и язык
	const segmentsAttrs = createPartProps(() => state.segmentsAttrs)

	function clear(event: MouseEvent): void {
		event.stopPropagation()
		ctrl.clear()
	}

	/**
	 * Часть или разделитель. Тип у записи с одним ключом не меняется: ключ
	 * части — её тип, разделителя — место в формате, — и ветка `Show` у узла
	 * одна на всё его время.
	 */
	function segment(entry: Accessor<TDateInputSegment>): JSX.Element {
		const aria = createPartProps(() => entry().aria)

		return (
			<Show
				when={partOf(entry())}
				fallback={
					<span class="so-date-input__literal" {...aria()} textContent={entry().text} />
				}
			>
				{(part) => {
					const attrs = createPartProps(() => part().attrs)
					const dataset = createPartProps(() => part().dataset)

					return (
						<span
							class="so-date-input__segment"
							{...attrs()}
							{...aria()}
							{...dataset()}
							textContent={part().text}
						/>
					)
				}}
			</Show>
		)
	}

	/** Содержимое корня — под слоем лифта поля: зовёт его `Elevate`, внутри себя. */
	function content(): JSX.Element {
		const leadingSlot = resolveSlot(
			() => props.leading,
			() => ({ ctrl }),
		)
		const clearSlot = resolveSlot(
			() => props.clear,
			() => ({ clear: ctrl.clear }),
		)
		const trailingSlot = resolveSlot(
			() => props.trailing,
			() => ({ ctrl }),
		)

		return (
			<>
				<Show when={leadingSlot()}>
					<div class="so-date-input__leading">{leadingSlot()}</div>
				</Show>
				<span class="so-date-input__segments" {...segmentsAttrs()}>
					<KeyedFor each={state.segments} by={(entry) => entry.key}>
						{segment}
					</KeyedFor>
				</span>
				<Show
					when={
						state.clearable === true ||
						clearSlot() !== undefined ||
						trailingSlot() !== undefined
					}
				>
					<div class="so-date-input__trailing">
						<Show
							when={clearSlot()}
							fallback={
								<Show when={state.clearable}>
									<Button
										embedded="date-input.clear"
										type="button"
										class="so-date-input__clear"
										size={state.size}
										disabled={state.disabled}
										{...state.clearAria}
										onActionClick={clear}
									>
										<Icon
											embedded="date-input.clear-icon"
											tag={CloseGlyph}
											size={state.size}
										/>
									</Button>
								</Show>
							}
						>
							{clearSlot()}
						</Show>
						{trailingSlot()}
					</div>
				</Show>
				<input
					type="hidden"
					name={state.name}
					value={state.value ?? ''}
					disabled={state.disabled}
				/>
			</>
		)
	}

	return (
		<Show when={state.rendered}>
			<Dynamic id={state.id} {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>{content()}</Elevate>
			</Dynamic>
		</Show>
	)
}
