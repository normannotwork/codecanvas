import { CodeExecutor } from './CodeExecutor.js';
import { Renderer } from './Renderer.js';

export class AIApp {
  constructor() {
    this.codeExecutor = new CodeExecutor();
    this.init();
  }

  init() {
    this.bindEvents();
    this.initializeApp();
  }

  bindEvents() {
    document.getElementById('run-btn')?.addEventListener('click', () => this.runCode());
    document.getElementById('clear-btn')?.addEventListener('click', () => this.clearAll());
    document.querySelectorAll('.tab-btn').forEach(btn =>
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab))
    );
    document.querySelectorAll('.example-btn').forEach(btn =>
      btn.addEventListener('click', (e) => {
        document.getElementById('prompt').value = e.target.dataset.example;
      })
    );
    document.getElementById('prompt')?.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.runCode();
      }
    });
  }

  async initializeApp() {
    try {
      this.updateStatus('Инициализация Python среды...', 'loading');
      await this.codeExecutor.initialize();
      this.updateStatus('Готов к работе ✨', 'success');
    } catch (error) {
      this.updateStatus(`Ошибка: ${error.message}`, 'error');
    }
  }

  async runCode() {
    const prompt = document.getElementById('prompt')?.value.trim();
    if (!prompt) return this.updateStatus('Введите запрос', 'warning');

    const runBtn = document.getElementById('run-btn');
    const btnText = runBtn?.querySelector('.btn-text');
    const btnLoading = runBtn?.querySelector('.btn-loading');

    try {
      if (runBtn) runBtn.disabled = true;
      if (btnText) btnText.style.display = 'none';
      if (btnLoading) btnLoading.style.display = 'inline';

      this.updateStatus('Генерация кода...', 'loading');
      this.clearOutput();
      this.clearConsole();

      const start = performance.now();
      const code = await this.generateCode(prompt);
      document.getElementById('generated-code').textContent = code;

      this.updateStatus('Выполнение кода...', 'loading');
      const result = await this.codeExecutor.executeCode(code);
      const execTime = (performance.now() - start).toFixed(1);
      document.getElementById('execution-time').textContent = `⏱️ ${execTime} мс`;

      // Enhanced result handling
      if (result && result.type) {
        Renderer.render(document.getElementById('output'), result);
        this.updateStatus('Готово!', 'success');
      } else {
        throw new Error('Неверный формат результата выполнения');
      }
    } catch (error) {
      console.error('Execution error:', error);
      this.updateStatus(`Ошибка: ${error.message}`, 'error');
      Renderer.renderError(document.getElementById('output'), error.message);
    } finally {
      if (runBtn) runBtn.disabled = false;
      if (btnText) btnText.style.display = 'inline';
      if (btnLoading) btnLoading.style.display = 'none';
    }
  }

  async generateCode(prompt) {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Ошибка генерации');
    return (await res.json()).code;
  }

  clearOutput() {
    document.getElementById('output').innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">💻</div>
        <p>Результат появится здесь</p>
      </div>
    `;
  }

  clearConsole() {
    document.getElementById('console-output').textContent = '';
    this.codeExecutor.consoleOutput = [];
  }

  clearAll() {
    document.getElementById('prompt').value = '';
    this.clearOutput();
    this.clearConsole();
    document.getElementById('generated-code').textContent = '';
    document.getElementById('execution-time').textContent = '';
    this.updateStatus('Готов к работе', 'info');
    this.switchTab('result');
  }

  switchTab(tab) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`${tab}-tab`)?.classList.add('active');
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  }

  updateStatus(msg, type = 'info') {
    const el = document.getElementById('status');
    if (el) {
      el.textContent = msg;
      el.className = `status ${type}`;
    }
  }
}