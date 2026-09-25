/**
 * TInputPort — фреймворк → ядро: ячейка на каждый записываемый проп.
 *
 * Ячейка хранит последнее значение, которое задал фреймворк, и начинается с
 * пропсов сборки. Отсюда правила входов получаются по построению, без флагов
 * «задан / не задан»:
 *
 * - полный набор пришёл повторно — ячейки не сменились, в ядро ничего не
 *   пишется. Иначе повтор откатил бы то, что с тех пор поменяли ядро или код
 *   через инстанс: список, открытый кликом при `open={false}`, закрылся бы от
 *   смены плейсхолдера;
 * - составное значение с тем же содержимым — тоже повтор. Литерал массива в
 *   разметке (`value={['a', 'b']}`) на каждом проходе родителя — новый
 *   объект, поэтому ячейка сверяет по содержимому (`sameValue`), тем же
 *   правилом, что и состояние: по ссылке перерисовка родителя откатывала бы
 *   выбор пользователя к разметке. Повтор гасится только здесь — линия
 *   пишет всё, что до неё дошло, а сверку со своим значением делает сеттер;
 * - проп ни разу не задавали — ячейка была `undefined` и осталась, слива нет;
 * - задавали и сняли — ячейка сменилась на `undefined`, линия сбрасывает к умолчанию;
 * - после сброса ячейка снова `undefined` — повторное снятие ничего не пишет.
 *
 * Три способа доставки различаются только тем, что считать изменением: в
 * полном наборе и у одиночного пропа — смену значения (`offer`), в дельте —
 * само наличие ключа (`push`). Что делать с изменением, решает линия.
 */

import { TCell } from './cell.class'
import type { TLine } from './line.class'
import { sameValue } from './value'

/** Значение по имени во фреймворке (`aria_label`), затем по сырому (`label`) — для headless-кода и тестов. */
function pick(props: object, line: TLine): unknown {
	return Reflect.get(props, line.name) ?? Reflect.get(props, line.spec.name.name)
}

function has(props: object, line: TLine): boolean {
	return line.name in props || line.spec.name.name in props
}

export class TInput {
	private readonly _cell: TCell<unknown>

	constructor(
		readonly line: TLine,
		given: unknown,
	) {
		this._cell = new TCell<unknown>(given, sameValue)
		this._cell.listen((value) => line.accept(value))
	}

	/** Имя пропа во фреймворке. */
	get name(): string {
		return this.line.name
	}

	/** Значение пропа в пропсах фреймворка — для фреймворка, который следит за каждым пропом отдельно (Vue). */
	pick(props: object): unknown {
		return pick(props, this.line)
	}

	/** Значение из полного набора или одиночного пропа: в ядро уходит, только если фреймворк его сменил. */
	offer(value: unknown): void {
		this._cell.set(value)
	}

	/**
	 * Значение из дельты: наличие ключа — уже изменение. `el.open = false` у Web
	 * Components — команда, а не повтор рендера: она обязана дойти до ядра, даже
	 * если фреймворк давал `false` и раньше. Снятие ни разу не заданного пропа
	 * командой не является.
	 */
	push(value: unknown): void {
		if (!this._cell.set(value) && value !== undefined) this.line.accept(value)
	}

	/** Начальное значение владельцу — то, с которого началась память входа. */
	seed(): void {
		this.line.seed(this._cell.value)
	}
}

export class TInputPort {
	private readonly _entries: readonly TInput[]

	/** Память входов начинается с пропсов сборки. */
	constructor(lines: readonly TLine[], buildProps: object) {
		this._entries = lines
			.filter((line) => line.writable)
			.map((line) => new TInput(line, pick(buildProps, line)))
	}

	/** Входы по одному — для фреймворка, который следит за каждым пропом отдельно (Vue): `for (const input of link.inputs)`. */
	[Symbol.iterator](): Iterator<TInput> {
		return this._entries[Symbol.iterator]()
	}

	/** Полный набор на каждом проходе: React, Solid, Svelte. */
	full(props: object): void {
		for (const input of this._entries) input.offer(input.pick(props))
	}

	/** Дельта: Angular, Web Components. Чего в дельте нет, то не менялось. */
	delta(changes: object): void {
		for (const input of this._entries) {
			if (has(changes, input.line)) input.push(input.pick(changes))
		}
	}

	/** Начальные значения владельцу `owner`. Кому они нужны, решает сборка. */
	seed(owner: object): void {
		for (const input of this._entries) {
			if (input.line.owner === owner) input.seed()
		}
	}
}
