import * as vscode from "vscode"
import { Flash, flashModes } from "./flash";

export function createVerticalLine(editor: vscode.TextEditor, flashObj: typeof Flash) {
  const currentLine = editor.selection.active.line;
  const itr = flashObj.flashMode === flashModes.lineDown ? 1 : -1;

  for (let i = 0; i < flashObj.config.labelChars.length; i++) {
    const line = currentLine + (itr * i);
    if (line > editor.document.lineCount || line < 0) {
      break;
    }

    const lineText = line < editor.document.lineCount ? editor.document.lineAt(new vscode.Position(line, 0)).text : ""
    const startDiff = lineText.length - lineText.trimStart().length

    const matchStart = new vscode.Position(line, flashObj.config.lineHugsTheContent ? startDiff : 0);

    flashObj.allMatches.push({
      editor,
      range: new vscode.Range(matchStart, matchStart),
      matchStart: matchStart,
      relativeDis: relativeVsCodePosition(matchStart)
    });
  }
}

export function searchExistingText(editor: vscode.TextEditor, nextChars: string[], flashObj: typeof Flash) {
  for (const visibleRange of editor.visibleRanges) {
    const isActiveEditor = editor === vscode.window.activeTextEditor

    const startLine = isActiveEditor ? 0 : visibleRange.start.line
    const endLine = isActiveEditor ? editor.document.lineCount - 1 : visibleRange.end.line
    for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
      const lineText = editor.document.lineAt(lineNum).text
      let textToSearch = lineText
      let queryToSearch = flashObj.searchQuery
      // if searchQuery contains any uppercase letter the caseSensitivity is ignored
      if (flashObj.config.caseSensitive) {
        textToSearch = lineText
        queryToSearch = flashObj.searchQuery
      }
      else {
        textToSearch = lineText.toLowerCase()
        queryToSearch = flashObj.searchQuery.toLowerCase()
      }
      // Search for all occurrences of queryToSearch in this line
      let index = textToSearch.indexOf(queryToSearch)
      while (index !== -1) {
        const matchStart = new vscode.Position(lineNum, index)
        const matchEnd = new vscode.Position(lineNum, index + queryToSearch.length)
        // set nextChar to the character after the match, if it exists
        const nextChar = lineText[index + queryToSearch.length]
        if (nextChar) {
          nextChars.push(nextChar)
          if (queryToSearch) {
            nextChars.push(nextChar.toLowerCase())
          }
        }
        flashObj.allMatches.push({ editor, range: new vscode.Range(matchStart, matchEnd), matchStart: matchStart, relativeDis: relativeVsCodePosition(matchStart) })
        index = textToSearch.indexOf(queryToSearch, index + 1)
      }
    }
  }
}

// Helper function to compute Euclidean distance between two positions.
function getDistance(pos1: vscode.Position, pos2: vscode.Position, distanceOffset: number): number {
  const lineDiff = pos1.line - pos2.line
  const charDiff = pos1.character - pos2.character
  return lineDiff * lineDiff * 1000 + charDiff * charDiff + distanceOffset
}

export function sortMatchesByDistance(flashObj: typeof Flash) {
  const distanceOffset = 4

  if (vscode.window.activeTextEditor) {
    const cursorPos = vscode.window.activeTextEditor.selection.active

    // Sort the matches by distance from the cursor.
    flashObj.allMatches.sort((a, b) => {
      let weight_a = 1
      let weight_b = 1
      if (a.editor !== vscode.window.activeTextEditor) {
        weight_a = 10000
      }
      if (b.editor !== vscode.window.activeTextEditor) {
        weight_b = 10000
      }

      const distanceA = getDistance(cursorPos, a.matchStart, distanceOffset) * weight_a
      const distanceB = getDistance(cursorPos, b.matchStart, distanceOffset) * weight_b
      return distanceA - distanceB
    })
    if (flashObj.allMatches.length > 0) {
      const label = flashObj.allMatches[0]
      if (getDistance(cursorPos, label.matchStart, distanceOffset) === distanceOffset) {
        flashObj.allMatches.shift()
      }
    }
  }
}

