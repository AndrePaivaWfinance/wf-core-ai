#!/bin/bash
# ================================================
# AZURE DEPLOYMENT SCRIPT
# ================================================

set -e

# Configurações
REGISTRY="meshbrainregistry.azurecr.io"
IMAGE_NAME="mesh-full"
TAG="v1.0"
RESOURCE_GROUP="mesh-platform-rg"
APP_NAME="mesh-full"
LOCATION="brazilsouth"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Deploying to Azure...${NC}"

# Login no Azure
echo -e "${YELLOW}🔐 Logging into Azure...${NC}"
az login

# Login no ACR
echo -e "${YELLOW}📦 Logging into ACR...${NC}"
az acr login --name $REGISTRY

# Build da imagem
echo -e "${YELLOW}🏗️ Building Docker image...${NC}"
docker build -t $REGISTRY/$IMAGE_NAME:$TAG .

# Push da imagem
echo -e "${YELLOW}📤 Pushing image to ACR...${NC}"
docker push $REGISTRY/$IMAGE_NAME:$TAG

# Deploy para Azure Web App
echo -e "${YELLOW}🌐 Deploying to Azure Web App...${NC}"
az webapp config container set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $REGISTRY/$IMAGE_NAME:$TAG \
    --docker-registry-server-url https://$REGISTRY \
    --docker-registry-server-user $REGISTRY \
    --docker-registry-server-password $(az acr credential show --name $REGISTRY --query "passwords[0].value" -o tsv)

# Restart do Web App
echo -e "${YELLOW}🔄 Restarting Web App...${NC}"
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP

# Health check
echo -e "${YELLOW}🏥 Health check...${NC}"
sleep 30
curl -f https://$APP_NAME.azurewebsites.net/healthz || {
    echo -e "${RED}❌ Health check failed!${NC}"
    exit 1
}

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}🌐 App URL: https://$APP_NAME.azurewebsites.net${NC}"