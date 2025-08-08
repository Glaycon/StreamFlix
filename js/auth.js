// STREAMFLIX - SISTEMA DE AUTENTICAÇÃO
// =====================================

class AuthSystem {
    constructor() {
        this.currentServer = null;
        this.userData = null;
        this.m3uData = null;
    }

    // Verificar se usuário está logado
    checkAuthStatus() {
        const savedUser = localStorage.getItem(CONFIG.storageKeys.user);
        const rememberLogin = localStorage.getItem(CONFIG.storageKeys.rememberLogin);
        
        if (savedUser && rememberLogin === 'true') {
            this.userData = JSON.parse(savedUser);
            this.currentServer = localStorage.getItem(CONFIG.storageKeys.currentServer);
            return true;
        }
        
        return false;
    }

    // Fazer login testando servidores
    async login(username, password, rememberLogin = false) {
        const loginBtn = document.getElementById('loginButton');
        const loginBtnText = document.getElementById('loginBtnText');
        const loginSpinner = document.getElementById('loginSpinner');
        const errorMessage = document.getElementById('errorMessage');
        
        // Reset UI
        errorMessage.style.display = 'none';
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        loginSpinner.style.display = 'block';
        loginBtnText.textContent = 'Verificando servidores...';
        
        try {
            // Testar cada servidor até encontrar um que funcione
            for (let i = 0; i < CONFIG.authServers.length; i++) {
                const server = CONFIG.authServers[i];
                
                loginBtnText.textContent = `Testando servidor ${i + 1}/${CONFIG.authServers.length}...`;
                
                try {
                    const result = await this.testServerAuth(server, username, password);
                    
                    if (result.success) {
                        // Servidor funcionou!
                        this.currentServer = server;
                        this.userData = {
                            username,
                            password,
                            server,
                            loginTime: new Date().toISOString()
                        };
                        this.m3uData = result.m3uData;
                        
                        // Salvar dados se solicitado
                        if (rememberLogin) {
                            localStorage.setItem(CONFIG.storageKeys.user, JSON.stringify(this.userData));
                            localStorage.setItem(CONFIG.storageKeys.currentServer, server);
                            localStorage.setItem(CONFIG.storageKeys.rememberLogin, 'true');
                        }
                        
                        loginBtnText.textContent = 'Login realizado!';
                        
                        // Delay para mostrar sucesso
                        setTimeout(() => {
                            this.showMainApp();
                        }, 1000);
                        
                        return { success: true, server };
                    }
                } catch (error) {
                    console.warn(`Erro no servidor ${server}:`, error);
                    continue;
                }
            }
            
            // Nenhum servidor funcionou
            throw new Error('Usuário ou senha inválidos, ou todos os servidores estão offline');
            
        } catch (error) {
            console.error('Erro no login:', error);
            
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
            
            return { success: false, error: error.message };
            
        } finally {
            // Reset UI
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
            loginSpinner.style.display = 'none';
            loginBtnText.textContent = 'Entrar';
        }
    }

