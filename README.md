# CodeLens VS Code Extension

AI-powered code analysis directly in your VS Code editor.

## Features

- 🔒 **Security Scanning** - Detect vulnerabilities in your code
- 📖 **Code Explanation** - Understand code with AI explanations
- ⚡ **Quick Analysis** - Analyze entire files with one click
- 🔌 **Works with CodeLens API** - Connect to your own API server

## Requirements

- VS Code 1.85+
- CodeLens API running (default: http://localhost:3000)

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to debug or package the extension

## Configuration

Go to Settings → CodeLens to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| `codelens.apiUrl` | `http://localhost:3000` | CodeLens API URL |
| `codelens.autoScan` | `false` | Auto-scan on file save |
| `codelens.failOnSeverity` | `high` | Minimum severity to warn |

## Commands

Open Command Palette (Cmd/Ctrl + Shift + P):

- `CodeLens: Analyze Code` - Run full analysis
- `CodeLens: Security Scan` - Scan for vulnerabilities  
- `CodeLens: Explain Code` - Explain selected code

## Usage

### Security Scanning

1. Open a file
2. Run `CodeLens: Security Scan` from Command Palette
3. Issues appear in Problems panel

### Code Explanation

1. Select code in editor
2. Run `CodeLens: Explain Code`
3. View explanation in new panel

### Full Analysis

1. Open a file
2. Run `CodeLens: Analyze Code`
3. View results in Output panel

## Connecting to API

Set the API URL in settings or set environment variable:

```json
{
  "codelens.apiUrl": "http://localhost:3000"
}
```

For remote API:
```json
{
  "codelens.apiUrl": "https://your-api-server.com"
}
```

## License

MIT
