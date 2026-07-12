export type TDragPluginEvents = {
	dragStart: (payload: { index: number; uid: number }) => void
	dragEnd: () => void
}
