// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { env } from "process";
import * as vscode from "vscode";

type Environments = {
  [index: string]: string;
};

type Config = {
  baseUrl: String | undefined;
  environments: Environments;
};

function getConfig(): Config {
  return {
    baseUrl: vscode.workspace.getConfiguration("flipper-links").get<String>("baseUrl") || "",
    environments: vscode.workspace.getConfiguration("flipper-links").get<Environments>("environments") || {},
  };
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "flipper-follower" is now active!');

  let timeout: NodeJS.Timer | undefined = undefined;

  const flipperDecorationType = vscode.window.createTextEditorDecorationType({
    textDecoration: "underline",
  });

  let activeEditor = vscode.window.activeTextEditor;

  function updateDecorations() {
    if (!activeEditor) {
      return;
    }

    const config = getConfig();
    const regex = /Flipper\[["':](?<feature>.+?)["']?\]/g;
    const text = activeEditor.document.getText();
    const matches: vscode.DecorationOptions[] = [];
    let match;
    while ((match = regex.exec(text))) {
      const startPos = activeEditor.document.positionAt(match.index);
      const endPos = activeEditor.document.positionAt(match.index + match[0].length);

      const decoration: vscode.DecorationOptions = {
        range: new vscode.Range(startPos, endPos),
        hoverMessage: getHoverMessage(match, config),
      };
      matches.push(decoration);
    }
    activeEditor.setDecorations(flipperDecorationType, matches);
  }

  function getHoverMessage(
    match: RegExpExecArray,
    config: Config
  ): vscode.MarkdownString | Array<vscode.MarkdownString> {
    const feature = match.groups?.feature;
    const envs = Object.keys(config.environments);

    if (config.baseUrl === "" && envs.length === 0) {
      return new vscode.MarkdownString("Invalid Configuration!");
    }

    if (envs.length === 0) {
      return new vscode.MarkdownString(`${config.baseUrl}${feature}`);
    }

    return envs.map((env) => {
      const url = config.environments[env];
      return new vscode.MarkdownString(`\`${env.toLocaleLowerCase()}\` - ${url}${feature}`);
    });
  }

  function triggerUpdateDecorations(throttle: boolean = false) {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    if (throttle) {
      timeout = setTimeout(updateDecorations, 500);
    } else {
      updateDecorations();
    }
  }

  if (activeEditor) {
    triggerUpdateDecorations();
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations(true);
      }
    },
    null,
    context.subscriptions
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
