exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Только POST' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const prompt = body.prompt;
    if (!prompt) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Нет prompt' }) };

    const KEY = process.env.OPENAI_API_KEY;
    if (!KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Нет API-ключа' }) };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `Ты — генератор кода. Отвечай ТОЛЬКО кодом без пояснений, без markdown, без \`\`\`. 
Поддерживай Python (matplotlib, pandas), HTML, CSS, JS. 
Если график — используй plt.show(). 
Если таблица — выводи как HTML. 
Не используй os, sys, subprocess.`
        }, { role: 'user', content: prompt }],
        temperature: 0.3
      })
    });

    if (!res.ok) throw new Error('OpenAI error');
    const data = await res.json();
    let code = data.choices[0]?.message?.content?.trim() || '';
    code = code.replace(/^```(?:python|html|js)?\n?|```$/g, '').trim();

    return { statusCode: 200, headers, body: JSON.stringify({ code }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Серверная ошибка' }) };
  }
};