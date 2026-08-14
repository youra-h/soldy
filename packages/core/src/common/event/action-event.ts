export class TActionEvent {
	#defaultPrevented = false

	preventDefault(): void {
		this.#defaultPrevented = true
	}

	get defaultPrevented(): boolean {
		return this.#defaultPrevented
	}
}
