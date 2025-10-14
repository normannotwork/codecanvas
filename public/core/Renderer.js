export class Renderer {
  static render(container, result) {
    container.innerHTML = '';
    switch (result.type) {
      case 'plot': this.renderPlot(container, result.content); break;
      case 'html': this.renderHTML(container, result.content); break;
      case 'text': this.renderText(container, result.content); break;
      case 'empty': this.renderPlaceholder(container, '✅', result.content); break;
      default: this.renderText(container, JSON.stringify(result));
    }
  }

  static renderPlot(container, dataUrl) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.className = 'rendered-plot';
    container.appendChild(img);

    const btn = document.createElement('button');
    btn.className = 'download-btn';
    btn.textContent = '💾 Сохранить график';
    btn.onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'codecanvas-plot.png';
      a.click();
    };
    container.appendChild(btn);
  }

  static renderHTML(container, html) {
    const iframe = document.createElement('iframe');
    iframe.className = 'sandboxed-iframe';
    iframe.sandbox = 'allow-scripts';
    iframe.srcdoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; font-family: sans-serif; }
          .generated-table { width:100%; border-collapse:collapse; margin:10px 0 }
          .generated-table th, td { border:1px solid #ddd; padding:8px; text-align:left }
          .generated-table th { background:#f2f2f2 }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `;
    container.appendChild(iframe);
  }

  static renderText(container, text) {
    const pre = document.createElement('pre');
    pre.className = 'rendered-text';
    pre.textContent = text;
    container.appendChild(pre);
  }

  static renderPlaceholder(container, icon, text) {
    container.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">${icon}</div>
        <p>${text}</p>
      </div>
    `;
  }

  static renderError(container, msg) {
    this.renderPlaceholder(container, '❌', `Ошибка: ${msg}`);
  }
}