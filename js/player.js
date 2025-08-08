// STREAMFLIX - SISTEMA DO PLAYER
// ===============================

class VideoPlayer {
    constructor() {
        this.currentlyPlaying = null;
        this.nextEpisodeTimer = null;
        this.progressSaveInterval = null;
        this.setupPlayer();
    }

    // Configurar player
    setupPlayer() {
        const videoPlayer = document.getElementById('videoPlayer');
        
        // Event listeners do vídeo
        videoPlayer.addEventListener('loadstart', () => this.updatePlayerStatus('Carregando...'));
        videoPlayer.addEventListener('loadeddata', () => this.updatePlayerStatus('Conectado'));
        videoPlayer.addEventListener('error', () => this.handleVideoError());
        videoPlayer.addEventListener('waiting', () => this.updatePlayerStatus('Buffering...'));
        videoPlayer.addEventListener('playing', () => this.updatePlayerStatus('Reproduzindo'));
        videoPlayer.addEventListener('ended', () => this.handleVideoEnd());
        videoPlayer.addEventListener('timeupdate', () => this.handleTimeUpdate());
        
        // Teclas do teclado
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    // Reproduzir conteúdo
    playContent(contentId, type) {
        let content = this.findContent(contentId, type);
        
        if (!content) {
            app.showNotification('Conteúdo não encontrado!', 'error');
            return;
        }

        // Para séries, determinar episódio atual
        if (type === 'series') {
            content = this.prepareSeries(content, contentId);
        }

        this.currentlyPlaying = { ...content, type, contentId };
        this.openPlayer(content);
    }

    // Encontrar conteúdo pelos dados M3U
    findContent(contentId, type) {
        const m3uData = authSystem.getM3UData();
        if (!m3uData) return null;

        switch(type) {
            case 'channel':
                return this.findInChannels(m3uData.channels, contentId);
            case 'movie':
                return m3uData.movies.find(m => m.id === contentId);
            case 'series':
                return m3uData.series.find(s => s.id === contentId);
            default:
                return null;
        }
    }

    // Encontrar canal em todas as categorias
    findInChannels(channelsData, contentId) {
        for (const category in channelsData) {
            const channel = channelsData[category].find(c => c.id === contentId);
            if (channel) return channel;
        }
        return null;
    }

    // Preparar série para reprodução
    prepareSeries(series, contentId) {
        const watchData = storageSystem.getWatchData(contentId);
        const currentSeason = watchData?.season || 1;
        const currentEpisode = watchData?.episode || 1;
        
        const seasonData = series.seasons[currentSeason];
        const episodeData = seasonData?.episodes?.find(e => e.episode === currentEpisode);
        
        if (!episodeData) {
            // Fallback para primeiro episódio da primeira temporada
            const firstSeason = Object.values(series.seasons)[0];
            const firstEpisode = firstSeason?.episodes?.[0];
            
            return {
                ...series,
                currentSeason: firstSeason?.season || 1,
                currentEpisode: firstEpisode?.episode || 1,
                currentEpisodeData: firstEpisode,
                url: firstEpisode?.url
            };
        }
        
        return {
            ...series,
            currentSeason,
            currentEpisode,
            currentEpisodeData: episodeData,
            url: episodeData.url
        };
    }

    // Abrir player modal
    openPlayer(content) {
        const videoPlayer = document.getElementById('videoPlayer');
        const playerModal = document.getElementById('playerModal');
        const playerTitle = document.getElementById('playerTitle');
        
        // Configurar vídeo
        videoPlayer.src = content.url;
        playerTitle.textContent = content.name;
        
        // Configurar informações específicas do tipo
        if (content.type === 'series') {
            this.setupEpisodeInfo(content);
        } else {
            document.getElementById('episodeInfo').style.display = 'none';
        }
        
        // Restaurar posição se existir
        this.restoreVideoPosition(content.contentId);
        
        // Mostrar modal
        playerModal.style.display = 'flex';
        
        // Iniciar salvamento de progresso
        this.startProgressSaving();
        
        app.showNotification(`Reproduzindo: ${content.name}`);
    }

    // Configurar informações do episódio
    setupEpisodeInfo(series) {
        const episodeInfo = document.getElementById('episodeInfo');
        const episodeTitle = document.getElementById('episodeTitle');
        const episodeDescription = document.getElementById('episodeDescription');
        
        episodeTitle.textContent = `T${series.currentSeason}E${series.currentEpisode} - ${series.currentEpisodeData.title}`;
        episodeDescription.textContent = series.overview || series.currentEpisodeData.name;
        episodeInfo.style.display = 'block';
    }

    // Restaurar posição do vídeo
    restoreVideoPosition(contentId) {
        const watchData = storageSystem.getWatchData(contentId);
        if (watchData?.progress) {
            const videoPlayer = document.getElementById('videoPlayer');
            videoPlayer.addEventListener('loadedmetadata', function onLoaded() {
                if (watchData.progress < videoPlayer.duration * 0.95) { // Não restaurar se quase no fim
                    videoPlayer.currentTime = watchData.progress;
                }
                videoPlayer.removeEventListener('loadedmetadata', onLoaded);
            });
        }
    }

    // Iniciar salvamento automático de progresso
    startProgressSaving() {
        if (this.progressSaveInterval) {
            clearInterval(this.progressSaveInterval);
        }
        
        this.progressSaveInterval = setInterval(() => {
            this.saveCurrentProgress();
        }, CONFIG.saveProgressInterval * 1000);
    }

    // Parar salvamento de progresso
    stopProgressSaving() {
        if (this.progressSaveInterval) {
            clearInterval(this.progressSaveInterval);
            this.progressSaveInterval = null;
        }
    }

    // Salvar progresso atual
    saveCurrentProgress() {
        const videoPlayer = document.getElementById('videoPlayer');
        const current = this.currentlyPlaying;
        
        if (!current || !videoPlayer.duration || videoPlayer.paused) return;
        
        const additionalData = {};
        if (current.type === 'series') {
            additionalData.season = current.currentSeason;
            additionalData.episode = current.currentEpisode;
        }
        
        storageSystem.saveWatchProgress(
            current.contentId,
            videoPlayer.currentTime,
            videoPlayer.duration,
            additionalData
        );
    }

    // Manipular atualização de tempo
    handleTimeUpdate() {
        // Salvar progresso periodicamente
        const videoPlayer = document.getElementById('videoPlayer');
        const current = this.currentlyPlaying;
        
        if (!current || !videoPlayer.duration) return;
        
        // Salvar a cada 30 segundos durante reprodução
        const currentTime = Math.floor(videoPlayer.currentTime);
        if (currentTime % 30 === 0 && currentTime > 0) {
            this.saveCurrentProgress();
        }
    }

    // Manipular fim do vídeo
    handleVideoEnd() {
        const current = this.currentlyPlaying;
        if (!current) return;
        
        // Marcar como assistido
        const additionalData = {};
        if (current.type === 'series') {
            additionalData.season = current.currentSeason;
            additionalData.episode = current.currentEpisode;
        }
        
        storageSystem.markAsWatched(current.contentId, current.type, additionalData);
        
        // Auto-play próximo episódio para séries
        if (current.type === 'series' && CONFIG.autoPlayNext) {
            this.playNextEpisode();
        } else {
            app.showNotification('Reprodução finalizada!');
        }
    }

    // Reproduzir próximo episódio
    playNextEpisode() {
        const current = this.currentlyPlaying;
        if (!current || current.type !== 'series') return;
        
        const nextEpisode = this.findNextEpisode(current);
        
        if (nextEpisode) {
            this.startNextEpisodeCountdown(nextEpisode);
        } else {
            app.showNotification('Fim da série!');
        }
    }

    // Encontrar próximo episódio
    findNextEpisode(current) {
        const currentSeasonData = current.seasons[current.currentSeason];
        
        // Próximo episódio na mesma temporada
        const nextEpisodeInSeason = currentSeasonData?.episodes?.find(e => e.episode === current.currentEpisode + 1);
        if (nextEpisodeInSeason) {
            return {
                ...current,
                currentEpisode: current.currentEpisode + 1,
                currentEpisodeData: nextEpisodeInSeason,
                url: nextEpisodeInSeason.url
            };
        }
        
        // Primeiro episódio da próxima temporada
        const nextSeasonData = current.seasons[current.currentSeason + 1];
        if (nextSeasonData?.episodes?.length > 0) {
            const firstEpisodeNextSeason = nextSeasonData.episodes[0];
            return {
                ...current,
                currentSeason: current.currentSeason + 1,
                currentEpisode: 1,
                currentEpisodeData: firstEpisodeNextSeason,
                url: firstEpisodeNextSeason.url
            };
        }
        
        return null;
    }

    // Iniciar countdown para próximo episódio
    startNextEpisodeCountdown(nextEpisode) {
        const nextEpisodeTimer = document.getElementById('nextEpisodeTimer');
        let countdown = CONFIG.autoPlayCountdown;
        
        nextEpisodeTimer.style.display = 'block';
        
        const updateCountdown = () => {
            nextEpisodeTimer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                    <span>Próximo episódio em ${countdown}s</span>
                    <button onclick="videoPlayer.cancelAutoPlay()" 
                            style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); 
                                   padding: 4px 8px; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;">
                        Cancelar
                    </button>
                </div>
            `;
            
            if (countdown <= 0) {
                this.switchToNextEpisode(nextEpisode);
                nextEpisodeTimer.style.display = 'none';
                return;
            }
            
            countdown--;
            this.nextEpisodeTimer = setTimeout(updateCountdown, 1000);
        };
        
        updateCountdown();
    }

    // Trocar para próximo episódio
    switchToNextEpisode(nextEpisode) {
        this.currentlyPlaying = nextEpisode;
        
        const videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.src = nextEpisode.url;
        
        this.setupEpisodeInfo(nextEpisode);
        app.showNotification(`T${nextEpisode.currentSeason}E${nextEpisode.currentEpisode} - ${nextEpisode.currentEpisodeData.title}`);
    }

    // Cancelar auto-play
    cancelAutoPlay() {
        if (this.nextEpisodeTimer) {
            clearTimeout(this.nextEpisodeTimer);
            this.nextEpisodeTimer = null;
        }
        document.getElementById('nextEpisodeTimer').style.display = 'none';
        app.showNotification('Auto-play cancelado');
    }

    // Fechar player
    closePlayer() {
        const playerModal = document.getElementById('playerModal');
        const videoPlayer = document.getElementById('videoPlayer');
        
        // Salvar progresso final
        this.saveCurrentProgress();
        
        // Parar vídeo e limpar
        videoPlayer.pause();
        videoPlayer.src = '';
        playerModal.style.display = 'none';
        
        // Limpar timers
        if (this.nextEpisodeTimer) {
            clearTimeout(this.nextEpisodeTimer);
            this.nextEpisodeTimer = null;
        }
        
        this.stopProgressSaving();
        this.currentlyPlaying = null;
    }

    // Toggle tela cheia
    toggleFullscreen() {
        const videoPlayer = document.getElementById('videoPlayer');
        
        if (!document.fullscreenElement) {
            videoPlayer.requestFullscreen().catch(err => {
                console.error('Erro ao entrar em tela cheia:', err);
                app.showNotification('Erro ao ativar tela cheia', 'error');
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.error('Erro ao sair da tela cheia:', err);
            });
        }
    }

    // Manipular erro de vídeo
    handleVideoError() {
        const videoPlayer = document.getElementById('videoPlayer');
        const error = videoPlayer.error;
        
        let errorMessage = 'Erro ao carregar vídeo';
        
        if (error) {
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    errorMessage = 'Reprodução abortada';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    errorMessage = 'Erro de rede';
                    break;
                case error.MEDIA_ERR_DECODE:
                    errorMessage = 'Erro ao decodificar vídeo';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = 'Formato não suportado';
                    break;
                default:
                    errorMessage = 'Erro desconhecido';
            }
        }
        
        app.showNotification(errorMessage, 'error');
        this.updatePlayerStatus('Erro na conexão');
    }

    // Atualizar status do player
    updatePlayerStatus(status) {
        // Aqui você pode adicionar um indicador de status se necessário
        console.log('Player status:', status);
    }

    // Manipular teclas do teclado
    handleKeydown(e) {
        // Só processar teclas se o player estiver aberto
        const playerModal = document.getElementById('playerModal');
        if (playerModal.style.display !== 'flex') return;
        
        const videoPlayer = document.getElementById('videoPlayer');
        
        switch(e.code) {
            case 'Escape':
                this.closePlayer();
                e.preventDefault();
                break;
            case 'Space':
                if (videoPlayer.paused) {
                    videoPlayer.play();
                } else {
                    videoPlayer.pause();
                }
                e.preventDefault();
                break;
            case 'KeyF':
                this.toggleFullscreen();
                e.preventDefault();
                break;
            case 'ArrowLeft':
                videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
                e.preventDefault();
                break;
            case 'ArrowRight':
                videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
                e.preventDefault();
                break;
            case 'ArrowUp':
                videoPlayer.volume = Math.min(1, videoPlayer.volume + 0.1);
                e.preventDefault();
                break;
            case 'ArrowDown':
                videoPlayer.volume = Math.max(0, videoPlayer.volume - 0.1);
                e.preventDefault();
                break;
        }
    }

    // Obter player atual
    getCurrentlyPlaying() {
        return this.currentlyPlaying;
    }
}

// Instância global do player
const videoPlayer = new VideoPlayer();

// Funções globais para compatibilidade
function playContent(contentId, type) {
    videoPlayer.playContent(contentId, type);
}

function closePlayer() {
    videoPlayer.closePlayer();
}

function toggleFullscreen() {
    videoPlayer.toggleFullscreen();
}