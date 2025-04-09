import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });


console.log("📁 CWD:", process.cwd());
console.log("🔑 Loaded API key:", process.env.GEMINI_API_KEY);

const schema = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../schema.json'), 'utf-8')
);

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log("✅ Current extension is activated!");


  vscode.window.showInformationMessage("⚡ Current is running!");

  const provider = vscode.languages.registerInlineCompletionItemProvider(
    { scheme: 'file', language: '*' },
    {
      async provideInlineCompletionItems(document, position) {
        console.log("🛠️ Inline provider triggered");

        const rangeBeforeCursor = new vscode.Range(new vscode.Position(0, 0), position);
        const promptText = document.getText(rangeBeforeCursor).trim();

        const isNatural = /--sql:/i.test(promptText);
        const userQuery = isNatural ? promptText.split(/--sql:/i).pop()?.trim() || '' : promptText;
        
        const completion = await getGeminiCompletion(userQuery, isNatural);
        
        console.log("✍️ Prompt:", promptText);
        console.log("🧠 Completion:", completion);
        
        statusBarItem.text = '✨ Suggestion from Current';
        setTimeout(() => {
          statusBarItem.text = '⚡ Current AI';
        }, 3000); // Reset after 3 seconds

        const line = document.lineAt(position.line);
        const rangeToLineEnd = new vscode.Range(position, line.range.end);
        
        return {
          items: [
            new vscode.InlineCompletionItem(completion, rangeToLineEnd)
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


function trimOverlap(prompt: string, completion: string): string {
  const normalizedPrompt = prompt.trim().toLowerCase();
  const normalizedCompletion = completion.trim();

  if (normalizedCompletion.toLowerCase().startsWith(normalizedPrompt)) {
    return normalizedCompletion.slice(normalizedPrompt.length).trimStart();
  }

  return normalizedCompletion;
}






async function getGeminiCompletion(prompt: string, isNaturalLanguage = false): Promise<string> {
  const fetch = (await import('node-fetch')).default;
  const apiKey = process.env.GEMINI_API_KEY;
  const endpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

  const schemaLines = Object.entries(schema.tables)
    .map(([table, cols]) => `${table}: ${cols.join(', ')}`)
    .join('\n');

  const promptText = isNaturalLanguage
    ? `You are a SQL generator. Given a natural language instruction and a schema, return a full SQL query using proper formatting and indentation.

Schema:
${schemaLines}

Instruction:
${prompt}`
    : `You are an intelligent SQL autocomplete engine. Your task is to complete a partially written SQL query. Carefully analyze the overall context and structure of the query so far. You may infer likely table or column names based on what’s already written.

Return the next portion of the query using clean SQL formatting with proper line breaks and indentation. Complete the query as fully as possible so it can be executed as-is.

Use the schema context to help complete the query.
Only return valid SQL code.
Do not repeat the input.
Do not include explanations, comments, or markdown.

Schema:
${schemaLines}

Partial query:
${prompt}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: promptText }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 512,
      topP: 0.95,
      topK: 40
    }
  };

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json() as any;

  console.log("🧾 Full Gemini Response:", JSON.stringify(data, null, 2));

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleanedText = rawText.replace(/```sql\n?|```/g, '').trim();
  const trimmed = trimOverlap(prompt, cleanedText);
  return trimmed;
}



export function deactivate() {}
