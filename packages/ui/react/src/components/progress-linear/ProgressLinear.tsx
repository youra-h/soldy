import type { ElementType, ReactElement } from 'react'
import { toRootProps } from '../../adapter'
import { useSetupProgressLinear } from './setup.component'
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
 * кладёт под стилем потребителя (`toRootProps`), как во Vue, где атрибуты
 * снаружи ложатся на корень последними, а скрытый корень прячет
 * `display: none` поверх обоих.
 *
 * Текста и слотов нет: содержимое узла с ролью `progressbar` скринридер не
 * читает, а в тонкую полосу текст не влезет. Подпись и число потребитель
 * ставит рядом своей разметкой.
 */
export function ProgressLinear(props: ProgressLinearProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupProgressLinear(props)

	const { rendered, tag, aria, dataset, attrs, percentStyle } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним; доля —
	// стиль-выходом компонента (`toRootProps`)
	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps, percentStyle)}>
			{/*
				Заливка — доля готового от начала строки, в RTL — справа, у
				вертикальной полосы — снизу. Длина — из переменной на корне. Пока
				полоса бежит, заливку тема прячет, а бег рисует псевдоэлементом
				корня: своего узла у бегущего отрезка нет.
			*/}
			<span className="so-progress-linear__range" />
		</Tag>
	)
}
