    const createTestBtn = document.getElementById('createTestBtn');
    const checkBtn = document.getElementById('checkBtn');
    const quizContainer = document.getElementById('quizContainer');
    const loading = document.getElementById('loading');

const phrases = [
  "Генерируем...",
  "Общаемся с нейронкой...",
  "Придумываем вопросы...",
  "Пытаемся узнать ответы...",
  "Оформляем тест...",
  "Почти готово...",
  "Совсем чуть-чуть...",
];

let index = 0;
const loadingText = document.getElementById('loading');

function changePhrase() {
  loadingText.textContent = phrases[index];
  index = (index + 1) % phrases.length;
}

// Фраза меняется каждый 5 сек
const intervalId = setInterval(changePhrase, 5000);


    async function fetchQuestions(count, answerType, difficulty) {
      const prompt = `
Ты — эксперт по визуализации данных, руководствующийся книгой "Основы визуализации данных: пособие по эффективной и убедительной подаче информации / Клаус Уилке." 
Необходимо создать тест для проверки знаний, он должен содержать следующие темы: 
Основные типы диаграмм и графиков (гистограммы, линейные графики, круговые диаграммы, тепловые карты и др.),
типы данных, цветовая палитра для визуализации, количественные диаграммы, диаграммы распределения, 
диаграммы двух переменных, визуализация количественных данных, диаграммы рассеяния, визуализация пропорций, 
гистограммы и графики плотности, визуализация пропорций, заголовки, подписи, легенды, оси координат, использование 3D для визуализации, 
ошибки в визуализации, анализ данных.
Сгенерируй ${count} вопрос${count > 1 ? 'ов' : ''} для теста по визуализации данных.
Каждый вопрос должен иметь 3-4 варианта ответа.
Тип ответа: ${answerType === 'single' ? 'одиночный выбор' : answerType === 'multiple' ? 'множественный выбор' : 'комбинированный (часть вопросов с одиночным, часть с множественным выбором, часть с каринками)'}.
Сложность вопросов: ${difficulty}.
Формат ответа JSON-массив с объектами:
[
  {
    "question": "текст вопроса",
    "type": "single" или "multiple",
    "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"],
    "correct": [индексы правильных вариантов, например [0] или [1,3]]
  },
  ...
]
Ответь только JSON без дополнительного текста.
Если вопрос требует анализа графика, добавь к объекту поле "chart" — JSON-конфигурацию для Chart.js (https://www.chartjs.org/docs/latest/) и сформируй подходящее задание на основе добавленного графика, для его анализа или выявления ошибок в нем.
Для остальных вопросов не добавляй поле "chart".
Формат ответа:
[
  {
    "question": "Посмотрите на график ниже и выберите правильный ответ.",
    "type": "single",
    "options": ["Рост", "Падение", "Стабильность"],
    "correct": [0],
    "chart": {
      "type": "bar",
      "data": {
        "labels": ["Январь", "Февраль", "Март"],
        "datasets": [{
          "label": "Продажи",
          "data": [100, 200, 300]
        }]
      }
    }
  },
  ...
]
      `;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen/qwen3-235b-a22b:free',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка сети: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Нейросеть не дала ответ. Попробуйте еще раз или перезагрузите страницу :)');

      try {
        const jsonStart = content.indexOf('[');
        const jsonEnd = content.lastIndexOf(']');
        const jsonString = content.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonString);
      } catch (e) {
        throw new Error('Не удалось создать тест: ' + e.message);
      }
    }

    function renderTest(questions, globalAnswerType) {
      quizContainer.innerHTML = '';
      questions.forEach((q, i) => {
        const block = document.createElement('section');
        block.className = 'question-block';
        block.id = `question-${i}`;
        block.setAttribute('tabindex', '-1');

        const qNumber = document.createElement('h3');
        qNumber.className = 'question-text';
        qNumber.textContent = `Вопрос ${i + 1}: ${q.question}`;
        block.appendChild(qNumber);

        if (q.chart) {
        const canvas = document.createElement('canvas');
        canvas.width = 400; canvas.height = 200;
        block.appendChild(canvas);
        setTimeout(() => {
          new Chart(canvas, {
            type: q.chart.type,
            data: q.chart.data,
            options: q.chart.options || {}
            });
          }, 0);
        }

        let type = globalAnswerType === 'combined' ? q.type : globalAnswerType;
        if (type !== 'single' && type !== 'multiple') type = 'single';

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';

        q.options.forEach((opt, idx) => {
          const optionId = `q${i}_opt${idx}`;
          const label = document.createElement('label');
          label.htmlFor = optionId;

          const input = document.createElement('input');
          input.type = type === 'single' ? 'radio' : 'checkbox';
          input.name = `q${i}`;
          input.id = optionId;
          input.value = idx;

          label.appendChild(input);
          label.appendChild(document.createTextNode(opt));

          optionsDiv.appendChild(label);
        });

        block.appendChild(optionsDiv);
        quizContainer.appendChild(block);
      });
    }

    function checkAnswers(questions, globalAnswerType) {
  let firstUnanswered = null;

  questions.forEach((q, i) => {
    const block = document.getElementById(`question-${i}`);
    block.classList.remove('required');

    const inputs = quizContainer.querySelectorAll(`[name="q${i}"]`);
    const selectedIndexes = [];
    inputs.forEach(input => {
      if (input.checked) selectedIndexes.push(Number(input.value));
    });

    if (selectedIndexes.length === 0 && !firstUnanswered) {
      firstUnanswered = block;
      block.classList.add('required');
    }
  });

  if (firstUnanswered) {
    firstUnanswered.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false; // Неотмеченные ответы
  }

  questions.forEach((q, i) => {
    const type = globalAnswerType === 'combined' ? q.type : globalAnswerType;
    const inputs = quizContainer.querySelectorAll(`[name="q${i}"]`);

    inputs.forEach(input => {
      input.disabled = true; // Фикс маркеров после проверки
    });

    inputs.forEach(input => {
      const label = input.parentElement;
      const idx = Number(input.value);
      label.classList.remove('correct', 'incorrect');

      if (q.correct.includes(idx)) {
        label.classList.add('correct'); // Для ПРАВИЛЬНЫХ ответов
      }

      if (!q.correct.includes(idx) && input.checked) {
        label.classList.add('incorrect'); // Для НЕправильных ответов
      }
    });
  });

  return true;
}


    createTestBtn.addEventListener('click', async () => {
      checkBtn.style.display = 'none';
      checkBtn.disabled = false;
      quizContainer.innerHTML = '';
      loading.style.display = 'flex';

      const count = parseInt(document.getElementById('questionCount').value, 10);
      const answerType = document.getElementById('answerType').value;
      const difficulty = document.getElementById('difficulty').value;

      if (isNaN(count) || count < 1 || count > 10) {
        alert('Введите количество вопросов от 1 до 10');
        loading.style.display = 'none';
        return;
      }

      try {
        const questions = await fetchQuestions(count, answerType, difficulty);
        loading.style.display = 'none';

        if (!Array.isArray(questions) || questions.length === 0) {
          alert('Не удалось получить вопросы от нейросети :(');
          return;
        }

        renderTest(questions, answerType);
        checkBtn.style.display = 'block';

        // Прокрутка после генерации
        document.body.classList.add('scroll-enabled');

        const firstQuestion = document.querySelector('.question-block');
        if (firstQuestion) {
          firstQuestion.focus();
          firstQuestion.scrollIntoView({ behavior: 'smooth' });
        }

        window.currentTest = { questions, answerType };
      } catch (e) {
        loading.style.display = 'none';
        alert('Ошибка при генерации теста: ' + e.message);
      }
    });

    checkBtn.addEventListener('click', () => {
      if (!window.currentTest) return;

      const { questions, answerType } = window.currentTest;
      const allAnswered = checkAnswers(questions, answerType);

      if (allAnswered) {
        checkBtn.disabled = true;
      }
    });
