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

    const IOINTELLIGENCE_API_KEY = process.env.IOINTELLIGENCE_API_KEY;
    if (!IOINTELLIGENCE_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Сервер не настроен: отсутствует IOINTELLIGENCE_API_KEY' }),
      };
    }

    // Задержка для избежания rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    const MODEL = 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B';

    const response = await fetch('https://api.intelligence.io.solutions/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${IOINTELLIGENCE_API_KEY}`,
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
6. Если запрос неясен — сделай разумное предположение и верни рабочий код.`
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        top_p: 0.9,
        frequency_penalty: 0.2,
        presence_penalty: 0.1,
        stream: false
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ 
            error: 'Слишком много запросов. Пожалуйста, подождите 1-2 минуты перед следующим запросом.' 
          })
        };
      }
      
      const errData = await response.json().catch(() => ({}));
      console.error('Intelligence.IO API error:', {
        status: response.status,
        body: errData
      });
      const errorMsg = errData?.error?.message || 'Неизвестная ошибка';
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Intelligence.IO: ${errorMsg}` })
      };
    }

    const data = await response.json();
    let code = data.choices[0]?.message?.content?.trim() || '';

    // Очистка кода
    code = code
      .replace(/^```[a-z]*\s*\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

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