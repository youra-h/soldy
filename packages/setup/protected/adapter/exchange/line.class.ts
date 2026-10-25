/**
 * TLine — линия: одно свойство одного участника в составе компонента.
 *
 * Описание (`TPropSpec`) + место участника в составе + имя во фреймворке.
 * Это знание типа, а не монтирования: линии строит таблица маршрутов
 * (`TRouting`) один раз на поверхность и состав, а владельцев участников
 * монтирование отдаёт каждому вызову списком (`owners`, по порядку состава).
 * Объекта на свойство у монтирования нет: раньше линия держала своего
 * владельца, и у строки таблицы с чекбоксом их было около пятидесяти.
 *
 * Линия — единственный объект, который знает про свойство всё сразу, поэтому
 * каждое правило записи живёт здесь один раз — и для сборки, и для обмена, и
 * для плагинов, поставленных снаружи:
 *
 * - `write`  — `protected` не пишется. То же ли это значение, решает сеттер
 *   владельца — сверкой со своим записанным значением. Геттер для этого не
 *   годится: у свойства с резольвером он отдаёт итог (`disabled` элемента —
 *   своё или владельца, прижатое `value` Slider), и значение, равное итогу, но
 *   не своему, сверка с геттером теряла бы. Повтор от фреймворка сюда не
 *   доходит: его гасит память входов (`TInputPort`);
 * - `reset`  — к умолчанию описания; ключа умолчания нет — значение остаётся;
 * - `accept` — что пришло от фреймворка: `undefined` значит «сняли»;
 * - `seed`   — начальное значение: `undefined` и равное умолчанию ничего не
 *   задают. Так внешний `ctrl` сохраняет своё состояние, даже когда фреймворк
 *   подставил умолчание за автора (Vue делает это с каждым пропом, у которого
 *   объявлен `default`).
 *
 * Памяти у линии нет: «что задал фреймворк» помнит память входов
 * (`TInputPort`), «что отдано фреймворку» — состояние (`TStateStore`).
 * Подписок тоже нет: за триггерами свойства следит слушатель участников
 * (`TTap`) по таблице маршрутов типа.
 */

import type { TPropSpec } from '../../define'
import { sameValue } from './value'

export class TLine {
	constructor(
		readonly spec: TPropSpec,
		/** Место участника в составе: владелец свойства — `owners[member]`. */
		readonly member: number,
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

	read(owners: readonly object[]): unknown {
		return this.spec.read(owners[this.member])
	}

	write(owners: readonly object[], value: unknown): void {
		if (this.writable) this.spec.assign(owners[this.member], value)
	}

	reset(owners: readonly object[]): void {
		if (this.spec.hasDefault) this.write(owners, this.spec.default)
	}

	accept(owners: readonly object[], value: unknown): void {
		if (value === undefined) this.reset(owners)
		else this.write(owners, value)
	}

	seed(owners: readonly object[], value: unknown): void {
		if (value === undefined) return
		if (this.spec.hasDefault && sameValue(value, this.spec.default)) return

		this.write(owners, value)
	}
}
