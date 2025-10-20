export class CodeExecutor {
  constructor() {
    this.pyodide = null;
    this.consoleOutput = [];
  }

  async initialize() {
    if (this.pyodide) return;
    this.pyodide = await loadPyodide();
    await this.pyodide.loadPackage(['numpy', 'matplotlib', 'pandas', 'scipy', 'sympy', 'plotly']);
    this.pyodide.runPython(`
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import io, base64, sys, json
import numpy as np
import pandas as pd

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
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    plt.close('all')  # Close all figures
    buf.seek(0)
    return 'image/png;base64,' + base64.b64encode(buf.read()).decode()

def df_to_html(df):
    return df.to_html(classes='generated-table', border=0, escape=False, index=False)

def create_interactive_plot(data, plot_type='line', **kwargs):
    """Create interactive plots using matplotlib with better defaults"""
    plt.figure(figsize=(10, 6))
    plt.style.use('seaborn-v0_8' if 'seaborn-v0_8' in plt.style.available else 'default')

    if plot_type == 'line':
        plt.plot(data['x'], data['y'], **kwargs)
    elif plot_type == 'scatter':
        plt.scatter(data['x'], data['y'], **kwargs)
    elif plot_type == 'bar':
        plt.bar(data['x'], data['y'], **kwargs)

    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    return show_plot()

# Enhanced math functions
def solve_equation(eq, var='x'):
    from sympy import symbols, solve, sympify
    x = symbols(var)
    return solve(sympify(eq), x)

def integrate_function(func, var='x', a=None, b=None):
    from sympy import symbols, integrate, sympify
    x = symbols(var)
    expr = sympify(func)
    if a is not None and b is not None:
        return integrate(expr, (x, a, b))
    return integrate(expr, x)

def derivative_function(func, var='x', order=1):
    from sympy import symbols, diff, sympify
    x = symbols(var)
    return diff(sympify(func), x, order)
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
      // Check if it's HTML first
      if (this.isHTML(code)) {
        this.log('Обнаружен HTML код', 'info');
        return { type: 'html', content: code };
      } else {
        this.log('Выполнение Python кода...', 'info');
        const result = await this.pyodide.runPythonAsync(code);
        const stdout = this.pyodide.globals.get('stdout_redirect').content;

        this.log(`Результат типа: ${typeof result}`, 'debug');

        // Enhanced result detection
        const isPlot = typeof result === 'string' && result.startsWith('image/png;base64,');
        const isHTMLTable = typeof result === 'string' && (result.startsWith('<table') || result.includes('<table'));
        const isJSON = typeof result === 'string' && (result.startsWith('{') || result.startsWith('['));

        if (isPlot) {
          this.log('Обнаружен график', 'success');
          return { type: 'plot', content: result };
        }
        if (isHTMLTable) {
          this.log('Обнаружена HTML таблица', 'success');
          return { type: 'html', content: result };
        }
        if (isJSON) {
          try {
            const parsed = JSON.parse(result);
            return { type: 'json', content: JSON.stringify(parsed, null, 2) };
          } catch {
            // Not valid JSON, treat as text
          }
        }

        // Handle different result types
        if (stdout && stdout.trim()) {
          this.log('Вывод в stdout', 'info');
          return { type: 'text', content: stdout.trim() };
        }
        if (result !== undefined && result !== null) {
          const resultStr = String(result);
          if (resultStr.length > 0) {
            return { type: 'text', content: resultStr };
          }
        }

        return { type: 'empty', content: 'Код выполнен успешно. Вывод отсутствует.' };
      }
    } catch (e) {
      this.log(`Ошибка выполнения: ${e.message}`, 'error');
      console.error('Code execution error:', e);
      throw new Error(`Ошибка выполнения кода: ${e.message}`);
    }
  }

  isHTML(code) {
    const t = code.trim();
    return t.startsWith('<!') || t.startsWith('<html') || t.startsWith('<div') || t.includes('<body');
  }
}