// Основной JavaScript файл для приложения

// Конфигурация приложения
const CONFIG = {
    API_BASE_URL: '/api',
    DEBUG: true
};

// Состояние приложения
const AppState = {
    currentView: 'day',
    events: [],
    currentDate: new Date(),
    isLoading: false
};

// Утилиты для логирования
const logger = {
    log: (...args) => CONFIG.DEBUG && console.log('[App]', ...args),
    error: (...args) => console.error('[App Error]', ...args),
    info: (...args) => CONFIG.DEBUG && console.info('[App Info]', ...args)
};

// Проверка соединения с API
async function checkApiConnection() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            logger.log('API подключен:', data);
            updateApiStatus(true);
            return true;
        }
    } catch (error) {
        logger.error('Ошибка подключения к API:', error);
        updateApiStatus(false);
        return false;
    }
}

// Обновление статуса API в интерфейсе
function updateApiStatus(isConnected) {
    const apiStatusElement = document.getElementById('apiStatus');
    if (!apiStatusElement) return;
    
    if (isConnected) {
        apiStatusElement.innerHTML = '<i class="fas fa-circle"></i> API подключен';
        apiStatusElement.classList.add('connected');
    } else {
        apiStatusElement.innerHTML = '<i class="fas fa-circle"></i> API недоступен';
        apiStatusElement.classList.remove('connected');
    }
}

// Инициализация приложения
async function initApp() {
    logger.info('Инициализация приложения...');
    
    // Проверяем соединение с API
    const isConnected = await checkApiConnection();
    
    if (isConnected) {
        // Загружаем события
        await loadEvents();
        
        // Показываем основной интерфейс
        document.querySelector('.app-status').style.display = 'none';
        document.querySelector('.content-wrapper').style.display = 'flex';
        
        // Настраиваем навигацию
        setupNavigation();
        
        // Загружаем начальный вид
        loadView(AppState.currentView);
        
        logger.info('Приложение успешно инициализировано');
    } else {
        showError('Не удалось подключиться к серверу. Пожалуйста, проверьте подключение.');
    }
}

// Загрузка событий с сервера
async function loadEvents() {
    try {
        AppState.isLoading = true;
        const response = await fetch(`${CONFIG.API_BASE_URL}/events`);
        
        if (response.ok) {
            const data = await response.json();
            logger.log('События загружены:', data);
            // Временная заглушка - позже заменим на реальные данные
            AppState.events = [];
        } else {
            throw new Error('Ошибка при загрузке событий');
        }
    } catch (error) {
        logger.error('Ошибка загрузки событий:', error);
        showError('Не удалось загрузить события. Пожалуйста, попробуйте позже.');
    } finally {
        AppState.isLoading = false;
    }
}

// Настройка навигации
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Убираем активный класс у всех элементов
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Добавляем активный класс текущему элементу
            item.classList.add('active');
            
            // Загружаем соответствующий вид
            const view = item.getAttribute('data-view');
            AppState.currentView = view;
            loadView(view);
        });
    });
}

// Загрузка вида
function loadView(viewName) {
    const viewContainer = document.getElementById('viewContainer');
    if (!viewContainer) return;
    
    logger.info(`Загрузка вида: ${viewName}`);
    
    // Временные заглушки для видов
    let html = '';
    
    switch (viewName) {
        case 'day':
            html = `
                <div class="day-view">
                    <h2><i class="fas fa-calendar-day"></i> Просмотр дня</h2>
                    <div class="date-navigation">
                        <button class="btn btn-outline" id="prevDay">
                            <i class="fas fa-chevron-left"></i> Предыдущий день
                        </button>
                        <h3 id="currentDateDisplay">${formatDate(AppState.currentDate)}</h3>
                        <button class="btn btn-outline" id="nextDay">
                            Следующий день <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <div class="day-timeline" id="dayTimeline">
                        <p class="empty-message">События на этот день будут отображаться здесь</p>
                    </div>
                </div>
            `;
            break;
            
        case 'list':
            html = `
                <div class="list-view">
                    <h2><i class="fas fa-list"></i> Все события</h2>
                    <div class="events-list" id="eventsList">
                        <p class="empty-message">Список событий будет отображаться здесь</p>
                    </div>
                </div>
            `;
            break;
            
        case 'add':
            html = `
                <div class="add-view">
                    <h2><i class="fas fa-plus-circle"></i> Новое событие</h2>
                    <div class="event-form">
                        <p>Форма для создания нового события будет здесь</p>
                    </div>
                </div>
            `;
            break;
            
        case 'search':
            html = `
                <div class="search-view">
                    <h2><i class="fas fa-search"></i> Поиск событий</h2>
                    <div class="search-container">
                        <p>Поиск по событиям будет здесь</p>
                    </div>
                </div>
            `;
            break;
            
        default:
            html = '<p>Неизвестный вид</p>';
    }
    
    viewContainer.innerHTML = html;
    
    // Настраиваем обработчики для загруженного вида
    if (viewName === 'day') {
        setupDayView();
    }
}

