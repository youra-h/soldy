---
'@soldy-ui/setup': minor
---

`TInputPort.pick(props)` is removed: the Vue adapter no longer tracks every input with a watch. A custom adapter that watched `exchange.inputs.pick(props)` should call `exchange.inputs.full(props)` on its own update pass — unchanged inputs write nothing
