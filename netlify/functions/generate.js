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

    // Используем модель из документации IO Intelligence
    const MODEL = 'meta-llama/Llama-3.3-70B-Instruct';

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
        stream: false
        // Убраны параметры, которые могут не поддерживаться: top_p, frequency_penalty, presence_penalty
      }),
    });

    if (!response.ok) {
      // Получаем детальную информацию об ошибке
      let errorText = await response.text();
      console.error('IO Intelligence API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      if (response.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ 
            error: 'Слишком много запросов. Пожалуйста, подождите 1-2 минуты перед следующим запросом.' 
          })
        };
      }

      // Пытаемся распарсить ошибку как JSON, если не получается - используем текст
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `IO Intelligence API: ${response.status} ${response.statusText}`,
          details: errorData
        })
      };
    }

    const data = await response.json();
    
    // Проверяем структуру ответа IO Intelligence API
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response structure:', data);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Неверная структура ответа от API' }),
      };
    }

    let code = data.choices[0].message.content?.trim() || '';

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
      body: JSON.stringify({ 
        error: 'Внутренняя ошибка сервера',
        details: error.message 
      }),
    };
  }
};