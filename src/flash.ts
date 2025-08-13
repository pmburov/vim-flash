import * as vscode from "vscode"
import { FlashConfig, getConfig } from "./config"
import { VimState } from "./vimState"
import { applyDecorations, createVerticalLine, getOutlineRangesForVisibleEditors, searchExistingText, sortMatchesByDistance } from "./updateHighlights"

export interface LocationInfo { editor: vscode.TextEditor, range: vscode.Range, matchStart: vscode.Position, relativeDis: number }
export const flashModes = { idle: 'idle', active: 'active', symbol: 'symbol', lineUp: 'lineUp', lineDown: 'lineDown', }

export class Flash {
  static searchQuery: string = ""
  static labelMap: Map<string, { editor: vscode.TextEditor, position: vscode.Position }> = new Map()
  static config: FlashConfig
  static allMatches: LocationInfo[] = []
  static flashMode: string = flashModes.idle
  static symbols: vscode.DocumentSymbol[] = []

  static init(config: vscode.WorkspaceConfiguration) {
    this.config = getConfig(config)
  }

  static updateStateConfig(config: vscode.WorkspaceConfiguration) {
    this.config = getConfig(config)
  }

  static backspace() {
    if (this.searchQuery.length > 0) {
      this.searchQuery = this.searchQuery.slice(0, -1)

      this.updateHighlights()
    } else {
      // If query is empty, exit navigation (nothing to delete)
      VimState.stop()
    }
  }

  static stop() {
    for (const editor of vscode.window.visibleTextEditors) {
      editor.setDecorations(this.config.dimDecoration, [])
      editor.setDecorations(this.config.matchDecoration, [])
      editor.setDecorations(this.config.labelDecoration, [])
      editor.setDecorations(this.config.labelDecorationQuestion, [])
    }
    this.searchQuery = ''
    this.labelMap.clear()
    this.symbols = []
    this.flashMode = flashModes.idle
  }

  static handleLine(direction: string) {
    this.flashMode = direction
    this.searchQuery = ''
    this.updateHighlights()
  }

  static jump(target: { editor: vscode.TextEditor, position: vscode.Position }, scroll: boolean = false) {
    const targetEditor = target.editor;
    const targetPos = target.position;

    targetEditor.selection = new vscode.Selection(targetPos, targetPos);
    targetEditor.revealRange(new vscode.Range(targetPos, targetPos), scroll ? vscode.TextEditorRevealType.InCenter : vscode.TextEditorRevealType.Default);
    // If the target is in a different editor, focus that editor
    if (vscode.window.activeTextEditor !== targetEditor) {
      vscode.window.showTextDocument(targetEditor.document, targetEditor.viewColumn);
    }
  }

  static handleInput(text: string) {
    if (!text) {
      return
    }

    switch (text) {
      case flashModes.symbol:
        this.flashMode = flashModes.symbol
        return
      case flashModes.lineUp:
        this.handleLine(flashModes.lineUp)
        return
      case flashModes.lineDown:
        this.handleLine(flashModes.lineDown)
        return
      default:
        if (this.labelMap.size > 0 && this.labelMap.has(text)) {
          // We have a label matching this key – perform the jump
          const target = this.labelMap.get(text)!
          const prevPosition = vscode.window.activeTextEditor?.selection.active

          this.jump(target)

          if (VimState.select && prevPosition && vscode.window.activeTextEditor) {
            vscode.window.activeTextEditor.selection = new vscode.Selection(prevPosition, target.position)
            VimState.select = false
          }
          // Exit navigation mode after jumping
          this.stop()
          VimState.stop()
          return
        }
        // Append typed character to the search query
        this.searchQuery += text
        // throttledHandleEnterOrShiftEnter250()
        this.updateHighlights()
    }
  }



  static async updateHighlights() {
    if (this.searchQuery.toLowerCase() !== this.searchQuery) {
      this.config.caseSensitive = true
    } else {
      this.config.caseSensitive = vscode.workspace.getConfiguration('vim-flash').get<boolean>('caseSensitive', false)
    }

    this.labelMap.clear()

    // Not empty query: find matches in each visible editor
    this.allMatches = []
    const nextChars: string[] = []

    for (const editor of vscode.window.visibleTextEditors) {
      if ((this.flashMode === flashModes.symbol || this.flashMode === flashModes.lineDown || this.flashMode === flashModes.lineUp) && editor !== vscode.window.activeTextEditor) {
        continue
      }
      editor.setDecorations(this.config.dimDecoration, editor.visibleRanges)
      if (this.searchQuery.length === 0) {
        editor.setDecorations(this.config.labelDecoration, [])
        editor.setDecorations(this.config.labelDecorationQuestion, [])
        if (this.flashMode === flashModes.active) {
          continue
        }
      }

      if (this.flashMode === flashModes.symbol) {
        await getOutlineRangesForVisibleEditors(editor, this)
      }
      else if (this.flashMode === flashModes.lineDown || this.flashMode === flashModes.lineUp) {
        createVerticalLine(editor, this)
      }
      else {
        // Existing text search logic
        searchExistingText(editor, nextChars, this)
      }
    }

    sortMatchesByDistance(this)

    applyDecorations(nextChars, this)
  }
}
