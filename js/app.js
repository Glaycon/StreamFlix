// STREAMFLIX - APLICAÇÃO PRINCIPAL
// =================================

class StreamFlixApp {
    constructor() {
        this.currentCategory = 'all';
        this.favorites = new Set();
        this.loadFavorites();
    }

    // Inicializar aplicação
    init() {
        this.setupEventListeners();
        this.checkAutoLogin();
    }

    // Configurar event listeners
    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin.bind(this));
        
        // User logged in event
        window.addEventListener('userLoggedIn', this.handleUserLoggedIn.bind(this));
        
        // Load saved login if exists
        const rememberLogin = localStorage.getItem(CONFIG.storageKeys.rememberLogin);
        if (rememberLogin === 'true') {
            const savedUser = localStorage.getItem(CONFIG.storageKeys.user);
            if (savedUser) {
                const userData = JSON.parse(savedUser);
                document.getElementById('username').value = userData.username;
                document.getElementById('password').value = userData.password;
                document.getElementById('rememberLogin').checked = true;
            }
        }
    }

    // Verificar auto-login
    async checkAutoLogin() {
        if (authSystem.checkAuthStatus()) {
            try {
                // Tentar revalidar credenciais
                const user = authSystem.getCurrentUser();
                const result = await authSystem.testServerAuth(user.server, user.username, user.password);
                
                if (result.success) {
                    authSystem.m3uData = result.m3uData;
                    authSystem.showMainApp();
                } else {
                    // Credenciais expiradas, forçar novo login
                    authSystem.logout();
                }
            } catch (error) {
                console.error('Erro no auto-login:', error);
                authSystem.logout();
            }
        }
    }

    // Manipular login
    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const rememberLogin = document.getElementById('rememberLogin').checked;
        
        if (!username || !password) {
            this.showError('Por favor, preencha todos os campos');
            return;
        }
        
        const result = await authSystem.login(username, password, rememberLogin);
        
        if (result.success) {
            this.showNotification(`Conectado ao servidor: ${result.server}`);
        }
    }

    // Manipular usuário logado
    handleUserLoggedIn(event) {
        const { user, server, m3uData } = event.detail;
        
        this.showNotification('Carregando conteúdo...', 'info');
        this.loadContent(m3uData);
    }

    // Carregar conteúdo
    async loadContent(m3uData) {
        try {
            // Carregar canais
            this.loadChannels(m3uData.channels);
            
            // Carregar filmes e séries com TMDB se disponível
            const tmdbConfig = getTMDBConfig(authSystem.getCurrentServer());
            if (tmdbConfig) {
                await this.loadMoviesWithTMDB(m3uData.movies, tmdbConfig);
                await this.loadSeriesWithTMDB(m3uData.series, tmdbConfig);
            } else {
                this.loadMoviesBasic(m3uData.movies);
                this.loadSeriesBasic(m3uData.series);
            }
            
            this.showNotification('Conteúdo carregado com sucesso!');
            
        } catch (error) {
            console.error('Erro ao carregar conteúdo:', error);
            this.showError('Erro ao carregar conteúdo');
        }
    }

    // Carregar canais
    loadChannels(channelsData) {
        window.channelsData = channelsData;
        this.filterChannels('all');
    }

    // Filtrar canais por categoria
    filterChannels(category) {
        this.currentCategory = category;
        
        // Atualizar tabs ativos
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event?.target?.classList.add('active');
        
        const channelsGrid = document.getElementById('channelsGrid');
        const channels = window.channelsData ? window.channelsData[category] || [] : [];
        
        if (category === 'favoritos') {
            // Mostrar apenas favoritos
            const allChannels = window.channelsData ? window.channelsData.all || [] : [];
            const favoriteChannels = allChannels.filter(channel => this.favorites.has(channel.id));
            this.renderChannels(favoriteChannels);
        } else {
            this.renderChannels(channels);
        }
    }

    // Renderizar canais
    renderChannels(channels) {
        const channelsGrid = document.getElementById('channelsGrid');
        
        if (channels.length === 0) {
            channelsGrid.innerHTML = `
                <div class="loading">
                    <span style="font-size: 48px;">📺</span>
                    <p>Nenhum canal encontrado nesta categoria</p>
                </div>
            `;
            return;
        }
        
        channelsGrid.innerHTML = channels.map(channel => `
            <div class="channel-card" onclick="playContent('${channel.id}', 'channel')">
                <div class="channel-logo">
                    ${channel.logo ? 
                        `<img src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div style="display:none; font-size:32px;">📺</div>` :
                        `<div class="emoji-logo">📺</div>`
                    }
                    <div class="live-indicator">
                        <div class="live-dot"></div>
                        AO VIVO
                    </div>
                    <div class="category-badge">${channel.category}</div>
                </div>
                <div class="card-content">
                    <div class="card-title">${channel.name}</div>
                    <div class="card-subtitle">${channel.category}</div>
                    <div class="card-meta">
                        <button class="favorite-btn ${this.favorites.has(channel.id) ? 'active' : ''}" 
                                onclick="event.stopPropagation(); toggleFavorite('${channel.id}')">
                            ⭐
                        </button>
                        <span>HD</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Carregar filmes com TMDB
    async loadMoviesWithTMDB(movies, tmdbConfig) {
        const moviesGrid = document.getElementById('moviesGrid');
        moviesGrid.innerHTML = '<div class="loading"><div class="spinner"></div>Sincronizando com TMDB...</div>';
        
        try {
            const enhancedMovies = [];
            
            for (const movie of movies.slice(0, 20)) { // Limitar para não sobrecarregar
                try {
                    // Buscar no TMDB pelo nome
                    const searchUrl = `${tmdbConfig.baseUrl}/search/movie?api_key=${tmdbConfig.apiKey}&language=${tmdbConfig.language}&query=${encodeURIComponent(movie.name)}`;
                    const response = await fetch(searchUrl);
                    const data = await response.json();
                    
                    if (data.results && data.results.length > 0) {
                        const tmdbMovie = data.results[0];
                        enhancedMovies.push({
                            ...movie,
                            tmdbId: tmdbMovie.id,
                            poster: tmdbMovie.poster_path ? `${tmdbConfig.imageBase}${tmdbMovie.poster_path}` : null,
                            backdrop: tmdbMovie.backdrop_path ? `${tmdbConfig.imageBase}${tmdbMovie.backdrop_path}` : null,
                            overview: tmdbMovie.overview,
                            rating: tmdbMovie.vote_average,
                            releaseDate: tmdbMovie.release_date,
                            year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : 'N/A'
                        });
                    } else {
                        // Sem dados TMDB, usar dados básicos
                        enhancedMovies.push({
                            ...movie,
                            year: 'N/A',
                            rating: 0
                        });
                    }
                } catch (error) {
                    console.warn(`Erro ao buscar TMDB para ${movie.name}:`, error);
                    enhancedMovies.push(movie);
                }
                
                // Delay para respeitar rate limit do TMDB
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            this.renderMovies(enhancedMovies);
            
        } catch (error) {
            console.error('Erro ao carregar filmes com TMDB:', error);
            this.loadMoviesBasic(movies);
        }
    }

    // Carregar filmes básico (sem TMDB)
    loadMoviesBasic(movies) {
        const basicMovies = movies.slice(0, 20).map(movie => ({
            ...movie,
            year: 'N/A',
            rating: 0
        }));
        this.renderMovies(basicMovies);
    }

    // Renderizar filmes
    renderMovies(movies) {
        const moviesGrid = document.getElementById('moviesGrid');
        
        if (movies.length === 0) {
            moviesGrid.innerHTML = '<div class="loading"><span style="font-size: 48px;">🎬</span><p>Nenhum filme encontrado</p></div>';
            return;
        }
        
        moviesGrid.innerHTML = movies.map(movie => `
            <div class="content-card" onclick="playContent('${movie.id}', 'movie')">
                <div class="card-image">
                    ${movie.poster ? 
                        `<img src="${movie.poster}" alt="${movie.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-size:32px;">🎬</div>` :
                        '<span style="font-size: 32px;">🎬</span>'
                    }
                    ${this.getWatchIndicator(movie.id)}
                    ${this.getProgressBar(movie.id)}
                </div>
                <div class="card-content">
                    <div class="card-title">${movie.name}</div>
                    <div class="card-subtitle">${movie.overview ? movie.overview.substring(0, 60) + '...' : 'Filme'}</div>
                    <div class="card-meta">
                        <span class="rating">⭐ ${movie.rating ? movie.rating.toFixed(1) : 'N/A'}</span>
                        <span>${movie.year}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Carregar séries com TMDB
    async loadSeriesWithTMDB(series, tmdbConfig) {
        const seriesGrid = document.getElementById('seriesGrid');
        seriesGrid.innerHTML = '<div class="loading"><div class="spinner"></div>Sincronizando séries com TMDB...</div>';
        
        try {
            const enhancedSeries = [];
            
            for (const show of series.slice(0, 15)) {
                try {
                    // Buscar no TMDB pelo nome
                    const searchUrl = `${tmdbConfig.baseUrl}/search/tv?api_key=${tmdbConfig.apiKey}&language=${tmdbConfig.language}&query=${encodeURIComponent(show.name)}`;
                    const response = await fetch(searchUrl);
                    const data = await response.json();
                    
                    if (data.results && data.results.length > 0) {
                        const tmdbSeries = data.results[0];
                        enhancedSeries.push({
                            ...show,
                            tmdbId: tmdbSeries.id,
                            poster: tmdbSeries.poster_path ? `${tmdbConfig.imageBase}${tmdbSeries.poster_path}` : null,
                            backdrop: tmdbSeries.backdrop_path ? `${tmdbConfig.imageBase}${tmdbSeries.backdrop_path}` : null,
                            overview: tmdbSeries.overview,
                            rating: tmdbSeries.vote_average,
                            firstAirDate: tmdbSeries.first_air_date,
                            year: tmdbSeries.first_air_date ? new Date(tmdbSeries.first_air_date).getFullYear() : 'N/A'
                        });
                    } else {
                        enhancedSeries.push({
                            ...show,
                            year: 'N/A',
                            rating: 0
                        });
                    }
                } catch (error) {
                    console.warn(`Erro ao buscar TMDB para ${show.name}:`, error);
                    enhancedSeries.push(show);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            this.renderSeries(enhancedSeries);
            
        } catch (error) {
            console.error('Erro ao carregar séries com TMDB:', error);
            this.loadSeriesBasic(series);
        }
    }

    // Carregar séries básico
    loadSeriesBasic(series) {
        const basicSeries = series.slice(0, 15).map(show => ({
            ...show,
            year: 'N/A',
            rating: 0
        }));
        this.renderSeries(basicSeries);
    }

    // Renderizar séries
    renderSeries(series) {
        const seriesGrid = document.getElementById('seriesGrid');
        
        if (series.length === 0) {
            seriesGrid.innerHTML = '<div class="loading"><span style="font-size: 48px;">📺</span><p>Nenhuma série encontrada</p></div>';
            return;
        }
        
        seriesGrid.innerHTML = series.map(show => `
            <div class="content-card" onclick="playContent('${show.id}', 'series')">
                <div class="card-image">
                    ${show.poster ? 
                        `<img src="${show.poster}" alt="${show.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-size:32px;">📺</div>` :
                        '<span style="font-size: 32px;">📺</span>'
                    }
                    ${this.getWatchIndicator(show.id)}
                    ${this.getProgressBar(show.id)}
                </div>
                <div class="card-content">
                    <div class="card-title">${show.name}</div>
                    <div class="card-subtitle">${show.overview ? show.overview.substring(0, 60) + '...' : 'Série'}</div>
                    <div class="card-meta">
                        <span class="rating">⭐ ${show.rating ? show.rating.toFixed(1) : 'N/A'}</span>
                        <span>${show.year}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Obter indicador de assistido
    getWatchIndicator(contentId) {
        const watchData = storageSystem.getWatchData(contentId);
        if (watchData?.watched) {
            return '<div class="watch-indicator">✓ Assistido</div>';
        }
        return '';
    }

    // Obter barra de progresso
    getProgressBar(contentId) {
        const watchData = storageSystem.getWatchData(contentId);
        if (watchData?.percentage && watchData.percentage > 5) {
            return `<div class="progress-bar" style="width: ${Math.min(watchData.percentage, 100)}%"></div>`;
        }
        return '';
    }

    // Carregar favoritos
    loadFavorites() {
        const saved = localStorage.getItem(CONFIG.storageKeys.favorites);
        if (saved) {
            this.favorites = new Set(JSON.parse(saved));
        }
    }

    // Salvar favoritos
    saveFavorites() {
        localStorage.setItem(CONFIG.storageKeys.favorites, JSON.stringify([...this.favorites]));
    }

    // Toggle favorito
    toggleFavorite(contentId) {
        if (this.favorites.has(contentId)) {
            this.favorites.delete(contentId);
            this.showNotification('Removido dos favoritos');
        } else {
            this.favorites.add(contentId);
            this.showNotification('Adicionado aos favoritos');
        }
        
        this.saveFavorites();
        
        // Atualizar UI se estiver na aba favoritos
        if (this.currentCategory === 'favoritos') {
            this.filterChannels('favoritos');
        }
        
        // Atualizar botão de favorito
        const favoriteBtn = document.querySelector(`[onclick*="${contentId}"]`)?.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.classList.toggle('active');
        }
    }

    // Toggle todas as categorias
    toggleAllCategories() {
        const container = document.getElementById('allCategoriesContainer');
        const btn = document.querySelector('.more-categories');
        const text = document.getElementById('moreCategoriesText');
        
        if (container.style.display === 'none' || !container.style.display) {
            container.style.display = 'block';
            text.textContent = 'Ver Menos';
            btn.classList.add('expanded');
        } else {
            container.style.display = 'none';
            text.textContent = 'Ver Mais';
            btn.classList.remove('expanded');
        }
    }

    // Mostrar erro
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Sistema de notificações
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3'
        };
        
        notification.style.borderLeftColor = colors[type] || colors.success;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Funções globais
function filterChannels(category) {
    app.filterChannels(category);
}

function toggleFavorite(contentId) {
    app.toggleFavorite(contentId);
}

function toggleAllCategories() {
    app.toggleAllCategories();
}

function logout() {
    authSystem.logout();
}

// Inicializar aplicação
const app = new StreamFlixApp();

// Inicializar quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    app.init();
});