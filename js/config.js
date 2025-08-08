// STREAMFLIX - CONFIGURAÇÕES
// ===========================

const CONFIG = {
    // Servidores M3U (lidos do .env em produção)
    authServers: [
        'http://bic12sk.vip',
        'http://servidor2.com',
        'http://servidor3.com',
        'http://servidor4.com',
        'http://servidor5.com'
    ],
    
    // Configurações M3U
    m3uPath: '/get.php',
    m3uParams: 'type=m3u_plus&output=ts',
    
    // TMDB por servidor (cada servidor pode ter sua própria configuração)
    tmdbConfigs: {
        'http://bic12sk.vip': {
            enabled: true,
            apiKey: '3fd2be6f0c70a2a598f084ddfb75487c',
            baseUrl: 'https://api.themoviedb.org/3',
            imageBase: 'https://image.tmdb.org/t/p/w300',
            language: 'pt-BR'
        },
        'http://servidor2.com': {
            enabled: true,
            apiKey: 'sua_chave_tmdb_2',
            baseUrl: 'https://api.themoviedb.org/3',
            imageBase: 'https://image.tmdb.org/t/p/w300',
            language: 'pt-BR'
        },
        'http://servidor3.com': {
            enabled: false // Servidor sem TMDB
        }
    },
    
    // Configurações de timeout e retry
    apiTimeout: 10000,
    maxRetries: 3,
    retryDelay: 2000,
    
    // Configurações do player
    autoPlayNext: true,
    autoPlayCountdown: 10,
    saveProgressInterval: 5,
    
    // Cache
    m3uRefreshInterval: 3600000, // 1 hora
    m3uCacheKey: 'streamflix_m3u_cache',
    
    // Armazenamento
    storageKeys: {
        user: 'streamflix_user',
        watched: 'streamflix_watched',
        favorites: 'streamflix_favorites',
        rememberLogin: 'streamflix_remember',
        currentServer: 'streamflix_server'
    }
};

// Função para obter configuração TMDB do servidor atual
function getTMDBConfig(serverUrl) {
    const config = CONFIG.tmdbConfigs[serverUrl];
    return config && config.enabled ? config : null;
}

// Função para construir URL do M3U
function buildM3UUrl(serverUrl, username, password) {
    const url = new URL(CONFIG.m3uPath, serverUrl);
    url.searchParams.set('username', username);
    url.searchParams.set('password', password);
    
    // Adicionar parâmetros do M3U
    const params = new URLSearchParams(CONFIG.m3uParams);
    for (const [key, value] of params) {
        url.searchParams.set(key, value);
    }
    
    return url.toString();
}

// Função para validar servidor
async function validateServer(serverUrl) {
    try {
        const response = await fetch(serverUrl, {
            method: 'HEAD',
            mode: 'no-cors',
            timeout: 5000
        });
        return true;
    } catch (error) {
        console.warn(`Servidor ${serverUrl} não respondeu:`, error);
        return false;
    }
}

// Export da configuração
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}