export function applyDecorations(nextChars: string[], flashObj: typeof Flash) {
  const activeEditor = vscode.window.activeTextEditor

  // Decide how many (if any) to label:
  const totalMatches = flashObj.allMatches.length
  // deduplicate nextChars
  const allNextChars = [...new Set(nextChars)]
  // all characters that are in labelChars but not in allNextChars
  const useableLabelChars = flashObj.config.labelChars.split('').filter(c => !allNextChars.includes(c))

  // create an label array with length equal to the number of matches, and fill it with the useableLabelChars
  // if there are more matches than useableLabelChars, then fill the array with the useableLabelChars and then
  // fill the rest with the question mark character
  const labelCharsToUse = totalMatches > useableLabelChars.length ?
    useableLabelChars.concat(Array(totalMatches - useableLabelChars.length).fill('?')) :
    useableLabelChars.slice(0, totalMatches)

  let charCounter = 0

  let visibleEditors = vscode.window.visibleTextEditors
  // move the active editor to the front of the array
  if (activeEditor) {
    visibleEditors = [activeEditor, ...vscode.window.visibleTextEditors.filter(e => e !== activeEditor)]
  }

  for (const editor of visibleEditors) {
    const decorationOptions: vscode.DecorationOptions[] = []
    const questionDecorationOptions: vscode.DecorationOptions[] = []
    editor.setDecorations(flashObj.config.matchDecoration, flashObj.allMatches.filter(m => m.editor === editor).map(m => m.range))
    // set the character before the match to the label character
    const isActiveEditor = editor === activeEditor
    for (const match of flashObj.allMatches) {
      let flagOutsideVisibleRange = false
      if (isActiveEditor) {
        for (const visibleRange of editor.visibleRanges) {
          if (match.matchStart.line < visibleRange.start.line || match.matchStart.line > visibleRange.end.line) {
            flagOutsideVisibleRange = true
            continue
          }
        }
        if (flagOutsideVisibleRange) {
          continue
        }
      }

      if (match.editor !== editor) { continue; }
      const labelRange = match.range
      const char = labelCharsToUse[charCounter]
      charCounter++
      if (char !== '?') {
        flashObj.labelMap.set(char, { editor: editor, position: match.matchStart })
        decorationOptions.push({
          range: new vscode.Range(labelRange.start.line, labelRange.start.character, labelRange.start.line, labelRange.start.character + 1),
          renderOptions: {
            before: { contentText: char }
          }
        })
      }
      else {
        questionDecorationOptions.push({
          range: new vscode.Range(labelRange.start.line, labelRange.start.character, labelRange.start.line, labelRange.start.character + 1),
          renderOptions: {
            before: { contentText: '?' }
          }
        })
      }
    }
    editor.setDecorations(flashObj.config.labelDecoration, decorationOptions)
    editor.setDecorations(flashObj.config.labelDecorationQuestion, questionDecorationOptions)
  }
}

export async function getOutlineRangesForVisibleEditors(editor: vscode.TextEditor, flashObj: typeof Flash) {
  const document = editor.document
  const documentUri = document.uri

  flashObj.symbols = flashObj.symbols.length === 0 ? flashObj.symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', documentUri) : flashObj.symbols

  if (flashObj.symbols) {
    itrSymbol(flashObj.symbols, editor, flashObj)
  }
}

export function relativeVsCodePosition(pos: vscode.Position) {
  return pos.line * 1000 + pos.character;
}

export function itrSymbol(symbols: vscode.DocumentSymbol[], editor: vscode.TextEditor, flashObj: typeof Flash) {
  for (const symbol of symbols) {
    const range = symbol.range
    flashObj.allMatches.push({
      editor,
      range: new vscode.Range(range.start, new vscode.Position(range.start.line, range.start.character + symbol.name.length)),
      matchStart: range.start,
      relativeDis: relativeVsCodePosition(range.start)
    })
    if (symbol.children.length > 0) {
      itrSymbol(symbol.children, editor, flashObj)
    }
  }
}
