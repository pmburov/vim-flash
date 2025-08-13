import * as vscode from "vscode"

export type FlashConfig = {
  dimOpacity: string
  matchColor: string
  matchFontWeight: string
  labelColor: string
  labelBackgroundColor: string
  labelQuestionBackgroundColor: string
  labelFontWeight: string
  caseSensitive: boolean
  labelChars: string
  dimDecoration: vscode.TextEditorDecorationType
  matchDecoration: vscode.TextEditorDecorationType
  labelDecoration: vscode.TextEditorDecorationType
  labelDecorationQuestion: vscode.TextEditorDecorationType
  lineHugsTheContent: boolean
}

export function getConfig(config: vscode.WorkspaceConfiguration): FlashConfig {
  const dimOpacity = config.get<string>('dimOpacity', '0.65')
  const matchColor = config.get<string>('matchColor', '#3e68d7')
  const matchFontWeight = config.get<string>('matchFontWeight', 'bold')
  const labelColor = config.get<string>('labelColor', '#ffffff')
  const labelBackgroundColor = config.get<string>('labelBackgroundColor', '#ff007c')
  const labelFontWeight = config.get<string>('labelFontWeight', 'bold')
  const labelQuestionBackgroundColor = config.get<string>('labelQuestionBackgroundColor', '#3E68D7')
  const caseSensitive = config.get<boolean>('caseSensitive', false);
  const lineHugsTheContent = config.get<boolean>('lineHugsTheContent', false)

  return {
    dimOpacity,
    matchColor,
    matchFontWeight,
    labelColor,
    labelBackgroundColor,
    labelQuestionBackgroundColor,
    labelFontWeight,
    caseSensitive,
    lineHugsTheContent,
    // Define the character pool for labels: lowercase, then uppercase, then digits
    labelChars: config.get<string>('labelKeys', 'asdfqwerzxcvkltgbuiopjnmyhASDFQWERZXCVKLTGBUIOPJNMYH0123456789!@#$%^&*()-_=+[]{}|;:\'",.<>/`~\\'),
    dimDecoration: vscode.window.createTextEditorDecorationType({
      opacity: dimOpacity
    }),
    matchDecoration: vscode.window.createTextEditorDecorationType({
      color: `${matchColor}70`,
      opacity: '1 !important',
      backgroundColor: `${matchColor}70`,
      fontWeight: matchFontWeight,
      textDecoration: `none; z-index: 10; color: ${matchColor} !important;`,
    }),
    labelDecoration: vscode.window.createTextEditorDecorationType({
      opacity: '1 !important',
      before: {
        color: labelColor,
        backgroundColor: labelBackgroundColor,
        fontWeight: labelFontWeight,
        textDecoration: `none; z-index: 1; position: absolute;`,
      }
    }),
    labelDecorationQuestion: vscode.window.createTextEditorDecorationType({
      opacity: '1 !important',
      before: {
        color: labelColor,
        backgroundColor: labelQuestionBackgroundColor,
        contentText: '?',
        fontWeight: labelFontWeight,
        textDecoration: `none; z-index: 1; position: absolute;`,
      }
    })
  }
};


