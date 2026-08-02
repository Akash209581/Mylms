# Use a base image with GCC
FROM gcc:latest

# Set the working directory
WORKDIR /app

# Copy the C source file into the container
COPY . /app
