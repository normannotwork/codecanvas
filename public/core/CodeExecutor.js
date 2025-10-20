export class CodeExecutor {
  constructor() {
    this.pyodide = null;
    this.consoleOutput = [];
  }

  async initialize() {
    if (this.pyodide) return;
    this.pyodide = await loadPyodide();

    // Load packages sequentially
    await this.pyodide.loadPackage('numpy');
    await this.pyodide.loadPackage('matplotlib');
    await this.pyodide.loadPackage('pandas');
    await this.pyodide.loadPackage('scipy');
    await this.pyodide.loadPackage('sympy');

   this.pyodide.runPython(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import scipy
import sympy
import io, base64, sys, json
from matplotlib import rcParams
import matplotlib.gridspec as gridspec
from matplotlib.patches import FancyBboxPatch, Circle, Rectangle
import seaborn as sns

# Настройка стилей для профессиональных графиков
plt.style.use('seaborn-v0_8-whitegrid')
rcParams.update({
    'font.family': 'serif',
    'font.serif': ['Times New Roman', 'DejaVu Serif'],
    'font.size': 12,
    'axes.labelsize': 14,
    'axes.titlesize': 16,
    'xtick.labelsize': 12,
    'ytick.labelsize': 12,
    'legend.fontsize': 12,
    'figure.titlesize': 18,
    'figure.figsize': (10, 6),
    'figure.dpi': 150,
    'savefig.dpi': 300,
    'savefig.bbox': 'tight',
    'savefig.facecolor': 'white',
    'axes.facecolor': '#f8f9fa',
    'grid.color': 'white',
    'grid.linewidth': 1.5,
    'lines.linewidth': 2.5,
    'patch.edgecolor': 'black',
    'patch.force_edgecolor': True,
    'xtick.direction': 'out',
    'ytick.direction': 'out'
})

# Make modules globally available
globals()['plt'] = plt
globals()['np'] = np
globals()['pd'] = pd
globals()['scipy'] = scipy
globals()['sympy'] = sympy
globals()['sns'] = sns

class StdoutRedirect:
    def __init__(self):
        self.content = ""
    def write(self, text):
        self.content += text
    def flush(self):
        pass

stdout_redirect = StdoutRedirect()
sys.stdout = stdout_redirect

def apply_professional_style():
    """Применяет профессиональный стиль к текущему графику"""
    ax = plt.gca()
    fig = plt.gcf()
    
    # Улучшение внешнего вида осей
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#2e3440')
    ax.spines['bottom'].set_color('#2e3440')
    ax.spines['left'].set_linewidth(1.5)
    ax.spines['bottom'].set_linewidth(1.5)
    
    # Настройка сетки
    ax.grid(True, alpha=0.3, linestyle='-', linewidth=1)
    ax.set_facecolor('#f8f9fa')
    
    # Настройка тиков
    ax.tick_params(axis='both', which='both', length=6, width=1.5, 
                   colors='#2e3440', direction='out')
    
    return fig, ax

def create_color_palette(n_colors=8, palette_name='viridis'):
    """Создает красивую цветовую палитру"""
    if palette_name == 'professional':
        colors = ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', 
                 '#3B1C32', '#6B8E23', '#4A6572', '#8B635C']
    else:
        colors = sns.color_palette(palette_name, n_colors)
    return colors

def show_plot(style='professional', dpi=300, transparent_bg=False, 
             add_watermark=False, watermark_text="Analysis"):
    """
    Создает высококачественный график с профессиональным оформлением
    
    Parameters:
    style - стиль оформления ('professional', 'minimal', 'dark')
    dpi - качество изображения
    transparent_bg - прозрачный фон
    add_watermark - добавить водяной знак
    watermark_text - текст водяного знака
    """
    
    fig = plt.gcf()
    
    # Применение выбранного стиля
    if style == 'professional':
        fig, ax = apply_professional_style()
    elif style == 'minimal':
        plt.style.use('default')
        ax = plt.gca()
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.grid(True, alpha=0.2)
    elif style == 'dark':
        plt.style.use('dark_background')
        ax = plt.gca()
        ax.grid(True, alpha=0.1)
    
    # Добавление водяного знака если требуется
    if add_watermark:
        fig.text(0.95, 0.05, watermark_text, fontsize=8, 
                color='gray', alpha=0.5, ha='right', va='bottom',
                rotation=0, style='italic')
    
    # Сохранение в буфер
    buf = io.BytesIO()
    facecolor = 'none' if transparent_bg else 'white'
    if style == 'dark' and not transparent_bg:
        facecolor = '#1a1a1a'
    
    plt.savefig(buf, format='png', dpi=dpi, bbox_inches='tight', 
                facecolor=facecolor, edgecolor='none',
                pad_inches=0.1, transparent=transparent_bg)
    
    plt.close('all')
    buf.seek(0)
    
    return 'image/png;base64,' + base64.b64encode(buf.read()).decode()

def create_figure(width=10, height=6, style='professional'):
    """Создает новую фигуру с заданными параметрами"""
    fig = plt.figure(figsize=(width, height), dpi=150)
    if style == 'professional':
        apply_professional_style()
    return fig

def plot_with_style(x, y, **kwargs):
    """Создает график с автоматическим применением стиля"""
    style = kwargs.pop('style', 'professional')
    palette = kwargs.pop('palette', 'professional')
    
    fig = create_figure(style=style)
    colors = create_color_palette(len(y) if hasattr(y, '__len__') and not isinstance(y[0], (int, float)) else 1, palette)
    
    plot_func = kwargs.pop('plot_func', plt.plot)
    if plot_func == plt.plot:
        lines = plt.plot(x, y, **kwargs)
        for i, line in enumerate(lines):
            line.set_color(colors[i % len(colors)])
    elif plot_func == plt.scatter:
        plt.scatter(x, y, color=colors[0], **kwargs)
    
    apply_professional_style()
    return fig

def df_to_html(df, style=True, precision=4):
    """Конвертирует DataFrame в HTML с улучшенным оформлением"""
    if style:
        styled_df = df.style\
            .format(precision=precision)\
            .set_properties(**{
                'background-color': '#f8f9fa',
                'color': '#2e3440',
                'border-color': '#dee2e6',
                'font-family': 'Arial, sans-serif'
            })\
            .set_table_styles([{
                'selector': 'th',
                'props': [('background-color', '#2E86AB'), 
                         ('color', 'white'),
                         ('font-weight', 'bold'),
                         ('padding', '12px'),
                         ('border', '1px solid #dee2e6')]
            }, {
                'selector': 'td',
                'props': [('padding', '10px'),
                         ('border', '1px solid #dee2e6')]
            }, {
                'selector': 'tr:nth-child(even)',
                'props': [('background-color', '#e9ecef')]
            }])
        return styled_df.to_html()
    else:
        return df.to_html(classes='generated-table', border=0, escape=False, index=False)

# Математические функции
def solve_equation(eq, var='x'):
    from sympy import symbols, solve, sympify, latex
    x = symbols(var)
    solutions = solve(sympify(eq), x)
    return {
        'solutions': solutions,
        'latex': [latex(sol) for sol in solutions] if solutions else []
    }

def integrate_function(func, var='x', a=None, b=None):
    from sympy import symbols, integrate, sympify, latex
    x = symbols(var)
    expr = sympify(func)
    if a is not None and b is not None:
        result = integrate(expr, (x, a, b))
        return {
            'result': result,
            'latex': latex(result),
            'type': 'definite'
        }
    result = integrate(expr, x)
    return {
        'result': result,
        'latex': latex(result),
        'type': 'indefinite'
    }

def derivative_function(func, var='x', order=1):
    from sympy import symbols, diff, sympify, latex
    x = symbols(var)
    result = diff(sympify(func), x, order)
    return {
        'result': result,
        'latex': latex(result),
        'order': order
    }

# Make functions globally available
globals()['show_plot'] = show_plot
globals()['df_to_html'] = df_to_html
globals()['solve_equation'] = solve_equation
globals()['integrate_function'] = integrate_function
globals()['derivative_function'] = derivative_function
globals()['create_figure'] = create_figure
globals()['plot_with_style'] = plot_with_style
globals()['apply_professional_style'] = apply_professional_style
globals()['create_color_palette'] = create_color_palette
`);

  log(msg, type = 'log') {
    this.consoleOutput.push({ msg, type });
    const el = document.getElementById('console-output');
    if (el) {
      const timestamp = new Date().toLocaleTimeString();
      const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'info' ? 'ℹ️' : '📝';
      el.textContent += `${emoji} [${timestamp}] ${msg}\n`;
      el.scrollTop = el.scrollHeight;
    }
  }

  async executeCode(code) {
    if (!this.pyodide) throw new Error('Pyodide не инициализирован');
    this.log('Выполнение кода...', 'info');

    try {
      // Reset stdout before execution
      this.pyodide.runPython('stdout_redirect.content = ""');

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