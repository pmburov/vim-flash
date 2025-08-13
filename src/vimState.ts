import * as vscode from "vscode"
import { Flash } from "./flash"


export class VimState {
  static statusBar: vscode.StatusBarItem
  static listenForInput: boolean
  static typeHandler: vscode.Disposable | null = null
  static select: boolean = false

  static init(context: vscode.ExtensionContext) {
    this.listenForInput = false

    this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10)
    context.subscriptions.push(this.statusBar)

    vscode.commands.executeCommand("setContext", "vim-flash.mode", "")

    const config = vscode.workspace.getConfiguration("vim-flash")
    Flash.init(config)
  }

  static regTypeHandler() {
    this.typeHandler = vscode.commands.registerCommand("type", (text) => {
      this.type(text.text)
    })
  }

  static go(flashMode: string) {
    vscode.commands.executeCommand("setContext", "vim-flash.mode", "input")
    this.regTypeHandler()

    this.listenForInput = true

    // if (config.get("showInputIndicator")) {
    this.statusBar.text = "Flash input"
    this.statusBar.show()
    // }
    Flash.flashMode = flashMode
    Flash.updateHighlights()
  }

  static stop() {
    this.listenForInput = false
    this.statusBar.text = ""
    this.statusBar.hide()
    if (this.typeHandler) {
      this.typeHandler.dispose()
      this.typeHandler = null
    }
    vscode.commands.executeCommand("setContext", "vim-flash.mode", "")
    Flash.stop()
  }

  static async type(text: string) {
    if (this.listenForInput) {
      Flash.handleInput(text)
    } else {
      vscode.commands.executeCommand("default:type", { text: text })
    }
  }
}
