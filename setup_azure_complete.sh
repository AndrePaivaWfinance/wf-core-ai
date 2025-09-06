#!/bin/bash
# ================================================
# SETUP COMPLETO - MESH PLATFORM NO AZURE
# ================================================

set -e

echo "🚀 MESH Platform - Setup Completo para Azure"
echo "============================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar pré-requisitos
check_prerequisites() {
    log_info "Verificando pré-requisitos..."
    
    # Verificar Azure CLI
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI não está instalado!"
        echo "Instale com: brew install azure-cli (macOS) ou curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash (Linux)"
        exit 1
    fi
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado!"
        echo "Instale Docker Desktop ou docker.io"
        exit 1
    fi
    
    # Verificar login no Azure
    if ! az account show &> /dev/null; then
        log_error "Não está logado no Azure!"
        echo "Execute: az login"
        exit 1
    fi
    
    log_success "Pré-requisitos OK"
}

# Criar arquivos necessários
create_files() {
    log_info "Criando arquivos de configuração..."
    
    # Criar .dockerignore se não existir
    if [ ! -f ".dockerignore" ]; then
        cat > .dockerignore << 'EOF'
node_modules
npm-debug.log*
.git
.gitignore
.vscode
.DS_Store
.env*
*.md
docker-compose*.yml
*.sh
EOF
        log_success ".dockerignore criado"
    fi
    
    # Verificar se Dockerfile existe
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile não encontrado!"
        echo "Crie o Dockerfile usando o template fornecido"
        exit 1
    fi
    
    # Verificar src/index.js
    if [ ! -f "src/index.js" ]; then
        log_error "src/index.js não encontrado!"
        echo "Código fonte da aplicação não encontrado"
        exit 1
    fi
    
    log_success "Arquivos verificados"
}

# Configurações
configure_variables() {
    log_info "Configurando variáveis..."
    
    # Variáveis padrão
    export RESOURCE_GROUP="${RESOURCE_GROUP:-rg-mesh-platform}"
    export LOCATION="${LOCATION:-East US}"
    export REGISTRY_NAME="${REGISTRY_NAME:-meshplatformregistry}"
    export APP_NAME="${APP_NAME:-mesh-platform-app}"
    export APP_SERVICE_PLAN="${APP_SERVICE_PLAN:-asp-mesh-platform}"
    export IMAGE_NAME="${IMAGE_NAME:-mesh-platform}"
    export VERSION="${VERSION:-2.1.0}"
    
    log_info "Resource Group: $RESOURCE_GROUP"
    log_info "Location: $LOCATION"
    log_info "Registry: $REGISTRY_NAME"
    log_info "App Name: $APP_NAME"
}

# Criar infraestrutura
create_infrastructure() {
    log_info "Criando infraestrutura no Azure..."
    
    # 1. Resource Group
    log_info "Criando Resource Group..."
    az group create \
        --name "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --output table
    log_success "Resource Group criado"
    
    # 2. Container Registry
    log_info "Criando Azure Container Registry..."
    az acr create \
        --resource-group "$RESOURCE_GROUP" \
        --name "$REGISTRY_NAME" \
        --sku Basic \
        --admin-enabled true \
        --output table
    log_success "Container Registry criado"
    
    # 3. App Service Plan
    log_info "Criando App Service Plan..."
    az appservice plan create \
        --name "$APP_SERVICE_PLAN" \
        --resource-group "$RESOURCE_GROUP" \
        --sku B1 \
        --is-linux \
        --output table
    log_success "App Service Plan criado"
}

# Build e Push da imagem
build_and_push() {
    log_info "Fazendo build e push da imagem Docker..."
    
    # Login no ACR
    log_info "Login no Container Registry..."
    az acr login --name "$REGISTRY_NAME"
    
    # Build da imagem
    log_info "Fazendo build da imagem..."
    docker build --platform linux/amd64 -t "$IMAGE_NAME:$VERSION" .
    docker build --platform linux/amd64 -t "$IMAGE_NAME:latest" .
    
    # Tag para ACR
    log_info "Taggeando para ACR..."
    docker tag "$IMAGE_NAME:$VERSION" "$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:$VERSION"
    docker tag "$IMAGE_NAME:latest" "$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:latest"
    
    # Push para ACR
    log_info "Fazendo push para ACR..."
    docker push "$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:$VERSION"
    docker push "$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:latest"
    
    log_success "Imagem enviada para ACR"
}

