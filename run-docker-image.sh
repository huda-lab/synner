#!/bin/bash

IMAGE_NAME="synner-server-image"
IMAGE_TAG="latest"
CONTAINER_PORT=5042
HOST_PORT=5042

# Running the Docker container from the image
echo "Running Docker container from image: $IMAGE_NAME:$IMAGE_TAG..."
docker run -d -p $HOST_PORT:$CONTAINER_PORT $IMAGE_NAME:$IMAGE_TAG

echo "Container is running."
