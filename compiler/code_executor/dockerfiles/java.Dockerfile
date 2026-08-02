# Use an official OpenJDK runtime as a parent image
FROM eclipse-temurin:11

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app
