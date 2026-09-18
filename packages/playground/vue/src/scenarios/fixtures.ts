import type { Component } from 'vue'
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
export const FIXTURES: Record<string, TPreview> = {}

const FIXTURE_COMPONENTS = toComponents(FIXTURES)

/** Чем рисовать сценарий в этом адаптере; `undefined` — нечем. */
export function fixtureOf(scenario: TScenario): Component | undefined {
	return scenario.fixture === undefined
		? PREVIEW_COMPONENTS[scenario.component]
		: FIXTURE_COMPONENTS[scenario.fixture]
}
