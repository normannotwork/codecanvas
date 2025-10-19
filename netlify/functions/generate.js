// netlify/functions/generate.js
exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Только POST-запросы разрешены' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const prompt = body.prompt;

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Поле "prompt" обязательно' }),
      };
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Сервер не настроен: отсутствует OPENROUTER_API_KEY' }),
      };
    }

    const MODEL = 'deepseek/deepseek-r1-0528:free';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codesimulate.netlify.app',
        'X-Title': 'AI Code Runner',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `Ты — эксперт по генерации исполняемого кода в браузере через Pyodide и HTML.
Правила:
1. Отвечай ТОЛЬКО кодом. Никаких пояснений, комментариев, markdown, \`\`\`.
2. Для Python:
   - Используй matplotlib для графиков.
   - В конце графика вызывай функцию show_plot() (она уже определена).
   - Для таблиц: df_to_html(df) → возвращает HTML.
3. Для HTML: возвращай полный валидный HTML-фрагмент (без <!DOCTYPE>, если не требуется).
4. Никогда не используй: os, sys, subprocess, open, файлы, сеть.
5. Код должен быть готов к немедленному выполнению в изолированной среде.
6. Если запрос неясен — сделай разумное предположение и верни рабочий код.
7. Будь точным и следуй инструкциям строго.`
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3, // Немного выше для R1 модели
        max_tokens: 2000, // Увеличил лимит для reasoning модели
        top_p: 0.9,
        frequency_penalty: 0.2,
        presence_penalty: 0.1
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', {
        status: response.status,
        body: errData
      });
      const errorMsg = errData?.error?.message || 'Неизвестная ошибка';
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `OpenRouter: ${errorMsg}` })
      };
    }

    const data = await response.json();
    let code = data.choices[0]?.message?.content?.trim() || '';

    // Улучшенная очистка для reasoning модели (может добавлять размышления)
    code = code
      .replace(/^```[a-z]*\s*\n?/i, '')
      .replace(/\n?```$/i, '')
      .replace(/^(рассуждение|reasoning):.*?\n/gi, '') // Удаляем reasoning префиксы
      .replace(/^(рассуждение|reasoning):/gi, '')
      .trim();

    // Если код содержит reasoning блоки, берем только последний код
    const codeBlocks = code.split(/```/);
    if (codeBlocks.length > 1) {
      // Берем последний код блок
      for (let i = codeBlocks.length - 1; i >= 0; i--) {
        const block = codeBlocks[i].trim();
        if (block && !block.match(/^(рассуждение|reasoning)/i)) {
          code = block.replace(/^[a-z]+\n?/i, '').trim();
          break;
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ code }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Внутренняя ошибка сервера' }),
    };
  }
};