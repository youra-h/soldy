import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, rootTag } from '../../adapter'
import { setupProgressSpinner } from './setup.component'
import type { ProgressSpinnerProps } from './base.component'

/**
 * ProgressSpinner — индикатор выполнения кольцом. Корень — коробка кольца, в
 * ней рисунок. Корень рисуется по `tag`, по умолчанию `span`: кольцо кладут в
 * `Button` и `Label`, а внутри них HTML разрешает только строчную разметку.
 *
 * Разметка статическая: размер и вариант (`--size-*`, `--variant-*`), доля
 * (переменная `--s-progress-spinner-fraction` из выхода `fractionStyle`), бег
 * (`data-indeterminate`), роль, значения и имя для скринридера и `dir`
 * приходят кодом, здесь только состав, имена классов и геометрия рисунка.
 * Долю раскладка корня кладёт под стилем потребителя (`createRootProps`), как
 * во Vue, где атрибуты снаружи ложатся на корень последними, а скрытый корень
 * прячет `display: none` поверх обоих.
 *
 * Текста и слотов нет, как у линии: содержимое узла с ролью `progressbar`
 * скринридер не читает, а в кольцо размером с иконку число не влезет. Подпись
 * и число потребитель ставит рядом своей разметкой.
 */
export function ProgressSpinner(props: ProgressSpinnerProps): JSX.Element {
	const binding = setupProgressSpinner(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним; доля —
	// стиль-выходом компонента
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
		style: state.fractionStyle,
	}))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				{/*
					Рисунок — декор под `aria-hidden`, как коробка CheckBox: о ходе
					работы говорит роль корня. Три окружности одной геометрии — центр в
					середине поля 16 × 16, радиус 7: при толщине темы 2 кольцо ровно
					касается краёв поля. Вид — у темы: толщина, цвета, начало дуг сверху
					и бег.

					Длину дуг SVG меряет в долях окружности (`pathLength="1"`): доля
					готового из переменной корня ложится в штрих как есть.
				*/}
				<svg class="so-progress-spinner__ring" viewBox="0 0 16 16" aria-hidden="true">
					{/* Дорожка — полное кольцо под дугами */}
					<circle class="so-progress-spinner__track" cx="8" cy="8" r="7" />
					{/*
						Дуга доли — от начала кольца на долю готового. Пока кольцо
						бежит, тема её прячет, и дуга, вернувшаяся после бега, растёт
						от нуля.
					*/}
					<circle class="so-progress-spinner__range" cx="8" cy="8" r="7" pathLength="1" />
					{/*
						Бегущая дуга — видна, только пока кольцо бежит. Своего движения
						у неё нет: бег — поворот всего рисунка.
					*/}
					<circle
						class="so-progress-spinner__runner"
						cx="8"
						cy="8"
						r="7"
						pathLength="1"
					/>
				</svg>
			</Dynamic>
		</Show>
	)
}
