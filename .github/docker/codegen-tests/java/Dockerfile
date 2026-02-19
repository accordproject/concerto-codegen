FROM eclipse-temurin:11-jdk-jammy

WORKDIR /test

RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

CMD ["bash", "-c", "echo 'Testing environment...' && javac -version && node --version && echo '✅ Java + Node.js ready!'"]