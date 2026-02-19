FROM eclipse-temurin:11-jdk-jammy

WORKDIR /test

RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN echo '#!/bin/bash\nset -e\necho "Testing Java codegen..."\njavac -version\nnode --version\necho "✅ Environment ready!"' > /test/run.sh && chmod +x /test/run.sh

CMD ["/test/run.sh"]