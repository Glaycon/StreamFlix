# 🎬 StreamFlix - IPTV Player Moderno

Um player IPTV completo e moderno com integração TMDB, sistema de favoritos e reprodução automática de episódios.

## 📋 Recursos Principais

### 🔐 **Sistema de Autenticação**
- Login com múltiplos servidores M3U
- Teste automático de 5 DNS configuráveis
- Opção "Salvar login" para conveniência
- Sessões persistentes no navegador
- Validação automática de credenciais

### 📺 **Reprodução de Conteúdo**
- **Canais ao Vivo**: Organizados por categorias
- **Filmes**: Sincronizados com TMDB (capas, sinopses, avaliações)
- **Séries**: Auto-play de episódios com countdown
- **Player Avançado**: Controles personalizados e tela cheia

### 🎯 **Funcionalidades Avançadas**
- **Sistema de Favoritos**: Marque seus canais preferidos
- **Histórico de Visualização**: Continue de onde parou
- **Categorias Inteligentes**: Classificação automática de conteúdo
- **Progresso Visual**: Barras de progresso nos cards
- **Interface Responsiva**: Funciona em desktop e mobile

## 📁 Estrutura de Arquivos

```
streamflix/
├── .env                    # Configurações do servidor
├── index.html             # Página principal
├── README.md              # Esta documentação
├── css/
│   ├── style.css          # Estilos principais
│   ├── login.css          # Estilos da tela de login
│   └── player.css         # Estilos do player de vídeo
├── js/
│   ├── config.js          # Configurações e constantes
│   ├── auth.js            # Sistema de autenticação
│   ├── app.js             # Aplicação principal
│   ├── player.js          # Sistema do player de vídeo
│   └── storage.js         # Sistema de armazenamento local
└── assets/
    └── icons/             # Ícones e imagens
```

## ⚙️ Configuração

### 1. **Configurar o arquivo .env**

Edite o arquivo `.env` com suas configurações:

```bash
# SERVIDORES M3U (configure até 5)
AUTH_SERVER_1=http://seuservidor1.com
AUTH_SERVER_2=http://seuservidor2.com
AUTH_SERVER_3=http://seuservidor3.com
AUTH_SERVER_4=http://seuservidor4.com  
AUTH_SERVER_5=http://seuservidor5.com

# TMDB API KEY (opcional - para metadados)
TMDB_API_KEY=sua_chave_tmdb_aqui
```

### 2. **Configurar TMDB por Servidor**

No arquivo `js/config.js`, configure o TMDB para cada servidor:

```javascript
tmdbConfigs: {
    'http://seuservidor1.com': {
        enabled: true,
        apiKey: 'sua_chave_tmdb',
        language: 'pt-BR'
    },
    'http://seuservidor2.com': {
        enabled: false  // Servidor sem TMDB
    }
}
```

### 3. **Deploy**

1. Faça upload de todos os arquivos para seu servidor web
2. Certifique-se que o servidor suporta HTTPS (recomendado)
3. Configure CORS se necessário para requisições M3U
4. Teste a conectividade com seus servidores IPTV

## 🚀 Como Usar

### **Login**
1. Digite seu usuário e senha IPTV
2. Marque "Salvar login" se desejar (opcional)
3. Clique em "Entrar" - o sistema testará os servidores automaticamente

### **Navegação**
- **Canais**: Organizados em categorias (Nacional, Esportes, etc.)
- **Filmes**: Com capas e informações do TMDB
- **Séries**: Episódios organizados por temporada
- **Favoritos**: Acesso rápido aos seus conteúdos preferidos

### **Reprodução**
- Clique em qualquer conteúdo para reproduzir
- Use controles do teclado:
  - `Espaço/K`: Play/Pause
  - `F`: Tela cheia
  - `Setas`: Navegar/Volume
  - `M`: Mudo
  - `ESC`: Fechar player

### **Séries**
- Auto-play automático com countdown de 10s
- Continue de onde parou automaticamente
- Botão "Cancelar" para interromper auto-play

## 🔧 Personalização

### **Categorias de Canais**
Edite `js/auth.js` na função `categorizeChannels()` para personalizar as categorias automáticas.

### **Cores e Tema**
Modifique as variáveis CSS em `css/style.css`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### **Configurações do Player**
Ajuste em `js/config.js`:
```javascript
autoPlayNext: true,           // Auto-play próximo episódio
autoPlayCountdown: 10,        // Segundos para countdown
saveProgressInterval: 5       // Intervalo para salvar progresso
```

## 🔒 Segurança

- ✅ Credenciais armazenadas localmente (criptografadas)
- ✅ Sessões com timeout configurável  
- ✅ Validação de URLs M3U
- ✅ Sanitização de dados de entrada
- ✅ HTTPS recomendado para produção

## 📱 Compatibilidade

### **Navegadores Suportados**
- ✅ Chrome 70+
- ✅ Firefox 65+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Mobile (iOS Safari, Android Chrome)

### **Formatos de Vídeo**
- ✅ M3U8 (HLS)
- ✅ MP4
- ✅ WebM
- ✅ Streams HTTP/HTTPS

## 🐛 Solução de Problemas

### **Login não funciona**
1. Verifique se as URLs dos servidores estão corretas no `.env`
2. Teste as credenciais em outro player IPTV
3. Verifique conexão com a internet
4. Confirme que não há bloqueio de CORS

### **Conteúdo não carrega**
1. Verifique se o arquivo M3U é válido
2. Confirme que as URLs dos streams estão funcionando
3. Teste com diferentes servidores configurados

### **TMDB não funciona**
1. Verifique se a API key do TMDB está correta
2. Confirme que a API key tem permissões adequadas
3. Verifique limite de requisições da API

### **Player não reproduz**
1. Verifique se o navegador suporta o formato do vídeo
2. Teste com diferentes streams
3. Confirme que não há bloqueios de mídia no navegador

## 📊 Monitoramento

O sistema inclui logs detalhados no console do navegador para debugging:
- Autenticação e testes de servidor
- Carregamento de conteúdo M3U
- Requisições TMDB
- Erros de reprodução

## 🔄 Atualizações Futuras

### **Planejado**
- [ ] EPG (Guia de programação)
- [ ] Gravação de programas
- [ ] Chromecast/AirPlay
- [ ] Modo offline
- [ ] Múltiplos perfis de usuário
- [ ] Estatísticas de uso
- [ ] Integração com Trakt.tv

## 👥 Contribuição

Para contribuir com o projeto:
1. Fork o repositório
2. Crie sua feature branch
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

## 📞 Suporte

Para suporte técnico:
- Abra uma issue no GitHub
- Verifique a documentação completa
- Consulte os logs do navegador para debugging

---

**StreamFlix v1.0** - Player IPTV Moderno e Completo