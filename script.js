// === КОНФИГУРАЦИЯ FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyCDds9Z98wQzElwisY5Y9O-NtF0oK92S4M",
    authDomain: "sitexchange.firebaseapp.com",
    databaseURL: "https://sitexchange-default-rtdb.europe-west1.firebasedatabase.app", 
    projectId: "sitexchange",
    storageBucket: "sitexchange.firebasestorage.app",
    messagingSenderId: "729024451406",
    appId: "1:729024451406:web:a140b9f82eec954496041f",
    measurementId: "G-D39E2FPR9Y"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

const database = firebase.database();
const textRef = database.ref('sharedText/publicNote'); 

// Ссылки на элементы DOM
const textarea = document.getElementById('shared-text');
const lineNumbersElement = document.getElementById('line-numbers');
const editorWrapper = document.getElementById('editor-wrapper'); 
const editorBorderSvg = document.getElementById('editor-border-svg');
const borderPath = document.getElementById('border-path');
const titleElement = document.getElementById('main-title');
const colorSquaresContainer = document.getElementById('color-squares-container');
const modal = document.getElementById('settingsModal');
const fontOptions = document.getElementById('font-options');

let typingTimeout;
let scrollTimeout; 

// === НАСТРОЙКИ (будут сохраняться в Local Storage) ===
let gradientColors = ['#ff69b4', '#9932cc', '#87ceeb', '#007bff']; 
let currentFont = 'Varela Round';

// ===========================================
// === ФУНКЦИИ МОДАЛЬНОГО ОКНА ===
// ===========================================
function openModal() {
    modal.style.display = 'block';
    renderColorSquares();
}

function closeModal() {
    modal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

// Глобальная функция для кнопки очистки
window.clearEditor = function() {
    if (confirm("Вы уверены, что хотите очистить поле?")) {
        textarea.value = '';
        textRef.set('');
        updateLineNumbers();
    }
}

// ===========================================
// === ЛОГИКА ЦВЕТА (ГРАДИЕНТ/АНИМАЦИЯ) ===
// ===========================================

function updateColorAnimation() {
    const root = document.documentElement;
    
    if (gradientColors.length === 1) {
        root.style.setProperty('--active-color', gradientColors[0]);
        titleElement.style.animation = 'none';
        return;
    }
    
    const animationSteps = 100; 
    const stepSize = animationSteps / gradientColors.length; 
    
    let keyframes = `@keyframes color-cycle {`;
    
    for(let i = 0; i < gradientColors.length; i++) {
        root.style.setProperty(`--color-${i}`, gradientColors[i]);
    }
    
    gradientColors.forEach((color, index) => {
        const percentage = index * stepSize;
        keyframes += `
            ${percentage}% { color: var(--color-${index}); text-shadow: 0 0 10px var(--color-${index}); }
        `;
    });
    
    keyframes += `
        100% { color: var(--color-0); text-shadow: 0 0 10px var(--color-0); }
    }`;
    
    let style = document.getElementById('color-animation-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'color-animation-style';
        document.head.appendChild(style);
    }
    style.innerHTML = keyframes;
    
    root.style.setProperty('--active-color', gradientColors[0]);
    titleElement.style.animation = 'color-cycle 15s ease-in-out infinite';
    
    saveSettings();
}

function renderColorSquares() {
    colorSquaresContainer.innerHTML = '';
    
    gradientColors.forEach((color, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'color-square-wrapper';
        
        const square = document.createElement('input');
        square.type = 'color';
        square.className = 'color-square';
        square.value = color;
        square.style.backgroundColor = color;
        square.dataset.index = index;
        
        square.addEventListener('input', (e) => {
            const newColor = e.target.value;
            e.target.style.backgroundColor = newColor;
            gradientColors[index] = newColor;
            updateColorAnimation(); 
        });
        
        // КНОПКА УДАЛЕНИЯ 
        const deleteButton = document.createElement('div');
        deleteButton.className = 'delete-color-button';
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.onclick = (e) => {
            e.stopPropagation(); 
            if (index > 0) {
                gradientColors.splice(index, 1);
                renderColorSquares();
                updateColorAnimation();
            }
        };
        
        wrapper.appendChild(square);
        
        // Только для дополнительных цветов
        if (index > 0) {
            wrapper.appendChild(deleteButton);
        }
        
        colorSquaresContainer.appendChild(wrapper);
    });
    
    if (gradientColors.length < 5) {
        const addButton = document.createElement('div');
        addButton.className = 'add-color-button';
        addButton.innerHTML = '<i class="fas fa-plus"></i>';
        addButton.onclick = addGradientColor;
        colorSquaresContainer.appendChild(addButton);
    }
}

function addGradientColor() {
    if (gradientColors.length < 5) {
        gradientColors.push('#ffffff'); 
        renderColorSquares();
        updateColorAnimation();
    }
}

// ===========================================
// === ЛОГИКА ШРИФТОВ ===
// ===========================================
function applyFont(fontName) {
    currentFont = fontName;
    titleElement.style.fontFamily = `'${fontName}', sans-serif`;
    // Используем CSS-переменную, чтобы обновить шрифт body
    document.body.style.fontFamily = `'${fontName}', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
    saveSettings();
}

fontOptions.addEventListener('change', (e) => {
    if (e.target.name === 'font') {
        applyFont(e.target.value);
    }
});

// ===========================================
// === LOCAL STORAGE (СОХРАНЕНИЕ НАСТРОЕК) ===
// ===========================================
function saveSettings() {
    localStorage.setItem('gradientColors', JSON.stringify(gradientColors));
    localStorage.setItem('currentFont', currentFont);
}

function loadSettings() {
    const savedColors = localStorage.getItem('gradientColors');
    const savedFont = localStorage.getItem('currentFont');
    
    if (savedColors) {
        gradientColors = JSON.parse(savedColors);
    }
    if (savedFont) {
        currentFont = savedFont;
        applyFont(currentFont);
        const radio = document.querySelector(`input[name="font"][value="${currentFont}"]`);
        if (radio) radio.checked = true;
    }
    
    updateColorAnimation();
}

// ===========================================
/* === СОЗДАНИЕ ЧАСТИЦ === */
// ===========================================
function createParticles() {
    const container = document.getElementById('particle-container');
    const count = 50;
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = Math.random() * 2 + 1; // 1px to 3px
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100 + 100}%`; 
        particle.style.animationDuration = `${Math.random() * 10 + 10}s`; 
        particle.style.animationDelay = `${Math.random() * 10}s`; 
        container.appendChild(particle);
    }
}

