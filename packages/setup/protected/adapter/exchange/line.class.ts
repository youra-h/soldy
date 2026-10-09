/**
 * TLine — линия: одно свойство одного владельца на время монтирования.
 *
 * Описание (`TPropSpec`) + владелец (инстанс, плагин или связка) + имя во
 * фреймворке. Это единственный объект, который знает про свойство всё сразу,
 * поэтому каждое правило записи живёт здесь один раз — и для сборки, и для
 * обмена, и для плагинов, поставленных снаружи:
 *
 * - `write`  — `protected` не пишется. То же ли это значение, решает сеттер
 *   владельца — сверкой со своим записанным значением. Геттер для этого не
 *   годится: у свойства с резольвером он отдаёт итог (`disabled` элемента —
 *   своё или владельца, прижатое `value` Slider), и значение, равное итогу, но
 *   не своему, сверка с геттером теряла бы. Повтор от фреймворка сюда не
 *   доходит: его гасит ячейка входа (`TInputPort`);
 * - `reset`  — к умолчанию описания; ключа умолчания нет — значение остаётся;
 * - `accept` — что пришло от фреймворка: `undefined` значит «сняли»;
 * - `seed`   — начальное значение: `undefined` и равное умолчанию ничего не
 *   задают. Так внешний `ctrl` сохраняет своё состояние, даже когда фреймворк
 *   подставил умолчание за автора (Vue делает это с каждым пропом, у которого
 *   объявлен `default`).
 *
 * Памяти у линии нет: «что задал фреймворк» помнит ячейка входа (`TInputPort`),
 * «что отдано фреймворку» — ячейка выхода (`TStateStore`). Подписок тоже нет:
 * за триггерами свойства следит слушатель участника (`TTap`) по таблице
 * маршрутов типа (`TRouting`), а линии строит она же — одним правилом для
 * обмена и для начальных значений сборки.
 */

import type { TPropSpec } from '../../define'
import { sameValue } from './value'

export class TLine {
	constructor(
		readonly spec: TPropSpec,
		readonly owner: object,
		/** Имя во фреймворке: `text`, `aria_label`. */
		readonly name: string,
	) {}

	/** Есть триггеры — за свойством можно следить, оно входит в состояние. Без них проп сквозной. */
	get readable(): boolean {
		return this.spec.triggers.length > 0
	}

	get writable(): boolean {
		return !this.spec.protected
	}

	read(): unknown {
		return this.spec.read(this.owner)
	}

	write(value: unknown): void {
		if (this.writable) this.spec.assign(this.owner, value)
	}

	reset(): void {
		if (this.spec.hasDefault) this.write(this.spec.default)
	}

	accept(value: unknown): void {
		if (value === undefined) this.reset()
		else this.write(value)
	}

	seed(value: unknown): void {
		if (value === undefined) return
		if (this.spec.hasDefault && sameValue(value, this.spec.default)) return

		this.write(value)
	}
}
