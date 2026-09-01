import google.generativeai as genai
import os

API_KEY = os.environ.get("API_KEY")

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-pro')

try:
    with open('WeatherApp.js', 'r', encoding='utf-8') as f:
        code = f.read()
except FileNotFoundError:
    print("ОШИБКА: Файл WeatherApp.js не найден!")
    exit()

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

print("Генерирую код...")
response = model.generate_content(prompt)
print("\n--- РЕЗУЛЬТАТ ---")
print(response.text)
print("\n--- КОНЕЦ ---")
