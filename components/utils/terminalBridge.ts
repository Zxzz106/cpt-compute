type Writer = (text: string) => void;
type ClearFn = () => void;
type InputHandler = (data: string) => void;

let writer: Writer | null = null;
let clearFn: ClearFn | null = null;
let inputHandler: InputHandler | null = null;

export function setTerminalWriter(w: Writer, c?: ClearFn) {
  writer = w;
  clearFn = c || null;
}

export function setTerminalInputHandler(h: InputHandler | null) {
  inputHandler = h;
}

export function clearTerminal() {
  try { clearFn?.(); } catch (e) {}
}

export function writeTerminal(text: string) {
  try { writer?.(text); } catch (e) {}
}

export function writelnTerminal(text: string) {
  writeTerminal(text + '\r\n');
}

export function removeTerminalWriter() {
  writer = null;
  clearFn = null;
  inputHandler = null;
}

export function callInputHandler(data: string) {
  try { inputHandler?.(data); } catch (e) {}
}