// ===========================================
// === БАЗОВАЯ ЛОГИКА РЕДАКТОРА ===
// ===========================================

function updateLineNumbers() {
    // ИСПРАВЛЕНИЕ: Гарантируем, что нумерация строится ТОЛЬКО на основе \n
    const lines = textarea.value.split('\n');
    const lineCount = lines.length; 
    let numbers = '';
    
    for (let i = 1; i <= lineCount; i++) {
        numbers += i + '\n';
    }
    
    // Если текст пустой, все равно должна быть строка 1
    if (textarea.value === '') {
        lineNumbersElement.innerText = '1';
        return;
    }

    // Убираем последний \n, если он есть, чтобы не добавлять лишнюю пустую строку
    // Но вставляем, если последняя строка пустая (т.е. текст заканчивается на \n)
    if (!textarea.value.endsWith('\n') && numbers.endsWith('\n')) {
         numbers = numbers.slice(0, -1);
    }
    
    lineNumbersElement.innerText = numbers;
}

function updateSvgBorder() {
    const width = editorWrapper.clientWidth;
    const height = editorWrapper.clientHeight;
    const radius = 8; 
    const strokeWidth = 1; 
    const halfStroke = strokeWidth / 2; 

    const d = `
        M ${radius + halfStroke},${halfStroke}
        L ${width - radius - halfStroke},${halfStroke}
        A ${radius},${radius} 0 0 1 ${width - halfStroke},${radius + halfStroke}
        L ${width - halfStroke},${height - radius - halfStroke}
        A ${radius},${radius} 0 0 1 ${width - radius - halfStroke},${height - halfStroke}
        L ${halfStroke},${height - halfStroke}
        A ${radius},${radius} 0 0 1 ${halfStroke},${height - radius - halfStroke}
        L ${halfStroke},${radius + halfStroke}
        A ${radius},${radius} 0 0 1 ${radius + halfStroke},${halfStroke}
    `;
    
    borderPath.setAttribute('d', d);
    editorBorderSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
}

// ЧТЕНИЕ ДАННЫХ (СИНХРОНИЗАЦИЯ)
textRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data !== null) {
        if (textarea.value !== data) {
            textarea.value = data;
            updateLineNumbers(); 
        }
    } else {
        textarea.value = '';
        updateLineNumbers();
    }
});

// ЗАПИСЬ ДАННЫХ И ОБНОВЛЕНИЕ НУМЕРАЦИИ
textarea.addEventListener('input', () => {
    updateLineNumbers(); 
    clearTimeout(typingTimeout);
    
    typingTimeout = setTimeout(() => {
        const newText = textarea.value;
        textRef.set(newText)
            .catch((error) => {
                console.error("Ошибка сохранения текста:", error);
            });
    }, 300); // <-- Задержка 300мс
});

// СИНХРОНИЗАЦИЯ ПРОКРУТКИ (Вертикальная и Горизонтальная)
textarea.addEventListener('scroll', () => {
    lineNumbersElement.scrollTop = textarea.scrollTop;
    lineNumbersElement.scrollLeft = textarea.scrollLeft; 

    textarea.classList.add('scrolling');
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        textarea.classList.remove('scrolling');
    }, 300); 
});

editorWrapper.addEventListener('scroll', () => {
    editorWrapper.classList.add('scrolling');
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        editorWrapper.classList.remove('scrolling');
    }, 300);
});

textarea.addEventListener('focus', () => {
    editorWrapper.classList.add('focused');
});

textarea.addEventListener('blur', () => {
    editorWrapper.classList.remove('focused');
});

// ИНИЦИАЛИЗАЦИЯ
window.addEventListener('load', () => {
    loadSettings(); 
    updateLineNumbers();
    updateSvgBorder(); 
    createParticles(); 
});

window.addEventListener('resize', updateSvgBorder);

// Делаем функции глобальными, чтобы они работали с onclick в HTML
window.openModal = openModal;
window.closeModal = closeModal;
window.addGradientColor = addGradientColor;
