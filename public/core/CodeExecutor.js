export class CodeExecutor {
  constructor() {
    this.pyodide = null;
    this.consoleOutput = [];
  }

  async initialize() {
    if (this.pyodide) return;
    this.pyodide = await loadPyodide();
    await this.pyodide.loadPackage(['numpy', 'matplotlib', 'pandas']);
    this.pyodide.runPython(`
import matplotlib.pyplot as plt
import io, base64, sys

class StdoutRedirect:
    def __init__(self):
        self.content = ""
    def write(self, text):
        self.content += text
    def flush(self):
        pass

stdout_redirect = StdoutRedirect()
sys.stdout = stdout_redirect

def show_plot():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=120, bbox_inches='tight')
    plt.close()
    buf.seek(0)
    return 'image/png;base64,' + base64.b64encode(buf.read()).decode()

def df_to_html(df):
    return df.to_html(classes='generated-table', border=0, escape=False)
`);
  }

  log(msg, type = 'log') {
    this.consoleOutput.push({ msg, type });
    const el = document.getElementById('console-output');
    if (el) {
      el.textContent += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
      el.scrollTop = el.scrollHeight;
    }
  }

  async executeCode(code) {
    if (!this.pyodide) throw new Error('Pyodide не инициализирован');
    this.log('Выполнение кода...', 'info');
    this.pyodide.runPython('stdout_redirect.content = ""');

    try {
      if (this.isHTML(code)) {
        return { type: 'html', content: code };
      } else {
        const result = await this.pyodide.runPythonAsync(code);
        const stdout = this.pyodide.globals.get('stdout_redirect').content;
        const isPlot = typeof result === 'string' && result.startsWith('image/png');
        const isHTMLTable = typeof result === 'string' && result.startsWith('<table');

        if (isPlot) return { type: 'plot', content: result };
        if (isHTMLTable) return { type: 'html', content: result };
        if (stdout || result !== undefined) return { type: 'text', content: stdout || String(result) };
        return { type: 'empty', content: 'Код выполнен. Вывод отсутствует.' };
      }
    } catch (e) {
      this.log(`Ошибка: ${e.message}`, 'error');
      throw e;
    }
  }

  isHTML(code) {
    const t = code.trim();
    return t.startsWith('<!') || t.startsWith('<html') || t.startsWith('<div') || t.includes('<body');
  }
}