    // Testar autenticação em um servidor específico
    async testServerAuth(server, username, password) {
        const m3uUrl = buildM3UUrl(server, username, password);
        
        // Fazer requisição para o M3U
        const response = await fetch(m3uUrl, {
            method: 'GET',
            timeout: CONFIG.apiTimeout,
            headers: {
                'User-Agent': 'StreamFlix/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const m3uContent = await response.text();
        
        // Verificar se o conteúdo é um M3U válido
        if (!m3uContent.includes('#EXTM3U')) {
            throw new Error('Resposta inválida do servidor - não é um arquivo M3U válido');
        }
        
        // Verificar se não é uma página de erro
        if (m3uContent.toLowerCase().includes('unauthorized') || 
            m3uContent.toLowerCase().includes('invalid') ||
            m3uContent.toLowerCase().includes('error')) {
            throw new Error('Credenciais inválidas');
        }
        
        // Parsear M3U
        const parsedData = this.parseM3U(m3uContent);
        
        return {
            success: true,
            m3uData: parsedData,
            rawM3U: m3uContent
        };
    }

    // Parser básico de M3U
    parseM3U(m3uContent) {
        const lines = m3uContent.split('\n');
        const channels = [];
        const movies = [];
        const series = [];
        
        let currentItem = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                // Extrair informações do canal/conteúdo
                const match = line.match(/#EXTINF:(-?\d+)(?:\s+tvg-id="([^"]*)")?(?:\s+tvg-name="([^"]*)")?(?:\s+tvg-logo="([^"]*)")?(?:\s+group-title="([^"]*)")?[^,]*,(.*)$/);
                
                if (match) {
                    currentItem = {
                        duration: match[1],
                        tvgId: match[2] || '',
                        tvgName: match[3] || '',
                        logo: match[4] || '',
                        category: match[5] || 'Sem categoria',
                        name: match[6] || '',
                        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    };
                }
            } else if (line.startsWith('http') && currentItem) {
                // URL do stream
                currentItem.url = line;
                
                // Categorizar o conteúdo
                const category = currentItem.category.toLowerCase();
                const name = currentItem.name.toLowerCase();
                
                if (category.includes('movie') || category.includes('filme') || 
                    name.includes('movie') || category.includes('cinema')) {
                    movies.push({ ...currentItem, type: 'movie' });
                } else if (category.includes('series') || category.includes('série') || 
                          category.includes('tv show') || name.includes('season') || 
                          name.includes('temporada')) {
                    series.push({ ...currentItem, type: 'series' });
                } else {
                    channels.push({ ...currentItem, type: 'channel' });
                }
                
                currentItem = null;
            }
        }
        
        return {
            channels: this.categorizeChannels(channels),
            movies,
            series: this.organizeSeries(series),
            totalItems: channels.length + movies.length + series.length
        };
    }

    // Categorizar canais por grupo
    categorizeChannels(channels) {
        const categorized = {
            all: channels,
            favoritos: [],
            nacional: [],
            internacional: [],
            esportes: [],
            filmes: [],
            infantil: [],
            noticias: [],
            documentarios: [],
            musica: [],
            religioso: [],
            adulto: [],
            premium: []
        };
        
        channels.forEach(channel => {
            const category = channel.category.toLowerCase();
            const name = channel.name.toLowerCase();
            
            // Classificar por categoria
            if (category.includes('brasil') || category.includes('nacional') || 
                name.includes('globo') || name.includes('sbt') || name.includes('record')) {
                categorized.nacional.push(channel);
            } else if (category.includes('sport') || category.includes('esporte') || 
                      name.includes('sport') || category.includes('futebol')) {
                categorized.esportes.push(channel);
            } else if (category.includes('movie') || category.includes('filme') || 
                      category.includes('cinema')) {
                categorized.filmes.push(channel);
            } else if (category.includes('kid') || category.includes('infantil') || 
                      category.includes('cartoon') || name.includes('disney')) {
                categorized.infantil.push(channel);
            } else if (category.includes('news') || category.includes('noticia') || 
                      category.includes('jornalismo')) {
                categorized.noticias.push(channel);
            } else if (category.includes('documentary') || category.includes('documentario') || 
                      category.includes('discovery') || category.includes('history')) {
                categorized.documentarios.push(channel);
            } else if (category.includes('music') || category.includes('musica') || 
                      category.includes('mtv') || category.includes('multishow')) {
                categorized.musica.push(channel);
            } else if (category.includes('religioso') || category.includes('gospel') || 
                      category.includes('igreja') || category.includes('religious')) {
                categorized.religioso.push(channel);
            } else if (category.includes('adult') || category.includes('+18') || 
                      category.includes('adulto') || category.includes('xxx')) {
                categorized.adulto.push(channel);
            } else if (category.includes('premium') || category.includes('hbo') || 
                      category.includes('netflix') || category.includes('amazon')) {
                categorized.premium.push(channel);
            } else {
                categorized.internacional.push(channel);
            }
        });
        
        return categorized;
    }

    // Organizar séries por temporadas
    organizeSeries(seriesArray) {
        const organized = {};
        
        seriesArray.forEach(item => {
            // Tentar extrair nome da série e episódio
            const name = item.name;
            const match = name.match(/^(.+?)(?:\s+[Ss](\d+)[Ee](\d+)|\s+(\d+)x(\d+))/);
            
            if (match) {
                const seriesName = match[1].trim();
                const season = parseInt(match[2] || match[4] || 1);
                const episode = parseInt(match[3] || match[5] || 1);
                
                if (!organized[seriesName]) {
                    organized[seriesName] = {
                        id: `series_${seriesName.replace(/\s+/g, '_').toLowerCase()}`,
                        name: seriesName,
                        seasons: {}
                    };
                }
                
                if (!organized[seriesName].seasons[season]) {
                    organized[seriesName].seasons[season] = {
                        season,
                        episodes: []
                    };
                }
                
                organized[seriesName].seasons[season].episodes.push({
                    episode,
                    title: name,
                    url: item.url,
                    ...item
                });
            } else {
                // Série sem padrão reconhecível
                const seriesName = name;
                if (!organized[seriesName]) {
                    organized[seriesName] = {
                        id: `series_${seriesName.replace(/\s+/g, '_').toLowerCase()}`,
                        name: seriesName,
                        seasons: {
                            1: {
                                season: 1,
                                episodes: []
                            }
                        }
                    };
                }
                
                organized[seriesName].seasons[1].episodes.push({
                    episode: organized[seriesName].seasons[1].episodes.length + 1,
                    title: name,
                    url: item.url,
                    ...item
                });
            }
        });
        
        return Object.values(organized);
    }

    // Mostrar app principal
    showMainApp() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('currentUser').textContent = this.userData.username;
        
        // Disparar evento de login bem-sucedido
        window.dispatchEvent(new CustomEvent('userLoggedIn', {
            detail: {
                user: this.userData,
                server: this.currentServer,
                m3uData: this.m3uData
            }
        }));
    }

    // Logout
    logout() {
        // Limpar dados
        this.userData = null;
        this.currentServer = null;
        this.m3uData = null;
        
        // Limpar localStorage apenas se não for para lembrar
        const rememberLogin = localStorage.getItem(CONFIG.storageKeys.rememberLogin);
        if (rememberLogin !== 'true') {
            localStorage.removeItem(CONFIG.storageKeys.user);
            localStorage.removeItem(CONFIG.storageKeys.currentServer);
        }
        localStorage.removeItem(CONFIG.storageKeys.rememberLogin);
        
        // Voltar para login
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        
        // Limpar formulário
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('rememberLogin').checked = false;
    }

    // Obter dados do usuário atual
    getCurrentUser() {
        return this.userData;
    }

    // Obter servidor atual
    getCurrentServer() {
        return this.currentServer;
    }

    // Obter dados M3U
    getM3UData() {
        return this.m3uData;
    }
}

// Instância global do sistema de autenticação
const authSystem = new AuthSystem();