import * as vscode from 'vscode';
import * as path from 'path';

// Get configuration
function getConfig() {
  return vscode.workspace.getConfiguration('codelens');
}

function getApiUrl(): string {
  return getConfig().get('apiUrl', 'http://localhost:3000');
}

// Show information message
function showMessage(message: string, type: 'info' | 'error' | 'warning' = 'info') {
  switch (type) {
    case 'error':
      vscode.window.showErrorMessage(message);
      break;
    case 'warning':
      vscode.window.showWarningMessage(message);
      break;
    default:
      vscode.window.showInformationMessage(message);
  }
}

// Show progress
async function withProgress<T>(
  title: string,
  task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
): Promise<T> {
  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title },
    task
  );
}

// Analyze current file
async function analyzeCode() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    showMessage('No active editor', 'error');
    return;
  }

  const document = editor.document;
  const code = document.getText();

  await withProgress('Analyzing code...', async (progress) => {
    try {
      progress.report({ message: 'Scanning...' });
      
      const response = await fetch(`${getApiUrl()}/api/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: detectLanguage(document.languageId) })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      // Show results in output channel
      const output = vscode.window.createOutputChannel('CodeLens Results');
      output.show();
      
      output.appendLine('═'.repeat(50));
      output.appendLine('🔍 CodeLens Analysis Results');
      output.appendLine('═'.repeat(50));
      output.appendLine(`Language: ${result.language}`);
      
      if (result.security && result.security.length > 0) {
        output.appendLine(`\n🔒 Security Issues: ${result.security.length}`);
        for (const vuln of result.security) {
          output.appendLine(`  [${vuln.severity.toUpperCase()}] Line ${vuln.line}: ${vuln.message}`);
        }
      } else {
        output.appendLine('\n✅ No security issues found');
      }

      if (result.explain) {
        output.appendLine('\n📖 Explanation:');
        output.appendLine(result.explain);
      }

      showMessage('Analysis complete!', 'info');
    } catch (error: any) {
      showMessage(`Analysis failed: ${error.message}`, 'error');
    }
  });
}

// Scan for security vulnerabilities
async function scanSecurity() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    showMessage('No active editor', 'error');
    return;
  }

  const document = editor.document;
  const code = document.getText();

  await withProgress('Scanning for vulnerabilities...', async (progress) => {
    try {
      progress.report({ message: 'Scanning...' });
      
      const response = await fetch(`${getApiUrl()}/api/v1/security/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: detectLanguage(document.languageId) })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      const vulns = result.vulnerabilities || [];

      if (vulns.length > 0) {
        // Show in Problems panel
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('codelens-security');
        
        const diagnostics: vscode.Diagnostic[] = [];
        
        for (const vuln of vulns) {
          const range = new vscode.Range(
            new vscode.Position(vuln.line - 1, 0),
            new vscode.Position(vuln.line - 1, 1000)
          );
          
          const severity = vuln.severity === 'critical' || vuln.severity === 'high'
            ? vscode.DiagnosticSeverity.Error
            : vscode.DiagnosticSeverity.Warning;
          
          diagnostics.push(new vscode.Diagnostic(range, vuln.message, severity));
        }
        
        diagnosticCollection.set(document.uri, diagnostics);
        
        showMessage(`Found ${vulns.length} security issues!`, 'warning');
      } else {
        showMessage('✅ No security vulnerabilities found', 'info');
      }
    } catch (error: any) {
      showMessage(`Scan failed: ${error.message}`, 'error');
    }
  });
}

// Explain selected code
async function explainCode() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    showMessage('No active editor', 'error');
    return;
  }

  const selection = editor.selection;
  const code = editor.document.getText(selection);
  
  if (!code.trim()) {
    showMessage('No code selected', 'error');
    return;
  }

  await withProgress('Explaining code...', async (progress) => {
    try {
      progress.report({ message: 'Analyzing...' });
      
      const response = await fetch(`${getApiUrl()}/api/v1/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          language: detectLanguage(editor.document.languageId) 
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      // Show in a webview panel
      const panel = vscode.window.createWebviewPanel(
        'codelens-explain',
        'CodeLens Explanation',
        vscode.ViewColumn.Beside,
        {}
      );

      panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              line-height: 1.6;
              background: #1e1e1e;
              color: #d4d4d4;
            }
            h2 { color: #569cd6; }
            pre { 
              background: #2d2d2d; 
              padding: 15px; 
              border-radius: 5px;
              overflow-x: auto;
            }
            code { font-family: 'Fira Code', monospace; }
          </style>
        </head>
        <body>
          <h2>📖 Code Explanation</h2>
          <pre><code>${code.replace(/</g, '<').replace(/>/g, '>')}</code></pre>
          <h2>Explanation:</h2>
          <p>${result.explanation.replace(/\n/g, '<br>')}</p>
        </body>
        </html>
      `;
    } catch (error: any) {
      showMessage(`Explanation failed: ${error.message}`, 'error');
    }
  });
}

// Map VS Code language IDs to our API language IDs
function detectLanguage(langId: string): string {
  const mapping: Record<string, string> = {
    'javascript': 'javascript',
    'javascriptreact': 'javascript',
    'typescript': 'typescript',
    'typescriptreact': 'typescript',
    'python': 'python',
    'go': 'go',
    'java': 'java',
    'rust': 'rust',
    'cpp': 'cpp',
    'c': 'c',
    'csharp': 'csharp',
    'ruby': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kotlin': 'kotlin',
  };
  return mapping[langId] || 'text';
}

// Check API health
async function checkHealth() {
  try {
    const response = await fetch(`${getApiUrl()}/health`);
    const result = await response.json();
    
    if (result.status === 'ok') {
      showMessage(`✅ CodeLens API connected (v${result.version})`, 'info');
    } else {
      showMessage('⚠️ CodeLens API returned unexpected response', 'warning');
    }
  } catch (error: any) {
    showMessage(`❌ Cannot connect to CodeLens API: ${error.message}`, 'error');
  }
}

// Activate extension
export function activate(context: vscode.ExtensionContext) {
  console.log('CodeLens extension activated');

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codelens.analyze', analyzeCode)
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand('codelens.scanSecurity', scanSecurity)
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand('codelens.explain', explainCode)
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand('codelens.checkHealth', checkHealth)
  );

  // Auto-scan on save if enabled
  const config = getConfig();
  if (config.get('autoScan', false)) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        // Trigger security scan on save
        vscode.commands.executeCommand('codelens.scanSecurity');
      })
    );
  }
}

// Deactivate extension
export function deactivate() {
  console.log('CodeLens extension deactivated');
}
