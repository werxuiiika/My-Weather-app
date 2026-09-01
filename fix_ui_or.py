import requests
import json

API_KEY = "sk-or-v1-..."  # Твой ключ OpenRouter (если есть)
# Если ключа нет, используем бесплатный endpoint без ключа

code = open('WeatherApp.js', 'r', encoding='utf-8').read()

prompt = f"""
Ты эксперт по React Native. Вот код файла WeatherApp.js:
---
{code}
---

ЗАДАЧА (ТОЛЬКО ИЗМЕНИТЬ СТИЛИ):
1. ШЕСТЕРЕНКА (gearButton/gearIcon): marginTop -20, marginRight -30.
2. ЗАГОЛОВОК "ПОГОДА" (title/titleText): marginTop синхронно с шестеренкой, marginLeft 12.
3. НЕ ТРОГАЙ ТАБ-БАР.

Выведи ТОЛЬКО исправленный объект styles для этих элементов в формате JavaScript.
"""

# Используем бесплатный endpoint OpenRouter
response = requests.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "model": "google/gemini-2.0-flash-exp:free",
        "messages": [{"role": "user", "content": prompt}]
    }
)

result = response.json()
print(result['choices'][0]['message']['content'])
