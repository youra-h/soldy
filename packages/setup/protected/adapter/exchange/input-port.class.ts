/**
 * TInputPort — фреймворк → ядро: память последнего значения каждого записываемого пропа.
 *
 * Память хранит последнее значение, которое задал фреймворк, и начинается с
 * пропсов сборки. Отсюда правила входов получаются по построению, без флагов
 * «задан / не задан»:
 *
 * - полный набор пришёл повторно — значения не сменились, в ядро ничего не
 *   пишется. Иначе повтор откатил бы то, что с тех пор поменяли ядро или код
 *   через инстанс: список, открытый кликом при `open={false}`, закрылся бы от
 *   смены плейсхолдера;
 * - составное значение с тем же содержимым — тоже повтор. Литерал массива в
 *   разметке (`value={['a', 'b']}`) на каждом проходе родителя — новый
 *   объект, поэтому память сверяет по содержимому (`sameValue`), тем же
 *   правилом, что и состояние: по ссылке перерисовка родителя откатывала бы
 *   выбор пользователя к разметке. Повтор гасится только здесь — линия
 *   пишет всё, что до неё дошло, а сверку со своим значением делает сеттер;
 * - проп ни разу не задавали — значение было `undefined` и осталось, слива нет;
 * - задавали и сняли — значение сменилось на `undefined`, линия сбрасывает к умолчанию;
 * - после сброса значение снова `undefined` — повторное снятие ничего не пишет.
 *
 * Значения лежат одним списком по линиям (значение `i` — линии `i`), а не
 * объектом на проп: у входа нет ни подписчиков, ни своего поведения, и объект
 * на проп был бы только обёрткой над значением.
 *
 * Два способа доставки различаются только тем, что считать изменением: в
 * полном наборе — смену значения (`full`), в дельте — само наличие ключа
 * (`delta`). Что делать с изменением, решает линия.
 */

import type { TLine } from './line.class'
import type { TMember } from './member.class'
import { TRouting } from './routing.class'
import type { TSurface } from '../surface'
import { sameValue } from './value'

/** Значение по имени во фреймворке (`aria_label`), затем по сырому (`label`) — для headless-кода и тестов. */
function pick(props: object, line: TLine): unknown {
	return Reflect.get(props, line.name) ?? Reflect.get(props, line.spec.name.name)
}

function has(props: object, line: TLine): boolean {
	return line.name in props || line.spec.name.name in props
}

export class TInputPort {
	/** Последнее, что задал фреймворк, по линиям. */
	private readonly _given: unknown[]

	/**
	 * Начальные значения — записываемым линиям участников из пропсов сборки, тем
	 * же чтением, с которого начинается память входов. Кому из участников
	 * писать, решает сборка. Память нужна обмену, а не начальной записи,
	 * поэтому порт для неё не заводится.
	 */
	static seed(members: readonly TMember[], surface: TSurface, buildProps: object): void {
		const owners = members.map((member) => member.owner)

		for (const line of TRouting.of(surface, members).writable) {
			line.seed(owners, pick(buildProps, line))
		}
	}

	/**
	 * Память входов начинается с пропсов сборки.
	 *
	 * @param _lines записываемые линии обмена — по значению на каждую
	 * @param _owners владельцы участников монтирования — по порядку состава
	 */
	constructor(
		private readonly _lines: readonly TLine[],
		private readonly _owners: readonly object[],
		buildProps: object,
	) {
		this._given = _lines.map((line) => pick(buildProps, line))
	}

	/**
	 * Значения входов в пропсах фреймворка — для фреймворка, который следит за
	 * чтением пропсов (Vue): читает каждый, а сменилось ли что, решает `full`.
	 */
	pick(props: object): unknown[] {
		return this._lines.map((line) => pick(props, line))
	}

	/** Полный набор на каждом проходе: React, Solid, Svelte, Vue. В ядро уходит только то, что фреймворк сменил. */
	full(props: object): void {
		for (let index = 0; index < this._lines.length; index++) {
			const line = this._lines[index]
			const value = pick(props, line)

			if (this._take(index, value)) line.accept(this._owners, value)
		}
	}

	/**
	 * Дельта: Angular, Web Components. Чего в дельте нет, то не менялось, а
	 * наличие ключа — уже изменение: `el.open = false` у Web Components —
	 * команда, а не повтор рендера, и она обязана дойти до ядра, даже если
	 * фреймворк давал `false` и раньше. Снятие ни разу не заданного пропа
	 * командой не является.
	 */
	delta(changes: object): void {
		for (let index = 0; index < this._lines.length; index++) {
			const line = this._lines[index]

			if (!has(changes, line)) continue

			const value = pick(changes, line)

			if (this._take(index, value) || value !== undefined) line.accept(this._owners, value)
		}
	}

	/** Запомнить значение входа: ответ — сменилось ли оно. */
	private _take(index: number, value: unknown): boolean {
		if (sameValue(this._given[index], value)) return false

		this._given[index] = value

		return true
	}
}