# Deploy da aplicação
deploy_app() {
    log_info "Fazendo deploy da aplicação..."
    
    # Criar Web App
    log_info "Criando Web App..."
    az webapp create \
        --resource-group "$RESOURCE_GROUP" \
        --plan "$APP_SERVICE_PLAN" \
        --name "$APP_NAME" \
        --deployment-container-image-name "$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:$VERSION" \
        --output table
    
    # Configurar credenciais do ACR
    log_info "Configurando credenciais do Container Registry..."
    ACR_PASSWORD=$(az acr credential show --name "$REGISTRY_NAME" --query passwords[0].value --output tsv)
    
    az webapp config container set \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --docker-custom-image-name "$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:$VERSION" \
        --docker-registry-server-url "https://$REGISTRY_NAME.azurecr.io" \
        --docker-registry-server-user "$REGISTRY_NAME" \
        --docker-registry-server-password "$ACR_PASSWORD"
    
    # Configurar variáveis de ambiente básicas
    log_info "Configurando variáveis de ambiente..."
    az webapp config appsettings set \
        --resource-group "$RESOURCE_GROUP" \
        --name "$APP_NAME" \
        --settings \
            NODE_ENV=production \
            PORT=80 \
            WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
            WEBSITES_WEB_CONTAINER_NAME=mesh-platform \
            MESH_VERSION="$VERSION" \
            MESH_SERVICE="BPO Financial Analyst with Memory" \
            MESH_COMPANY="Wfinance" \
        --output table
    
    # Habilitar logs
    log_info "Habilitando logs..."
    az webapp log config \
        --resource-group "$RESOURCE_GROUP" \
        --name "$APP_NAME" \
        --docker-container-logging filesystem \
        --output table
    
    log_success "Aplicação deployada"
}

# Configurar secrets
configure_secrets() {
    log_warning "CONFIGURAÇÃO DE SECRETS NECESSÁRIA!"
    echo ""
    echo "Para finalizar o setup, você precisa configurar as seguintes variáveis de ambiente:"
    echo ""
    echo "🤖 Bot Framework:"
    echo "   MICROSOFT_APP_ID=seu-app-id"
    echo "   MICROSOFT_APP_PASSWORD=seu-app-password"
    echo ""
    echo "🧠 Azure OpenAI:"
    echo "   AZURE_OPENAI_ENDPOINT=https://seu-recurso.openai.azure.com/"
    echo "   AZURE_OPENAI_API_KEY=sua-chave"
    echo "   AZURE_OPENAI_DEPLOYMENT=gpt-4o"
    echo ""
    echo "📊 Application Insights (opcional):"
    echo "   APPLICATIONINSIGHTS_CONNECTION_STRING=sua-connection-string"
    echo ""
    echo "Execute o comando abaixo após configurar as variáveis:"
    echo ""
    echo "az webapp config appsettings set \\"
    echo "  --resource-group $RESOURCE_GROUP \\"
    echo "  --name $APP_NAME \\"
    echo "  --settings \\"
    echo "    MICROSOFT_APP_ID=\"seu-app-id\" \\"
    echo "    MICROSOFT_APP_PASSWORD=\"seu-app-password\" \\"
    echo "    AZURE_OPENAI_ENDPOINT=\"https://seu-recurso.openai.azure.com/\" \\"
    echo "    AZURE_OPENAI_API_KEY=\"sua-chave\" \\"
    echo "    AZURE_OPENAI_DEPLOYMENT=\"gpt-4o\""
    echo ""
}

# Teste do deploy
test_deployment() {
    log_info "Testando deploy..."
    
    APP_URL="https://$APP_NAME.azurewebsites.net"
    
    log_info "Aguardando aplicação inicializar..."
    sleep 60
    
    # Teste de health check
    log_info "Testando health check..."
    if curl -f -s "$APP_URL/healthz" > /dev/null; then
        log_success "Health check OK"
    else
        log_warning "Health check falhou - pode estar ainda inicializando"
    fi
    
    # Teste de memory stats
    log_info "Testando API de memória..."
    if curl -f -s "$APP_URL/api/memory/stats" > /dev/null; then
        log_success "API de memória OK"
    else
        log_warning "API de memória não respondeu"
    fi
    
    log_info "URLs da aplicação:"
    echo "   🌐 App: $APP_URL"
    echo "   🏥 Health: $APP_URL/healthz"
    echo "   🧠 Memory: $APP_URL/api/memory/stats"
    echo "   🤖 Bot: $APP_URL/api/messages"
}

# Mostrar próximos passos
show_next_steps() {
    echo ""
    log_success "DEPLOY CONCLUÍDO!"
    echo "================"
    echo ""
    echo "🎯 PRÓXIMOS PASSOS:"
    echo ""
    echo "1. 🔐 Configure as credenciais (veja instruções acima)"
    echo "2. 🤖 Configure o Bot Framework:"
    echo "   - Messaging Endpoint: https://$APP_NAME.azurewebsites.net/api/messages"
    echo "   - Habilite o canal Microsoft Teams"
    echo "3. 🧠 Configure Azure OpenAI com modelo GPT-4"
    echo "4. 📊 Configure Application Insights (opcional)"
    echo "5. 🧪 Teste a aplicação"
    echo ""
    echo "📋 COMANDOS ÚTEIS:"
    echo "   # Ver logs"
    echo "   az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_NAME"
    echo ""
    echo "   # Restart app"
    echo "   az webapp restart --resource-group $RESOURCE_GROUP --name $APP_NAME"
    echo ""
    echo "   # Monitorar"
    echo "   curl https://$APP_NAME.azurewebsites.net/healthz"
    echo ""
    echo "🎉 MESH Platform está pronto para uso!"
}

# Função principal
main() {
    echo "Iniciando setup do MESH Platform no Azure..."
    echo ""
    
    check_prerequisites
    create_files
    configure_variables
    
    echo ""
    read -p "Continuar com o deploy? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deploy cancelado pelo usuário"
        exit 0
    fi
    
    create_infrastructure
    build_and_push
    deploy_app
    configure_secrets
    test_deployment
    show_next_steps
}

# Executar função principal
main "$@"