import * as vscode from 'vscode';
import * as dotenv from 'dotenv';

dotenv.config(); // Load .env

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log("✅ Current extension is activated!");
  vscode.window.showInformationMessage("⚡ Current is running!");

  const provider = vscode.languages.registerInlineCompletionItemProvider(
    { scheme: 'file', language: '*' },
    {
      async provideInlineCompletionItems(document, position) {
        const line = document.lineAt(position.line);
        const prompt = line.text.substring(0, position.character);

        const completion = await getGeminiCompletion(prompt);
        console.log("✍️ Prompt:", prompt);
        console.log("🧠 Completion:", completion);
        
        statusBarItem.text = '✨ Suggestion from Current';
        setTimeout(() => {
          statusBarItem.text = '⚡ Current AI';
        }, 3000); // Reset after 3 seconds

        return {
          items: [
            {
              insertText: completion,
              range: new vscode.Range(position, position)
            }
          ]
        };
      }
    }
  );

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '⚡ Current AI';
  statusBarItem.tooltip = 'Current is active and ready';
  statusBarItem.show();

  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(provider);
}

async function getGeminiCompletion(prompt: string): Promise<string> {
  const fetch = (await import('node-fetch')).default;
  const apiKey = process.env.GEMINI_API_KEY;
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Complete this line: ${prompt}` }] }]
    })
  });

  const data = await response.json() as any;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

export function deactivate() {}
