#!/bin/bash

# Name of the Docker image
IMAGE_NAME="synner-server-image"
# Version or tag for the Docker image
IMAGE_TAG="latest"

# Building the Docker image
echo "Building Docker image: $IMAGE_NAME:$IMAGE_TAG..."
docker build --no-cache -t $IMAGE_NAME:$IMAGE_TAG .

echo "Build complete."