#!/bin/bash

# Script para build, tag e push da imagem Docker
set -e

# Variáveis
REGISTRY="meshbrainregistry.azurecr.io"
IMAGE_NAME="meshfull"
TAG="v1.0.0"
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"

# Build da imagem
echo "🏗️ Building Docker image..."
docker build -t ${IMAGE_NAME}:${TAG} -t ${IMAGE_NAME}:latest .

# Login no Azure Container Registry
echo "🔐 Logging into Azure Container Registry..."
az acr login --name meshbrainregistry

# Tag para o registry
echo "🏷️ Tagging image for registry..."
docker tag ${IMAGE_NAME}:${TAG} ${FULL_IMAGE_NAME}
docker tag ${IMAGE_NAME}:latest ${REGISTRY}/${IMAGE_NAME}:latest

# Push para o registry
echo "🚀 Pushing image to registry..."
docker push ${FULL_IMAGE_NAME}
docker push ${REGISTRY}/${IMAGE_NAME}:latest

echo "✅ Build, tag and push completed successfully!"
echo "📦 Image: ${FULL_IMAGE_NAME}"