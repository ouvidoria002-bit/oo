# Guia: Como Gerar o APK do Tarifa Zero 📱

Como o ambiente do servidor é focado em hospedagem web e não possui as ferramentas de desenvolvimento Android (Java/SDK), você pode gerar o seu APK de duas formas muito simples:

## Opção 1: Geração Instantânea (Recomendado) 🚀
Use o **PWABuilder** (ferramenta oficial da Microsoft para transformar sites em apps).
1. Acesse: [pwabuilder.com](https://www.pwabuilder.com/)
2. Cole a URL: `http://ogm.duquedecaxias.rj.gov.br:8059/tarifazero/`
3. **Se der erro 400/Bad Request**:
   - É provável que o PWABuilder não consiga "enxergar" o servidor por causa do porto `8059` ou por ser `http` (não seguro).
   - **Solução**: Use a opção **"Upload Manifest"** manualmente no site se ele permitir, ou tente a Opção 2 abaixo.
4. Se funcionar, clique em **Package for Stores**, selecione **Android** e baixe o `.apk`.

## Opção 2: Build Nativo com Capacitor (Para Desenvolvedores) 🛠️
Se você tiver o **Android Studio** instalado no seu computador pessoal:
1. Baixe o código do projeto `TZ-APP`.
2. No seu computador, rode:
   ```bash
   npm install
   npm run build
   npx cap add android
   npx cap copy
   npx cap open android
   ```
3. O Android Studio vai abrir o projeto. Vá em **Build > Build APK(s)**.

## Opção 3: Bubblewrap (Google CLI) - MAIS GARANTIDO 🛡️
Se o PWABuilder continuar dando erro 400, use o **Bubblewrap** via `npx` (não precisa instalar nada fixo):
1. Abra o terminal na pasta do projeto.
2. Rode o comando de inicialização:
   ```bash
   npx @bubblewrap/cli init --manifest http://ogm.duquedecaxias.rj.gov.br:8059/tarifazero/manifest.json
   ```
3. O `npx` vai baixar e rodar o Bubblewrap automaticamente. Siga os passos na tela (ele vai pedir local do Java/SDK, se você não tiver, ele tenta baixar para você).

---

### Dica: O PWA já funciona como App!
Lembre que qualquer pessoa que acessar o link pelo Chrome (Android) ou Safari (iPhone) verá a opção **"Instalar Aplicativo"** ou **"Adicionar à Tela de Início"**. Isso instala o app instantaneamente sem precisar baixar um arquivo `.apk` pesado.
