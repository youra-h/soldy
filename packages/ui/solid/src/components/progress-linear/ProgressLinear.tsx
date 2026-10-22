import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, rootTag } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupProgressLinear } from './setup.component'
import type { ProgressLinearProps } from './base.component'

/**
 * ProgressLinear — индикатор выполнения линией. Корень и есть дорожка во всю
 * длину, в нём заливка доли готового. Корень рисуется по `tag`, по умолчанию
 * `span`: полосу кладут в `Button` и `Label`, а внутри них HTML разрешает
 * только строчную разметку. Поэтому и заливка — `span`.
 *
 * Разметка статическая: размер, вариант и ось (`--size-*`, `--variant-*`,
 * `--horizontal` или `--vertical`), доля (переменная
 * `--so-progress-linear-percent` из выхода `percentStyle`), бег
 * (`data-indeterminate`), роль, значения и имя для скринридера и `dir`
 * приходят кодом, здесь только состав и имена классов. Долю раскладка корня
 * кладёт под стилем потребителя (`createRootProps`), как во Vue, где атрибуты
 * снаружи ложатся на корень последними, а скрытый корень прячет
 * `display: none` поверх обоих.
 *
 * Текста и слотов нет: содержимое узла с ролью `progressbar` скринридер не
 * читает, а в тонкую полосу текст не влезет. Подпись и число потребитель
 * ставит рядом своей разметкой.
 */
export function ProgressLinear(props: ProgressLinearProps): JSX.Element {
	const binding = setupProgressLinear(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним; доля —
	// стиль-выходом компонента
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
		style: state.percentStyle,
	}))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				{/*
					Заливка — доля готового от начала строки, в RTL — справа, у
					вертикальной полосы — снизу. Длина — из переменной на корне. Пока
					полоса бежит, заливку тема прячет, а бег рисует псевдоэлементом
					корня: своего узла у бегущего отрезка нет.
				*/}
				<span class="so-progress-linear__range" />
			</Dynamic>
		</Show>
	)
}
