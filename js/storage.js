// STREAMFLIX - SISTEMA DE ARMAZENAMENTO
// =====================================

class StorageSystem {
    constructor() {
        this.watchedContent = {};
        this.loadWatchedContent();
    }

    // Carregar dados assistidos
    loadWatchedContent() {
        const saved = localStorage.getItem(CONFIG.storageKeys.watched);
        if (saved) {
            try {
                this.watchedContent = JSON.parse(saved);
            } catch (error) {
                console.error('Erro ao carregar dados assistidos:', error);
                this.watchedContent = {};
            }
        }
    }

    // Salvar dados assistidos
    saveWatchedContent() {
        try {
            localStorage.setItem(CONFIG.storageKeys.watched, JSON.stringify(this.watchedContent));
        } catch (error) {
            console.error('Erro ao salvar dados assistidos:', error);
        }
    }

    // Salvar progresso do vídeo
    saveWatchProgress(contentId, progress, duration, additionalData = {}) {
        if (!contentId || !duration) return;

        const percentage = (progress / duration) * 100;
        
        // Salvar progresso apenas se passou de 5% e não chegou em 95%
        if (percentage > 5 && percentage < 95) {
            if (!this.watchedContent[contentId]) {
                this.watchedContent[contentId] = {};
            }
            
            this.watchedContent[contentId] = {
                ...this.watchedContent[contentId],
                progress,
                duration,
                percentage,
                lastWatched: new Date().toISOString(),
                ...additionalData
            };
            
            this.saveWatchedContent();
        }
    }

    // Marcar como assistido
    markAsWatched(contentId, type, additionalData = {}) {
        if (!this.watchedContent[contentId]) {
            this.watchedContent[contentId] = {};
        }
        
        this.watchedContent[contentId] = {
            ...this.watchedContent[contentId],
            watched: true,
            watchedAt: new Date().toISOString(),
            type,
            ...additionalData
        };
        
        this.saveWatchedContent();
    }

    // Obter dados de visualização
    getWatchData(contentId) {
        return this.watchedContent[contentId] || null;
    }

    // Remover dados de visualização
    removeWatchData(contentId) {
        if (this.watchedContent[contentId]) {
            delete this.watchedContent[contentId];
            this.saveWatchedContent();
        }
    }

    // Obter todo o histórico de visualização
    getAllWatchData() {
        return { ...this.watchedContent };
    }

    // Limpar todos os dados de visualização
    clearAllWatchData() {
        this.watchedContent = {};
        localStorage.removeItem(CONFIG.storageKeys.watched);
    }

    // Exportar dados
    exportData() {
        return {
            watched: this.getAllWatchData(),
            favorites: JSON.parse(localStorage.getItem(CONFIG.storageKeys.favorites) || '[]'),
            exportDate: new Date().toISOString()
        };
    }

    // Importar dados
    importData(data) {
        try {
            if (data.watched) {
                this.watchedContent = data.watched;
                this.saveWatchedContent();
            }
            
            if (data.favorites) {
                localStorage.setItem(CONFIG.storageKeys.favorites, JSON.stringify(data.favorites));
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            return false;
        }
    }
}

// Instância global do sistema de armazenamento
const storageSystem = new StorageSystem();