// static/js/app.js

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
    
    const statusDot = apiStatusElement.querySelector('.status-dot');
    const statusText = apiStatusElement.querySelector('.status-text');
    
    if (isConnected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'API подключен';
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'API недоступен';
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
        
        // Настраиваем навигацию
        setupNavigation();
        
        // Обновляем статистику
        updateStats();
        
        // Скрываем состояние загрузки и показываем интерфейс
        hideLoadingState();
        
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
            AppState.events = data.events || [];
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

// Скрытие состояния загрузки
function hideLoadingState() {
    const loadingState = document.getElementById('loadingState');
    const viewContainer = document.getElementById('viewContainer');
    
    if (loadingState) {
        loadingState.style.display = 'none';
    }
    
    if (viewContainer) {
        viewContainer.style.display = 'block';
    }
}

// Настройка навигации
function setupNavigation() {
    // Навигация в боковом меню
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });
    
    // Кнопки в приветственном сообщении
    const welcomeButtons = document.querySelectorAll('.quick-actions button[data-view]');
    welcomeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const view = button.getAttribute('data-view');
            switchView(view);
        });
    });
    
    // Кнопка в шапке
    const headerButton = document.querySelector('.header-controls button[data-view]');
    if (headerButton) {
        headerButton.addEventListener('click', () => {
            const view = headerButton.getAttribute('data-view');
            switchView(view);
        });
    }
}

