# Makefile para comandos Docker
.PHONY: build tag push all

REGISTRY = meshbrainregistry.azurecr.io
IMAGE_NAME = meshfull
TAG = v1.0.0

build:
	@echo "Building Docker image..."
	docker build -t $(IMAGE_NAME):$(TAG) -t $(IMAGE_NAME):latest .

tag:
	@echo "Tagging image..."
	docker tag $(IMAGE_NAME):$(TAG) $(REGISTRY)/$(IMAGE_NAME):$(TAG)
	docker tag $(IMAGE_NAME):latest $(REGISTRY)/$(IMAGE_NAME):latest

push: login
	@echo "Pushing images..."
	docker push $(REGISTRY)/$(IMAGE_NAME):$(TAG)
	docker push $(REGISTRY)/$(IMAGE_NAME):latest

login:
	@echo "Logging into ACR..."
	az acr login --name meshbrainregistry

all: build tag push

test:
	docker run -p 3978:3978 --rm --name mesh-test $(IMAGE_NAME):$(TAG)

clean:
	docker rmi $(IMAGE_NAME):$(TAG) $(IMAGE_NAME):latest || true

list:
	docker images | grep $(IMAGE_NAME)