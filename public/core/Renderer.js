export class Renderer {
  static render(container, result) {
    container.innerHTML = '';
    if (!result || !result.type) {
      this.renderError(container, 'Неверный формат результата');
      return;
    }

    try {
      switch (result.type) {
        case 'plot': this.renderPlot(container, result.content); break;
        case 'html': this.renderHTML(container, result.content); break;
        case 'text': this.renderText(container, result.content); break;
        case 'json': this.renderJSON(container, result.content); break;
        case 'empty': this.renderPlaceholder(container, '✅', result.content); break;
        default: this.renderText(container, JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error('Render error:', error);
      this.renderError(container, `Ошибка отображения: ${error.message}`);
    }
  }

  static renderPlot(container, dataUrl) {
    // Clear container first
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'plot-wrapper';

    // Create a blob URL for the image to avoid 414 errors
    const byteCharacters = atob(dataUrl.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    const blobUrl = URL.createObjectURL(blob);

    const img = document.createElement('img');
    img.src = blobUrl;
    img.className = 'rendered-plot';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.border = '1px solid #ddd';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

    // Add loading state
    img.onload = () => {
      img.style.opacity = '1';
    };
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease';

    wrapper.appendChild(img);

    const controls = document.createElement('div');
    controls.className = 'plot-controls';
    controls.style.marginTop = '10px';
    controls.style.display = 'flex';
    controls.style.gap = '10px';
    controls.style.flexWrap = 'wrap';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = '💾 Скачать PNG';
    downloadBtn.onclick = () => {
      try {
        // Use blob URL for download to avoid 414 errors
        const byteCharacters = atob(dataUrl.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `codecanvas-plot-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } catch (error) {
        console.error('Download failed:', error);
        alert('Ошибка при скачивании файла');
      }
    };

    const copyBtn = document.createElement('button');
    copyBtn.className = 'download-btn';
    copyBtn.textContent = '📋 Копировать';
    copyBtn.onclick = async () => {
      try {
        // Copy blob URL instead of data URL to avoid length issues
        const byteCharacters = atob(dataUrl.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        const blobUrl = URL.createObjectURL(blob);

        await navigator.clipboard.writeText(blobUrl);
        copyBtn.textContent = '✅ Скопировано!';
        setTimeout(() => {
          copyBtn.textContent = '📋 Копировать';
          URL.revokeObjectURL(blobUrl); // Clean up
        }, 2000);
      } catch (error) {
        console.error('Copy failed:', error);
        // Fallback for older browsers or when clipboard API fails
        try {
          const textArea = document.createElement('textarea');
          textArea.value = dataUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          copyBtn.textContent = '✅ Скопировано!';
          setTimeout(() => {
            copyBtn.textContent = '📋 Копировать';
          }, 2000);
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError);
          alert('Не удалось скопировать изображение');
        }
      }
    };

    const newTabBtn = document.createElement('button');
    newTabBtn.className = 'download-btn';
    newTabBtn.textContent = '🔍 Открыть в новой вкладке';
    newTabBtn.onclick = () => {
      window.open(dataUrl, '_blank');
    };

    controls.appendChild(downloadBtn);
    controls.appendChild(copyBtn);
    controls.appendChild(newTabBtn);
    wrapper.appendChild(controls);
    container.appendChild(wrapper);
  }

  static renderJSON(container, jsonString) {
    const pre = document.createElement('pre');
    pre.className = 'rendered-json';
    pre.textContent = jsonString;
    container.appendChild(pre);
  }

  static renderHTML(container, html) {
    const iframe = document.createElement('iframe');
    iframe.className = 'sandboxed-iframe';
    iframe.sandbox = 'allow-scripts allow-forms allow-popups allow-modals';

    // Check if it's a full HTML document
    const trimmed = html.trim();
    const isFullDoc = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html');

    if (isFullDoc) {
      // For full HTML documents, use as-is
      iframe.srcdoc = html;
    } else {
      // For partial HTML, wrap in a basic structure
      iframe.srcdoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; }
            .generated-table { width:100%; border-collapse:collapse; margin:10px 0; background: white; }
            .generated-table th, td { border:1px solid #ddd; padding:8px; text-align:left; }
            .generated-table th { background:#f2f2f2; font-weight: bold; }
            .generated-table tr:nth-child(even) { background: #f9f9f9; }
            .generated-table tr:hover { background: #e9ecef; }
            button, input, select { font-family: inherit; }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>${html}</body>
        </html>
      `;
    }
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