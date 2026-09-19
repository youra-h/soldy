import { h, type Component } from 'vue'
import { Button, CheckBox, Icon, Label, RadioGroup, Switch, useIcon } from '@soldy/ui-vue'
import type { TScenario } from '@soldy/playground-shared'
import { PREVIEW_COMPONENTS, toComponents, type TPreview } from '../previews'

/**
 * Разметка сценариев, которой нет у превью: содержимое слотов под проверку.
 *
 * Сценарий ссылается на фикстуру ключом (`fixture`), а без ключа рисуется
 * превью своего компонента — тем же набором атрибутов: стартовые пропы
 * сценария, `ctrl` с экземпляром и слушатели журнала. Слоты — не свойство,
 * из метаданных их не достать, и разметка у каждого фреймворка своя: поэтому
 * фикстуры живут в адаптере, а сценарии, которые на них смотрят, — в общем
 * пакете.
 *
 * Фикстура без сценария и сценарий без фикстуры — ошибка: первую никто не
 * рисует, второй молча пропадает из меню (см. `__tests__/scenarios.spec.ts`).
 */
/** Глифы — компонентами `useIcon`, один раз: `tag` у Icon — корень, а не роль. */
const CHECK = useIcon('check')
const ARROW_RIGHT = useIcon('arrowRight')

export const FIXTURES: Record<string, TPreview> = {
	// Метки во всех трёх слотах: сценарий ищет их по `data-probe` и сверяет
	// порядок, а в `default` печатает то, что пришло в scope
	'button-slot-labels': (bind) =>
		h(Button, bind, {
			leading: () => h('span', { 'data-probe': 'leading' }, 'L'),
			default: ({ text }: { text: string }) => h('span', { 'data-probe': 'default' }, text),
			trailing: () => h('span', { 'data-probe': 'trailing' }, 'T'),
		}),

	// Иконки по краям — подпись длинная, из пропа `text` сценария
	'button-slot-icons': (bind) =>
		h(Button, bind, {
			leading: () => h(Icon, { tag: CHECK }),
			trailing: () => h(Icon, { tag: ARROW_RIGHT }),
		}),

	// Подпись вокруг контрола: текст — из пропа `text` сценария, контрол — в
	// слоте `default`
	'label-check-box': (bind) => h(Label, bind, () => h(CheckBox)),

	'label-switch': (bind) => h(Label, bind, () => h(Switch)),

	// Корень радио — `label`, а `label` в `label` HTML запрещает: внутри
	// подписи радио рисуется с `tag="span"`. Группа вокруг — ради общего `name`
	'label-radio': (bind) =>
		h(RadioGroup as Component, null, () =>
			h(Label, bind, () => h(RadioGroup.Item, { value: 'a', tag: 'span' })),
		),
}

const FIXTURE_COMPONENTS = toComponents(FIXTURES)

/** Чем рисовать сценарий в этом адаптере; `undefined` — нечем. */
export function fixtureOf(scenario: TScenario): Component | undefined {
	return scenario.fixture === undefined
		? PREVIEW_COMPONENTS[scenario.component]
		: FIXTURE_COMPONENTS[scenario.fixture]
}
