import * as vscode from "vscode"
import { VimState } from "./vimState"
import { Flash, flashModes } from "./flash"

export function activate(context: vscode.ExtensionContext) {
  VimState.init(context)

  const d1 = vscode.commands.registerCommand("vim-flash.go", () => {
    VimState.go(flashModes.active)
  })
  context.subscriptions.push(d1)

  const up = vscode.commands.registerCommand("vim-flash.up", () => {
    VimState.stop()
    Flash.flashMode = flashModes.lineUp
    VimState.go(flashModes.lineUp)
  })
  context.subscriptions.push(up)

  const down = vscode.commands.registerCommand("vim-flash.down", () => {
    VimState.stop()
    Flash.flashMode = flashModes.lineDown
    VimState.go(flashModes.lineDown)
  })
  context.subscriptions.push(down)

  const d2 = vscode.commands.registerCommand("vim-flash.backspace", () => {
    Flash.backspace()
  })
  context.subscriptions.push(d2)

  const d3 = vscode.commands.registerCommand("vim-flash.stop", () => {
    VimState.stop()
  })
  context.subscriptions.push(d3)

  const d4 = vscode.commands.registerCommand("vim-flash.select", () => {
    VimState.select = true
    VimState.go(flashModes.active)
  })
  context.subscriptions.push(d4)

  const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('vim-flash')) {
      const config = vscode.workspace.getConfiguration("vim-flash")
      Flash.updateStateConfig(config);
      Flash.updateHighlights();
    }
  })
  context.subscriptions.push(configChangeListener)

  // Listen to editor scroll/visible range changes to update highlights in real-time
  const visualChangeListener = vscode.window.onDidChangeTextEditorVisibleRanges(() => {
    if (VimState.listenForInput) {
      // Recompute highlights (this will use the same searchQuery)
      Flash.updateHighlights();
    }
  })
  context.subscriptions.push(visualChangeListener)

  return {
    VimState,
  }
}

export { VimState }

export function deactivate() { }