// Переключение представления
function switchView(viewName) {
    logger.info(`Переключение на представление: ${viewName}`);
    
    // Обновляем активный пункт меню
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    navItems.forEach(item => {
        if (item.getAttribute('data-view') === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Обновляем текущее представление
    AppState.currentView = viewName;
    
    // Загружаем представление
    loadStaticView(viewName);
}

// Загрузка статического представления
async function loadStaticView(viewName) {
    const viewContainer = document.getElementById('viewContainer');
    if (!viewContainer) return;
    
    // Временная реализация - показываем заглушки
    let html = '';
    
    switch (viewName) {
        case 'day':
            html = `
                <div class="day-view">
                    <div class="date-navigation">
                        <button class="btn btn-outline" onclick="changeDate(-1)">
                            <i class="fas fa-chevron-left"></i> Вчера
                        </button>
                        <div class="date-display">
                            <h2 id="dayTitle">${formatDate(AppState.currentDate)}</h2>
                            <p id="daySubtitle">Сегодня</p>
                        </div>
                        <button class="btn btn-outline" onclick="changeDate(1)">
                            Завтра <i class="fas fa-chevron-right"></i>
                        </button>
                        <button class="btn btn-primary" data-view="add">
                            <i class="fas fa-plus"></i> Добавить
                        </button>
                    </div>
                    <div class="day-timeline" id="dayTimeline">
                        <div class="empty-day">
                            <i class="fas fa-calendar-times"></i>
                            <h3>На этот день событий нет</h3>
                            <p>Создайте первое событие</p>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'list':
            html = `
                <div class="list-view">
                    <div class="list-header">
                        <h2><i class="fas fa-list"></i> Все события</h2>
                        <div class="list-filters">
                            <select class="form-control" style="width: auto;">
                                <option>Все события</option>
                                <option>Только сегодня</option>
                            </select>
                            <button class="btn btn-outline" data-view="add">
                                <i class="fas fa-plus"></i> Добавить
                            </button>
                        </div>
                    </div>
                    <div class="events-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Название</th>
                                    <th>Дата и время</th>
                                    <th>Продолжительность</th>
                                    <th>Теги</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="event-row">
                                    <td colspan="5" class="text-center">
                                        <div class="empty-state">
                                            <i class="fas fa-inbox"></i>
                                            <h3>Событий пока нет</h3>
                                            <p>Создайте первое событие</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            break;
            
        case 'add':
            html = `
                <div class="event-form-view">
                    <div class="view-header">
                        <h2><i class="fas fa-plus-circle"></i> Новое событие</h2>
                        <p>Заполните форму для создания нового события</p>
                    </div>
                    <div class="event-form">
                        <div class="form-group">
                            <label for="eventTitle">Название события *</label>
                            <input type="text" id="eventTitle" class="form-control" 
                                   placeholder="Например: Встреча с командой" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="eventStart">Время начала *</label>
                                <input type="datetime-local" id="eventStart" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="eventEnd">Время окончания *</label>
                                <input type="datetime-local" id="eventEnd" class="form-control" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Теги</label>
                            <div class="tags-input-container">
                                <input type="text" id="tagInput" class="tag-input" 
                                       placeholder="Введите тег и нажмите Enter">
                            </div>
                            <div class="tag-preview" id="tagsPreview"></div>
                        </div>
                        <div class="form-actions">
                            <button class="btn btn-outline" data-view="day">
                                <i class="fas fa-times"></i> Отмена
                            </button>
                            <button class="btn btn-primary" onclick="createEvent()">
                                <i class="fas fa-save"></i> Сохранить событие
                            </button>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'search':
            html = `
                <div class="search-view">
                    <div class="view-header">
                        <h2><i class="fas fa-search"></i> Поиск событий</h2>
                        <p>Найдите события по названию, описанию или тегам</p>
                    </div>
                    <div class="search-container">
                        <div class="search-input-container">
                            <input type="text" id="searchInput" class="form-control" 
                                   placeholder="Введите поисковый запрос...">
                            <button class="btn btn-primary" onclick="performSearch()">
                                <i class="fas fa-search"></i> Найти
                            </button>
                        </div>
                    </div>
                    <div class="search-results" id="searchResults">
                        <div class="no-results">
                            <i class="fas fa-search"></i>
                            <h3>Начните поиск</h3>
                            <p>Введите запрос в поле выше</p>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'tags':
            html = `
                <div class="tags-view">
                    <div class="view-header">
                        <h2><i class="fas fa-tags"></i> Управление тегами</h2>
                        <p>Создавайте и управляйте тегами для организации событий</p>
                    </div>
                    <div class="tags-grid" id="tagsGrid">
                        <div class="tag-card">
                            <div class="tag-color" style="background-color: #2196f3;"></div>
                            <div class="tag-name">работа</div>
                            <div class="tag-count">0 событий</div>
                        </div>
                        <div class="tag-card">
                            <div class="tag-color" style="background-color: #4caf50;"></div>
                            <div class="tag-name">личное</div>
                            <div class="tag-count">0 событий</div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        default:
            html = '<p>Неизвестное представление</p>';
    }
    
    viewContainer.innerHTML = html;
    
    // Повторно настраиваем обработчики для вновь созданных элементов
    setupNavigation();
    
    // Если это форма добавления, настраиваем начальные значения
    if (viewName === 'add') {
        setupAddForm();
    }
}

// Настройка формы добавления
function setupAddForm() {
    const now = new Date();
    const startInput = document.getElementById('eventStart');
    const endInput = document.getElementById('eventEnd');
    
    if (startInput && endInput) {
        // Устанавливаем текущее время и время через 1 час
        const startTime = new Date(now.getTime());
        const endTime = new Date(now.getTime() + 60 * 60 * 1000);
        
        // Форматируем для input[type="datetime-local"]
        startInput.value = formatDateTimeLocal(startTime);
        endInput.value = formatDateTimeLocal(endTime);
    }
}

// Форматирование даты и времени для input[type="datetime-local"]
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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

// Изменение даты
function changeDate(delta) {
    AppState.currentDate.setDate(AppState.currentDate.getDate() + delta);
    if (AppState.currentView === 'day') {
        loadStaticView('day');
    }
}

// Обновление статистики
function updateStats() {
    const eventsCount = document.getElementById('eventsCount');
    const tagsCount = document.getElementById('tagsCount');
    
    if (eventsCount) {
        eventsCount.textContent = AppState.events.length;
    }
    
    if (tagsCount) {
        // Считаем уникальные теги
        const allTags = AppState.events.flatMap(event => event.tags || []);
        const uniqueTags = [...new Set(allTags)];
        tagsCount.textContent = uniqueTags.length;
    }
}

// Создание события (заглушка)
function createEvent() {
    alert('Функция создания события будет реализована в следующем этапе');
}

// Поиск событий (заглушка)
function performSearch() {
    alert('Функция поиска будет реализована в следующем этапе');
}

// Показать ошибку
function showError(message) {
    logger.error(message);
    
    // Временная реализация
    alert(`Ошибка: ${message}`);
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM загружен, запуск приложения...');
    initApp();
});

// Глобальные функции для тестирования
window.testAPI = {
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
    
    createTestEvent: async function() {
        const now = new Date();
        const event = {
            title: 'Тестовое событие ' + now.toLocaleTimeString(),
            startTime: now.toISOString(),
            endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
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
    }
};

// Добавляем в конец app.js

// Управление модальными окнами
function showModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    
    if (modal && modalTitle && modalMessage && confirmBtn) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        // Удаляем старый обработчик и добавляем новый
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', () => {
            if (onConfirm) onConfirm();
            closeModal();
        });
        
        modal.classList.add('active');
    }
}

function closeModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function showAlert(title, message) {
    const alertModal = document.getElementById('alertModal');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    
    if (alertModal && alertTitle && alertMessage) {
        alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertModal.classList.add('active');
    }
}

function closeAlert() {
    const alertModal = document.getElementById('alertModal');
    if (alertModal) {
        alertModal.classList.remove('active');
    }
}

// Закрытие модальных окон по клику вне контента
document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});

// static/js/app.js

// ================== КОНФИГУРАЦИЯ И СОСТОЯНИЕ ==================
const CONFIG = {
    API_BASE_URL: '/api',
    DEBUG: true
};

const AppState = {
    currentView: 'day',
    events: [],
    tags: [],
    currentDate: new Date(),
    selectedEvent: null,
    isLoading: false,
    searchQuery: '',
    tempTags: []
};

// ================== УТИЛИТЫ ==================
const utils = {
    log: (...args) => CONFIG.DEBUG && console.log('[App]', ...args),
    error: (...args) => console.error('[App Error]', ...args),
    info: (...args) => CONFIG.DEBUG && console.info('[App Info]', ...args),
    
    formatDate: (date) => {
        return date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    formatTime: (date) => {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    formatDateTime: (date) => {
        return `${utils.formatDate(date)}, ${utils.formatTime(date)}`;
    },
    
    formatDateTimeLocal: (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    },
    
    parseDateTimeLocal: (str) => {
        return new Date(str);
    },
    
    getTimeSlots: () => {
        const slots = [];
        for (let hour = 8; hour <= 22; hour++) {
            slots.push({
                hour: hour,
                label: `${hour.toString().padStart(2, '0')}:00`,
                events: []
            });
        }
        return slots;
    },
    
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ================== API МЕТОДЫ ==================
const api = {
    // Проверка здоровья сервера
    healthCheck: async () => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/health`);
            return await response.json();
        } catch (error) {
            utils.error('Health check failed:', error);
            return null;
        }
    },
    
    // Получить все события
    getAllEvents: async () => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/events`);
            const data = await response.json();
            return data.events || [];
        } catch (error) {
            utils.error('Failed to get events:', error);
            return [];
        }
    },
    
    // Получить события по дате
    getEventsByDate: async (date) => {
        try {
            const dateStr = date.toISOString().split('T')[0];
            const response = await fetch(`${CONFIG.API_BASE_URL}/events/date/${dateStr}`);
            const data = await response.json();
            return data.events || [];
        } catch (error) {
            utils.error('Failed to get events by date:', error);
            return [];
        }
    },
    
    // Создать событие
    createEvent: async (eventData) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create event');
            }
            
            return await response.json();
        } catch (error) {
            utils.error('Failed to create event:', error);
            throw error;
        }
    },
    
    // Обновить событие
    updateEvent: async (id, eventData) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/events/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update event');
            }
            
            return await response.json();
        } catch (error) {
            utils.error('Failed to update event:', error);
            throw error;
        }
    },
    
    // Удалить событие
    deleteEvent: async (id) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/events/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete event');
            }
            
            return await response.json();
        } catch (error) {
            utils.error('Failed to delete event:', error);
            throw error;
        }
    },
    
    // Поиск событий
    searchEvents: async (query) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/events/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            return data.events || [];
        } catch (error) {
            utils.error('Failed to search events:', error);
            return [];
        }
    }
};

// ================== УПРАВЛЕНИЕ СОСТОЯНИЕМ ==================
const stateManager = {
    // Обновить все события
    updateEvents: async () => {
        AppState.isLoading = true;
        try {
            AppState.events = await api.getAllEvents();
            stateManager.updateTags();
            stateManager.updateStats();
            
            // Если текущий вид - день, обновляем его
            if (AppState.currentView === 'day') {
                viewManager.renderDayView();
            }
            // Если текущий вид - список, обновляем его
            else if (AppState.currentView === 'list') {
                viewManager.renderListView();
            }
            // Если текущий вид - поиск и есть поисковый запрос
            else if (AppState.currentView === 'search' && AppState.searchQuery) {
                viewManager.renderSearchView();
            }
        } finally {
            AppState.isLoading = false;
        }
    },
    
    // Обновить теги из событий
    updateTags: () => {
        const allTags = AppState.events.flatMap(event => event.tags || []);
        const tagCounts = {};
        
        allTags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
        
        AppState.tags = Object.entries(tagCounts).map(([name, count]) => ({
            name,
            count,
            color: stateManager.getTagColor(name)
        }));
    },
    
    // Получить цвет для тега
    getTagColor: (tagName) => {
        const colors = [
            '#2196f3', '#4caf50', '#ff9800', '#f44336',
            '#9c27b0', '#00bcd4', '#795548', '#607d8b'
        ];
        
        let hash = 0;
        for (let i = 0; i < tagName.length; i++) {
            hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    },
    
    // Обновить статистику в интерфейсе
    updateStats: () => {
        const eventsCount = document.getElementById('eventsCount');
        const tagsCount = document.getElementById('tagsCount');
        
        if (eventsCount) {
            eventsCount.textContent = AppState.events.length;
        }
        
        if (tagsCount) {
            tagsCount.textContent = AppState.tags.length;
        }
    },
    
    // Обновить отображение даты
    updateDateDisplay: () => {
        const dateDisplay = document.getElementById('dateDisplay');
        if (dateDisplay) {
            dateDisplay.textContent = utils.formatDate(AppState.currentDate);
        }
    },
    
    // Изменить текущую дату
    changeDate: (days) => {
        const newDate = new Date(AppState.currentDate);
        newDate.setDate(newDate.getDate() + days);
        AppState.currentDate = newDate;
        stateManager.updateDateDisplay();
        
        if (AppState.currentView === 'day') {
            viewManager.renderDayView();
        }
    }
};

// ================== УПРАВЛЕНИЕ ПРЕДСТАВЛЕНИЯМИ ==================
const viewManager = {
    // Переключить представление
    switchView: (viewName) => {
        utils.log(`Switching to view: ${viewName}`);
        
        // Обновить активный пункт меню
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            if (item.getAttribute('data-view') === viewName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        AppState.currentView = viewName;
        
        // Очистить временные теги
        AppState.tempTags = [];
        
        // Загрузить представление
        switch (viewName) {
            case 'day':
                viewManager.renderDayView();
                break;
            case 'list':
                viewManager.renderListView();
                break;
            case 'add':
                viewManager.renderAddView();
                break;
            case 'edit':
                viewManager.renderEditView();
                break;
            case 'search':
                viewManager.renderSearchView();
                break;
            case 'tags':
                viewManager.renderTagsView();
                break;
        }
    },
    
    // ===== ПРЕДСТАВЛЕНИЕ ДНЯ =====
    renderDayView: async () => {
        const container = document.getElementById('viewContainer');
        if (!container) return;
        
        // Показать загрузку
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Загрузка событий...</p>
            </div>
        `;
        
        // Получить события на текущую дату
        const dayEvents = await api.getEventsByDate(AppState.currentDate);
        
        // Отсортировать события по времени начала
        dayEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
        // Определить, сегодня ли это
        const today = new Date();
        const isToday = AppState.currentDate.toDateString() === today.toDateString();
        const isYesterday = new Date(today.setDate(today.getDate() - 1)).toDateString() === AppState.currentDate.toDateString();
        const isTomorrow = new Date(today.setDate(today.getDate() + 2)).toDateString() === AppState.currentDate.toDateString();
        
        let daySubtitle = '';
        if (isToday) daySubtitle = 'Сегодня';
        else if (isYesterday) daySubtitle = 'Вчера';
        else if (isTomorrow) daySubtitle = 'Завтра';
        
        // Создать временные слоты
        const timeSlots = utils.getTimeSlots();
        
        // Распределить события по временным слотам
        dayEvents.forEach(event => {
            const startHour = new Date(event.startTime).getHours();
            const endHour = new Date(event.endTime).getHours();
            
            // Найти подходящие слоты
            for (let hour = startHour; hour <= endHour; hour++) {
                const slot = timeSlots.find(s => s.hour === hour);
                if (slot) {
                    slot.events.push(event);
                }
            }
        });
        
        // Отрисовать представление
        container.innerHTML = `
            <div class="day-view">
                <div class="date-navigation">
                    <button class="btn btn-outline" onclick="stateManager.changeDate(-1)">
                        <i class="fas fa-chevron-left"></i> Вчера
                    </button>
                    
                    <div class="date-display">
                        <h2 id="dayTitle">${utils.formatDate(AppState.currentDate)}</h2>
                        ${daySubtitle ? `<p id="daySubtitle">${daySubtitle}</p>` : ''}
                    </div>
                    
                    <button class="btn btn-outline" onclick="stateManager.changeDate(1)">
                        Завтра <i class="fas fa-chevron-right"></i>
                    </button>
                    
                    <button class="btn btn-primary" onclick="viewManager.switchView('add')">
                        <i class="fas fa-plus"></i> Добавить
                    </button>
                </div>
                
                ${dayEvents.length === 0 ? `
                    <div class="empty-day">
                        <i class="fas fa-calendar-times"></i>
                        <h3>На этот день событий нет</h3>
                        <p>Создайте первое событие, нажав кнопку "Добавить" выше</p>
                    </div>
                ` : `
                    <div class="day-timeline" id="dayTimeline">
                        ${timeSlots.map(slot => `
                            <div class="time-slot">
                                <div class="time-label">${slot.label}</div>
                                <div class="time-content">
                                    ${slot.events.map(event => {
                                        const startTime = new Date(event.startTime);
                                        const endTime = new Date(event.endTime);
                                        const isCurrentHour = startTime.getHours() === slot.hour;
                                        
                                        if (isCurrentHour) {
                                            const durationHours = (endTime - startTime) / (1000 * 60 * 60);
                                            const height = Math.min(durationHours * 60, 60);
                                            
                                            return `
                                                <div class="event-block" 
                                                     style="height: ${height}px; top: ${startTime.getMinutes()}px;"
                                                     onclick="eventManager.openEvent('${event.id}')">
                                                    <div class="event-title">${event.title}</div>
                                                    <div class="event-time">
                                                        ${utils.formatTime(startTime)} - ${utils.formatTime(endTime)}
                                                    </div>
                                                    ${event.tags && event.tags.length > 0 ? `
                                                        <div class="event-tags">
                                                            ${event.tags.map(tag => `
                                                                <span class="tag" style="background-color: ${stateManager.getTagColor(tag)}20; color: ${stateManager.getTagColor(tag)};">
                                                                    ${tag}
                                                                </span>
                                                            `).join('')}
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            `;
                                        }
                                        return '';
                                    }).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    },
    
    // ===== ПРЕДСТАВЛЕНИЕ СПИСКА =====
    renderListView: () => {
        const container = document.getElementById('viewContainer');
        if (!container) return;
        
        const events = AppState.events.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        container.innerHTML = `
            <div class="list-view">
                <div class="list-header">
                    <h2><i class="fas fa-list"></i> Все события</h2>
                    <div class="list-filters">
                        <button class="btn btn-outline" onclick="viewManager.switchView('add')">
                            <i class="fas fa-plus"></i> Добавить
                        </button>
                    </div>
                </div>
                
                ${events.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>Событий пока нет</h3>
                        <p>Создайте первое событие, чтобы начать планирование</p>
                        <button class="btn btn-primary" onclick="viewManager.switchView('add')">
                            <i class="fas fa-plus"></i> Создать событие
                        </button>
                    </div>
                ` : `
                    <div class="events-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Название</th>
                                    <th>Дата и время</th>
                                    <th>Продолжительность</th>
                                    <th>Теги</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${events.map(event => {
                                    const startTime = new Date(event.startTime);
                                    const endTime = new Date(event.endTime);
                                    const duration = (endTime - startTime) / (1000 * 60 * 60);
                                    const durationStr = duration >= 1 ? 
                                        `${Math.floor(duration)} ч ${Math.round((duration % 1) * 60)} мин` : 
                                        `${Math.round(duration * 60)} мин`;
                                    
                                    return `
                                        <tr class="event-row">
                                            <td>
                                                <div class="event-title">${event.title}</div>
                                            </td>
                                            <td>
                                                <div>${utils.formatDate(startTime)}</div>
                                                <div class="event-time">${utils.formatTime(startTime)} - ${utils.formatTime(endTime)}</div>
                                            </td>
                                            <td>${durationStr}</td>
                                            <td>
                                                ${event.tags && event.tags.length > 0 ? `
                                                    <div class="event-tags">
                                                        ${event.tags.map(tag => `
                                                            <span class="tag" style="background-color: ${stateManager.getTagColor(tag)}20; color: ${stateManager.getTagColor(tag)};">
                                                                ${tag}
                                                            </span>
                                                        `).join('')}
                                                    </div>
                                                ` : '—'}
                                            </td>
                                            <td>
                                                <div class="event-actions">
                                                    <button class="btn btn-icon btn-outline" 
                                                            onclick="eventManager.editEvent('${event.id}')"
                                                            title="Редактировать">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="btn btn-icon btn-outline" 
                                                            onclick="eventManager.deleteEvent('${event.id}')"
                                                            title="Удалить">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    },
    
    // ===== ПРЕДСТАВЛЕНИЕ ДОБАВЛЕНИЯ =====
    renderAddView: () => {
        const container = document.getElementById('viewContainer');
        if (!container) return;
        
        // Установить времена по умолчанию (текущее время и +1 час)
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        container.innerHTML = `
            <div class="event-form-view">
                <div class="view-header">
                    <h2><i class="fas fa-plus-circle"></i> Новое событие</h2>
                    <p>Заполните форму для создания нового события</p>
                </div>
                
                <div class="event-form">
                    <div class="form-group">
                        <label for="eventTitle">Название события *</label>
                        <input type="text" id="eventTitle" class="form-control" 
                               placeholder="Например: Встреча с командой" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="eventStart">Время начала *</label>
                            <input type="datetime-local" id="eventStart" class="form-control" 
                                   value="${utils.formatDateTimeLocal(now)}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="eventEnd">Время окончания *</label>
                            <input type="datetime-local" id="eventEnd" class="form-control" 
                                   value="${utils.formatDateTimeLocal(oneHourLater)}" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Теги</label>
                        <div class="tags-input-container">
                            <input type="text" id="tagInput" class="tag-input" 
                                   placeholder="Введите тег и нажмите Enter"
                                   onkeypress="tagManager.handleTagInputKeypress(event)">
                            <div class="tag-suggestions" id="tagSuggestions"></div>
                        </div>
                        <div class="tag-preview" id="tagsPreview">
                            ${AppState.tempTags.map(tag => `
                                <span class="tag" style="background-color: ${stateManager.getTagColor(tag)}20; color: ${stateManager.getTagColor(tag)};">
                                    ${tag}
                                    <i class="fas fa-times" onclick="tagManager.removeTempTag('${tag}')"></i>
                                </span>
                            `).join('')}
                        </div>
                        <div class="tag-suggestions">
                            <small>Популярные теги: 
                                ${AppState.tags.slice(0, 5).map(tag => `
                                    <span class="tag-suggestion" onclick="tagManager.addTempTag('${tag.name}')">
                                        ${tag.name}
                                    </span>
                                `).join(', ')}
                            </small>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button class="btn btn-outline" onclick="viewManager.switchView('day')">
                            <i class="fas fa-times"></i> Отмена
                        </button>
                        <button class="btn btn-primary" onclick="eventManager.createEvent()">
                            <i class="fas fa-save"></i> Сохранить событие
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Настроить автодополнение тегов
        tagManager.setupTagAutocomplete();
    },
    
    // ===== ПРЕДСТАВЛЕНИЕ РЕДАКТИРОВАНИЯ =====
    renderEditView: () => {
        if (!AppState.selectedEvent) {
            viewManager.switchView('list');
            return;
        }
        
        const container = document.getElementById('viewContainer');
        if (!container) return;
        
        const event = AppState.selectedEvent;
        const startTime = new Date(event.startTime);
        const endTime = new Date(event.endTime);
        
        // Установить временные теги для редактирования
        AppState.tempTags = [...(event.tags || [])];
        
        container.innerHTML = `
            <div class="event-form-view">
                <div class="view-header">
                    <h2><i class="fas fa-edit"></i> Редактирование события</h2>
                    <p>Измените параметры события</p>
                </div>
                
                <div class="event-form">
                    <div class="form-group">
                        <label for="eventTitle">Название события *</label>
                        <input type="text" id="eventTitle" class="form-control" 
                               value="${event.title}" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="eventStart">Время начала *</label>
                            <input type="datetime-local" id="eventStart" class="form-control" 
                                   value="${utils.formatDateTimeLocal(startTime)}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="eventEnd">Время окончания *</label>
                            <input type="datetime-local" id="eventEnd" class="form-control" 
                                   value="${utils.formatDateTimeLocal(endTime)}" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Теги</label>
                        <div class="tags-input-container">
                            <input type="text" id="tagInput" class="tag-input" 
                                   placeholder="Введите тег и нажмите Enter"
                                   onkeypress="tagManager.handleTagInputKeypress(event)">
                            <div class="tag-suggestions" id="tagSuggestions"></div>
                        </div>
                        <div class="tag-preview" id="tagsPreview">
                            ${AppState.tempTags.map(tag => `
                                <span class="tag" style="background-color: ${stateManager.getTagColor(tag)}20; color: ${stateManager.getTagColor(tag)};">
                                    ${tag}
                                    <i class="fas fa-times" onclick="tagManager.removeTempTag('${tag}')"></i>
                                </span>
                            `).join('')}
                        </div>
                        <div class="tag-suggestions">
                            <small>Популярные теги: 
                                ${AppState.tags.slice(0, 5).map(tag => `
                                    <span class="tag-suggestion" onclick="tagManager.addTempTag('${tag.name}')">
                                        ${tag.name}
                                    </span>
                                `).join(', ')}
                            </small>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button class="btn btn-outline" onclick="viewManager.switchView('list')">
                            <i class="fas fa-times"></i> Отмена
                        </button>
                        <button class="btn btn-primary" onclick="eventManager.updateEvent('${event.id}')">
                            <i class="fas fa-save"></i> Сохранить изменения
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Настроить автодополнение тегов
        tagManager.setupTagAutocomplete();
    },
    
    // ===== ПРЕДСТАВЛЕНИЕ ПОИСКА =====
    renderSearchView: () => {
        const container = document.getElementById('viewContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="search-view">
                <div class="view-header">
                    <h2><i class="fas fa-search"></i> Поиск событий</h2>
                    <p>Найдите события по названию, описанию или тегам</p>
                </div>
                
                <div class="search-container">
                    <div class="search-input-container">
                        <input type="text" id="searchInput" class="form-control" 
                               placeholder="Введите поисковый запрос..."
                               value="${AppState.searchQuery}"
                               oninput="utils.debounce(() => {
                                   AppState.searchQuery = document.getElementById('searchInput').value;
                                   viewManager.performSearch();
                               }, 300)()">
                        <button class="btn btn-primary" onclick="viewManager.performSearch()">
                            <i class="fas fa-search"></i> Найти
                        </button>
                    </div>
                </div>
                
                <div class="search-results" id="searchResults">
                    <div class="loading-state" id="searchLoading" style="display: none;">
                        <div class="spinner"></div>
                        <p>Поиск...</p>
                    </div>
                    <div id="searchResultsContent"></div>
                </div>
            </div>
        `;
        
        // Если есть поисковый запрос, выполнить поиск
        if (AppState.searchQuery) {
            viewManager.performSearch();
        }
    },
    
    // ===== ВЫПОЛНИТЬ ПОИСК =====
    performSearch: async () => {
        const searchInput = document.getElementById('searchInput');
        const resultsContent = document.getElementById('searchResultsContent');
        const searchLoading = document.getElementById('searchLoading');
        
        if (!searchInput || !resultsContent) return;
        
        AppState.searchQuery = searchInput.value.trim();
        
        if (!AppState.searchQuery) {
            resultsContent.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>Начните поиск</h3>
                    <p>Введите запрос в поле выше</p>
                </div>
            `;
            return;
        }
        
        // Показать загрузку
        if (searchLoading) searchLoading.style.display = 'flex';
        resultsContent.innerHTML = '';
        
        try {
            const results = await api.searchEvents(AppState.searchQuery);
            
            // Скрыть загрузку
            if (searchLoading) searchLoading.style.display = 'none';
            
            if (results.length === 0) {
                resultsContent.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <h3>Ничего не найдено</h3>
                        <p>Попробуйте изменить поисковый запрос</p>
                    </div>
                `;
            } else {
                resultsContent.innerHTML = results.map(event => {
                    const startTime = new Date(event.startTime);
                    const endTime = new Date(event.endTime);
                    
                    return `
                        <div class="result-item" onclick="eventManager.openEvent('${event.id}')">
                            <div class="result-header">
                                <h3 class="result-title">${event.title}</h3>
                                <span class="result-badge">
                                    ${startTime.toDateString() === new Date().toDateString() ? 'Сегодня' : 
                                      startTime.toDateString() === new Date(Date.now() + 86400000).toDateString() ? 'Завтра' : 
                                      utils.formatDate(startTime)}
                                </span>
                            </div>
                            <div class="result-date">
                                <i class="far fa-clock"></i> ${utils.formatDateTime(startTime)} - ${utils.formatTime(endTime)}
                            </div>
                            ${event.tags && event.tags.length > 0 ? `
                                <div class="result-tags">
                                    ${event.tags.map(tag => `
                                        <span class="tag" style="background-color: ${stateManager.getTagColor(tag)}20; color: ${stateManager.getTagColor(tag)};">
                                            ${tag}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            if (searchLoading) searchLoading.style.display = 'none';
            resultsContent.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка поиска</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    },
    
    // ===== ПРЕДСТАВЛЕНИЕ ТЕГОВ =====
    renderTagsView: () => {
        const container = document.getElementById('viewContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="tags-view">
                <div class="view-header">
                    <h2><i class="fas fa-tags"></i> Управление тегами</h2>
                    <p>Создавайте и управляйте тегами для организации событий</p>
                </div>
                
                ${AppState.tags.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-tags"></i>
                        <h3>Тегов пока нет</h3>
                        <p>Создайте теги при добавлении событий</p>
                    </div>
                ` : `
                    <div class="tags-grid" id="tagsGrid">
                        ${AppState.tags.map(tag => `
                            <div class="tag-card" onclick="tagManager.filterByTag('${tag.name}')">
                                <div class="tag-color" style="background-color: ${tag.color};"></div>
                                <div class="tag-name">${tag.name}</div>
                                <div class="tag-count">${tag.count} событий</div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    }
};

// ================== УПРАВЛЕНИЕ СОБЫТИЯМИ ==================
const eventManager = {
    // Открыть событие (просмотр)
    openEvent: async (id) => {
        const event = AppState.events.find(e => e.id === id);
        if (!event) return;
        
        // Спросить пользователя, что он хочет сделать
        const action = confirm(`Событие: ${event.title}\n\nВыберите действие:\nOK - Редактировать\nОтмена - Удалить`);
        
        if (action) {
            // Редактировать
            eventManager.editEvent(id);
        } else {
            // Удалить
            eventManager.deleteEvent(id);
        }
    },
    
    // Редактировать событие
    editEvent: (id) => {
        const event = AppState.events.find(e => e.id === id);
        if (!event) return;
        
        AppState.selectedEvent = event;
        viewManager.switchView('edit');
    },
    
    // Удалить событие
    deleteEvent: async (id) => {
        if (!confirm('Вы уверены, что хотите удалить это событие?')) {
            return;
        }
        
        try {
            await api.deleteEvent(id);
            utils.log('Event deleted:', id);
            alert('Событие успешно удалено');
            await stateManager.updateEvents();
        } catch (error) {
            utils.error('Failed to delete event:', error);
            alert('Ошибка при удалении события: ' + error.message);
        }
    },
    
    // Создать событие
    createEvent: async () => {
        const title = document.getElementById('eventTitle')?.value.trim();
        const startTime = document.getElementById('eventStart')?.value;
        const endTime = document.getElementById('eventEnd')?.value;
        
        // Валидация
        if (!title) {
            alert('Пожалуйста, введите название события');
            return;
        }
        
        if (!startTime || !endTime) {
            alert('Пожалуйста, укажите время начала и окончания');
            return;
        }
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        if (end <= start) {
            alert('Время окончания должно быть позже времени начала');
            return;
        }
        
        const eventData = {
            title: title,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            tags: AppState.tempTags
        };
        
        try {
            await api.createEvent(eventData);
            utils.log('Event created:', eventData);
            alert('Событие успешно создано');
            
            // Очистить временные теги
            AppState.tempTags = [];
            
            // Обновить события и переключиться на день
            await stateManager.updateEvents();
            viewManager.switchView('day');
        } catch (error) {
            utils.error('Failed to create event:', error);
            alert('Ошибка при создании события: ' + error.message);
        }
    },
    
    // Обновить событие
    updateEvent: async (id) => {
        const title = document.getElementById('eventTitle')?.value.trim();
        const startTime = document.getElementById('eventStart')?.value;
        const endTime = document.getElementById('eventEnd')?.value;
        
        // Валидация
        if (!title) {
            alert('Пожалуйста, введите название события');
            return;
        }
        
        if (!startTime || !endTime) {
            alert('Пожалуйста, укажите время начала и окончания');
            return;
        }
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        if (end <= start) {
            alert('Время окончания должно быть позже времени начала');
            return;
        }
        
        const eventData = {
            title: title,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            tags: AppState.tempTags
        };
        
        try {
            await api.updateEvent(id, eventData);
            utils.log('Event updated:', id, eventData);
            alert('Событие успешно обновлено');
            
            // Очистить временные теги
            AppState.tempTags = [];
            AppState.selectedEvent = null;
            
            // Обновить события и переключиться на список
            await stateManager.updateEvents();
            viewManager.switchView('list');
        } catch (error) {
            utils.error('Failed to update event:', error);
            alert('Ошибка при обновлении события: ' + error.message);
        }
    }
};

// ================== УПРАВЛЕНИЕ ТЕГАМИ ==================
const tagManager = {
    // Добавить временный тег
    addTempTag: (tag) => {
        const trimmedTag = tag.trim();
        if (!trimmedTag || AppState.tempTags.includes(trimmedTag)) {
            return;
        }
        
        AppState.tempTags.push(trimmedTag);
        
        // Обновить превью тегов
        const tagsPreview = document.getElementById('tagsPreview');
        if (tagsPreview) {
            tagsPreview.innerHTML = AppState.tempTags.map(t => `
                <span class="tag" style="background-color: ${stateManager.getTagColor(t)}20; color: ${stateManager.getTagColor(t)};">
                    ${t}
                    <i class="fas fa-times" onclick="tagManager.removeTempTag('${t}')"></i>
                </span>
            `).join('');
        }
        
        // Очистить поле ввода
        const tagInput = document.getElementById('tagInput');
        if (tagInput) {
            tagInput.value = '';
        }
    },
    
    // Удалить временный тег
    removeTempTag: (tag) => {
        AppState.tempTags = AppState.tempTags.filter(t => t !== tag);
        
        // Обновить превью тегов
        const tagsPreview = document.getElementById('tagsPreview');
        if (tagsPreview) {
            tagsPreview.innerHTML = AppState.tempTags.map(t => `
                <span class="tag" style="background-color: ${stateManager.getTagColor(t)}20; color: ${stateManager.getTagColor(t)};">
                    ${t}
                    <i class="fas fa-times" onclick="tagManager.removeTempTag('${t}')"></i>
                </span>
            `).join('');
        }
    },
    
    // Обработка нажатия клавиш в поле ввода тега
    handleTagInputKeypress: (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const tagInput = document.getElementById('tagInput');
            if (tagInput && tagInput.value.trim()) {
                tagManager.addTempTag(tagInput.value.trim());
            }
        }
    },
    
    // Настроить автодополнение тегов
    setupTagAutocomplete: () => {
        const tagInput = document.getElementById('tagInput');
        const tagSuggestions = document.getElementById('tagSuggestions');
        
        if (!tagInput || !tagSuggestions) return;
        
        tagInput.addEventListener('input', () => {
            const query = tagInput.value.trim().toLowerCase();
            
            if (!query) {
                tagSuggestions.innerHTML = '';
                return;
            }
            
            // Найти подходящие теги (из существующих и популярных)
            const existingTags = AppState.tags
                .map(tag => tag.name)
                .filter(tag => tag.toLowerCase().includes(query) && !AppState.tempTags.includes(tag));
            
            const popularTags = ['работа', 'личное', 'учеба', 'важно', 'встреча', 'развлечения', 'спорт']
                .filter(tag => tag.toLowerCase().includes(query) && !AppState.tempTags.includes(tag));
            
            const suggestions = [...new Set([...existingTags, ...popularTags])].slice(0, 5);
            
            if (suggestions.length > 0) {
                tagSuggestions.innerHTML = `
                    <div class="suggestions-list">
                        ${suggestions.map(tag => `
                            <div class="suggestion-item" onclick="tagManager.addTempTag('${tag}')">
                                ${tag}
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                tagSuggestions.innerHTML = '';
            }
        });
        
        // Скрыть подсказки при клике вне поля
        document.addEventListener('click', (e) => {
            if (!tagInput.contains(e.target) && !tagSuggestions.contains(e.target)) {
                tagSuggestions.innerHTML = '';
            }
        });
    },
    
    // Фильтрация по тегу
    filterByTag: (tagName) => {
        AppState.searchQuery = tagName;
        viewManager.switchView('search');
    }
};

// ================== УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ ==================
const modalManager = {
    showModal: (title, message, onConfirm) => {
        const modal = document.getElementById('confirmModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const confirmBtn = document.getElementById('modalConfirmBtn');
        
        if (modal && modalTitle && modalMessage && confirmBtn) {
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            
            // Удаляем старый обработчик и добавляем новый
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            newConfirmBtn.addEventListener('click', () => {
                if (onConfirm) onConfirm();
                modalManager.closeModal();
            });
            
            modal.classList.add('active');
        }
    },
    
    closeModal: () => {
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },
    
    showAlert: (title, message) => {
        const alertModal = document.getElementById('alertModal');
        const alertTitle = document.getElementById('alertTitle');
        const alertMessage = document.getElementById('alertMessage');
        
        if (alertModal && alertTitle && alertMessage) {
            alertTitle.textContent = title;
            alertMessage.textContent = message;
            alertModal.classList.add('active');
        }
    },
    
    closeAlert: () => {
        const alertModal = document.getElementById('alertModal');
        if (alertModal) {
            alertModal.classList.remove('active');
        }
    }
};

// ================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ==================
const app = {
    init: async () => {
        utils.info('Инициализация приложения...');
        
        // Настроить обработчики событий
        app.setupEventListeners();
        
        // Проверить соединение с API
        const health = await api.healthCheck();
        if (health) {
            app.updateApiStatus(true);
            utils.log('API подключен:', health);
            
            // Загрузить события
            await stateManager.updateEvents();
            
            // Скрыть состояние загрузки
            app.hideLoadingState();
            
            // Переключиться на начальное представление
            viewManager.switchView(AppState.currentView);
            
            utils.info('Приложение успешно инициализировано');
        } else {
            app.updateApiStatus(false);
            app.showError('Не удалось подключиться к серверу');
        }
    },
    
    setupEventListeners: () => {
        // Навигация в боковом меню
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.getAttribute('data-view');
                viewManager.switchView(view);
            });
        });
        
        // Кнопки в шапке
        const headerButton = document.querySelector('.header-controls button');
        if (headerButton) {
            headerButton.addEventListener('click', () => {
                viewManager.switchView('add');
            });
        }
        
        // Кнопки в приветственном сообщении
        document.querySelectorAll('.quick-actions button[data-view]').forEach(button => {
            button.addEventListener('click', () => {
                const view = button.getAttribute('data-view');
                viewManager.switchView(view);
            });
        });
        
        // Закрытие модальных окон по клику вне контента
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    },
    
    updateApiStatus: (isConnected) => {
        const apiStatus = document.getElementById('apiStatus');
        if (!apiStatus) return;
        
        const statusDot = apiStatus.querySelector('.status-dot');
        const statusText = apiStatus.querySelector('.status-text');
        
        if (isConnected) {
            statusDot.classList.add('connected');
            statusText.textContent = 'API подключен';
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = 'API недоступен';
        }
    },
    
    hideLoadingState: () => {
        const loadingState = document.getElementById('loadingState');
        const viewContainer = document.getElementById('viewContainer');
        
        if (loadingState) {
            loadingState.style.display = 'none';
        }
        
        if (viewContainer) {
            viewContainer.style.display = 'block';
        }
    },
    
    showError: (message) => {
        utils.error(message);
        alert(`Ошибка: ${message}`);
    }
};

// ================== ЗАПУСК ПРИЛОЖЕНИЯ ==================
document.addEventListener('DOMContentLoaded', () => {
    utils.info('DOM загружен, запуск приложения...');
    app.init();
});

// ================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ HTML ОБРАБОТЧИКОВ ==================
// Экспортируем функции, которые используются в обработчиках onclick в HTML
window.switchView = viewManager.switchView;
window.loadView = viewManager.switchView;
window.changeDate = (days) => stateManager.changeDate(days);
window.createEvent = eventManager.createEvent;
window.updateEvent = eventManager.updateEvent;
window.deleteEvent = eventManager.deleteEvent;
window.performSearch = viewManager.performSearch;
window.showModal = modalManager.showModal;
window.closeModal = modalManager.closeModal;
window.showAlert = modalManager.showAlert;
window.closeAlert = modalManager.closeAlert;

// Экспортируем для отладки
window.AppState = AppState;
window.utils = utils;
window.api = api;
window.stateManager = stateManager;
window.viewManager = viewManager;
window.eventManager = eventManager;
window.tagManager = tagManager;