// Настройка вида дня
function setupDayView() {
    const prevDayBtn = document.getElementById('prevDay');
    const nextDayBtn = document.getElementById('nextDay');
    
    if (prevDayBtn) {
        prevDayBtn.addEventListener('click', () => {
            AppState.currentDate.setDate(AppState.currentDate.getDate() - 1);
            updateDayView();
        });
    }
    
    if (nextDayBtn) {
        nextDayBtn.addEventListener('click', () => {
            AppState.currentDate.setDate(AppState.currentDate.getDate() + 1);
            updateDayView();
        });
    }
    
    updateDayView();
}

// Обновление вида дня
function updateDayView() {
    const dateDisplay = document.getElementById('currentDateDisplay');
    if (dateDisplay) {
        dateDisplay.textContent = formatDate(AppState.currentDate);
    }
}

// Форматирование даты
function formatDate(date) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('ru-RU', options);
}

// Показать ошибку
function showError(message) {
    logger.error(message);
    
    // Временная реализация - просто alert
    alert(`Ошибка: ${message}`);
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM загружен, запуск приложения...');
    initApp();
});

// ================== Тестовые функции для проверки API ==================

// Тестирование CRUD операций через консоль
window.scheduleAPI = {
    // Получить все события
    getAllEvents: async function() {
        try {
            const response = await fetch('/api/events');
            const data = await response.json();
            console.log('Все события:', data);
            return data;
        } catch (error) {
            console.error('Ошибка:', error);
        }
    },
    
    // Создать тестовое событие
    createTestEvent: async function() {
        const now = new Date();
        const event = {
            title: 'Тестовое событие ' + now.toLocaleTimeString(),
            startTime: now.toISOString(),
            endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // +2 часа
            tags: ['тест', 'учеба']
        };
        
        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });
            
            const data = await response.json();
            console.log('Создано событие:', data);
            return data;
        } catch (error) {
            console.error('Ошибка:', error);
        }
    },
    
    // Получить события на сегодня
    getTodayEvents: async function() {
        const today = new Date().toISOString().split('T')[0]; // Формат YYYY-MM-DD
        
        try {
            const response = await fetch(`/api/events/date/${today}`);
            const data = await response.json();
            console.log(`События на ${today}:`, data);
            return data;
        } catch (error) {
            console.error('Ошибка:', error);
        }
    },
    
    // Поиск событий
    searchEvents: async function(query) {
        try {
            const response = await fetch(`/api/events/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            console.log(`Результаты поиска "${query}":`, data);
            return data;
        } catch (error) {
            console.error('Ошибка:', error);
        }
    }
};

// Автоматическое тестирование при загрузке (только в режиме отладки)
if (CONFIG.DEBUG) {
    document.addEventListener('DOMContentLoaded', async () => {
        // Ждем немного, чтобы сервер успел запуститься
        setTimeout(async () => {
            console.log('=== Начинаем тестирование API ===');
            
            // Проверяем здоровье сервера
            try {
                const health = await fetch('/api/health').then(r => r.json());
                console.log('Health check:', health);
            } catch (error) {
                console.error('Health check failed:', error);
            }
            
            // Создаем тестовое событие
            const newEvent = await window.scheduleAPI.createTestEvent();
            
            if (newEvent && newEvent.event) {
                // Получаем все события
                await window.scheduleAPI.getAllEvents();
                
                // Получаем события на сегодня
                await window.scheduleAPI.getTodayEvents();
                
                // Ищем событие
                await window.scheduleAPI.searchEvents('Тестовое');
                
                console.log('=== Тестирование API завершено ===');
                console.log('Для ручного тестирования используйте window.scheduleAPI в консоли');
            }
        }, 1000);
    });
}