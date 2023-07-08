# sort by todo date
# auto-suggestion 
# how many days left? (vscode text decoration)
# collapsible todo sections
```js
 const smallNumberDecorationType =
    vscode.window.createTextEditorDecorationType({
      after: {
        contentText: "Hello!",
      },
    });
  vscode.window.activeTextEditor?.setDecorations(smallNumberDecorationType, [
    new vscode.Range(0, 0, 100, 0),
  ]);
```
